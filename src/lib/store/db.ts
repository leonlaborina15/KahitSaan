// All user data lives in IndexedDB on this device (AGENTS.md rule 2–3).
import { del, get, set } from "idb-keyval";
import type { CatalogItem, Prefs, TasteProfile } from "@/lib/types";
import type { LatLng } from "@/lib/rank/distance";

export interface SavedPlace extends LatLng {
  label: string;
  source: "gps" | "landmark";
}

export const EMPTY_TASTE: TasteProfile = { vector: null, pick_count: 0, tag_counts: {}, chain_counts: {}, recent_picks: [] };

export const DEFAULT_PREFS: Prefs = {
  usual_budget: 150,
  favorite_foods: [],
  dislikes: [],
  avoid_pork: false,
  appetite: "normal",
  priority: ["cheap", "filling", "fast", "near"],
  favorite_chains: [],
  created_at: "",
};

export const loadPrefs = () => get<Prefs>("prefs");
export const savePrefs = (p: Prefs) => set("prefs", p);
export const clearPrefs = () => del("prefs");

export const loadTaste = async () => (await get<TasteProfile>("taste")) ?? EMPTY_TASTE;
export const resetTaste = () => del("taste");

export const loadPlace = () => get<SavedPlace>("place");
export const savePlace = (p: SavedPlace) => set("place", p);

/** Taste memory v0 (SPEC §3.4 counts). Embedding vector update is added in Phase 3. */
export async function recordPick(items: CatalogItem[]): Promise<TasteProfile> {
  const t = structuredClone(await loadTaste());
  t.pick_count += 1;
  for (const tag of new Set(items.flatMap((i) => [...i.tags, i.protein ?? ""].filter(Boolean)))) {
    t.tag_counts[tag] = (t.tag_counts[tag] ?? 0) + 1;
  }
  t.chain_counts[items[0].chain] = (t.chain_counts[items[0].chain] ?? 0) + 1;
  t.recent_picks = [...new Set([...items.map((i) => i.id), ...t.recent_picks])].slice(0, 10);
  await set("taste", t);
  return t;
}
