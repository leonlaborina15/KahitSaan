// History (Kinain), saved items/chains, and "Ayoko nito" exclusions. All in IndexedDB on this device.
import { get, set } from "idb-keyval";
import type { ChainId } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  at: string; // ISO
  item_ids: string[];
  label: string;
  branch_id: string;
  branch_name: string;
  chain: ChainId;
  total: number;
  rating: "up" | "down" | null;
  rating_dismissed?: boolean;
}

export interface Saved {
  items: string[]; // combo keys (sorted item ids joined by "+")
  chains: ChainId[];
}

const DAY = 24 * 60 * 60 * 1000;

export const loadHistory = async () => (await get<HistoryEntry[]>("history")) ?? [];

export async function addHistory(e: Omit<HistoryEntry, "id" | "at" | "rating">): Promise<HistoryEntry[]> {
  const list = await loadHistory();
  const entry: HistoryEntry = { ...e, id: crypto.randomUUID(), at: new Date().toISOString(), rating: null };
  const next = [entry, ...list].slice(0, 200);
  await set("history", next);
  return next;
}

export async function updateHistory(id: string, patch: Partial<HistoryEntry>): Promise<HistoryEntry[]> {
  const next = (await loadHistory()).map((h) => (h.id === id ? { ...h, ...patch } : h));
  await set("history", next);
  return next;
}

/** Item ids eaten within the last `days`. */
export function recentlyEaten(history: HistoryEntry[], days: number, now = Date.now()): Set<string> {
  return new Set(history.filter((h) => now - Date.parse(h.at) < days * DAY).flatMap((h) => h.item_ids));
}

export const loadSaved = async () => (await get<Saved>("saved")) ?? { items: [], chains: [] };

export async function toggleSavedItem(key: string): Promise<Saved> {
  const s = await loadSaved();
  const next = { ...s, items: s.items.includes(key) ? s.items.filter((k) => k !== key) : [key, ...s.items] };
  await set("saved", next);
  return next;
}

export async function toggleSavedChain(chain: ChainId): Promise<Saved> {
  const s = await loadSaved();
  const next = { ...s, chains: s.chains.includes(chain) ? s.chains.filter((c) => c !== chain) : [...s.chains, chain] };
  await set("saved", next);
  return next;
}

/** "Ayoko nito": hide an item from Kahit Saan for 7 days. */
export async function addNope(itemId: string): Promise<void> {
  const map = (await get<Record<string, number>>("nope")) ?? {};
  map[itemId] = Date.now() + 7 * DAY;
  await set("nope", map);
}

export async function loadNope(): Promise<Set<string>> {
  const map = (await get<Record<string, number>>("nope")) ?? {};
  return new Set(Object.entries(map).filter(([, until]) => until > Date.now()).map(([id]) => id));
}

