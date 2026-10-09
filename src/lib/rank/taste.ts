// Taste score (SPEC §5.2). Pure.
import type { CatalogItem, Prefs, TasteProfile } from "@/lib/types";
import type { ResolvedFilters } from "@/lib/parse/validate";

/** Taste v0: tag/chain counts + favorite foods + cravings. Embeddings replace the affinity part in Phase 3. */
export function tasteScore(items: CatalogItem[], prefs: Prefs, taste: TasteProfile, f: ResolvedFilters): number {
  const tags = new Set(items.flatMap((i) => [...i.tags, i.protein ?? ""]));
  let affinity = 0;
  for (const t of tags) affinity += (taste.tag_counts[t] ?? 0) + (prefs.favorite_foods.includes(t) ? 2 : 0);
  const craving = f.cravings.some((c) => tags.has(c) || items.some((i) => i.name.toLowerCase().includes(c))) ? 1 : 0;
  const favChain = prefs.favorite_chains.includes(items[0].chain) ? 0.1 : 0;
  const chainHabit = Math.max(-0.1, Math.min((taste.chain_counts[items[0].chain] ?? 0) / 10, 0.1));
  return Math.max(0, Math.min(1, 0.7 * Math.max(-1, Math.min(affinity / 6, 1)) + 0.3 * craving + favChain + chainHabit));
}

/**
 * Add `delta` to the tag/chain counts of a meal: +1 on "Ito na!", -1 on a 👎, +1 to undo a 👎 (SPEC §3.4).
 * Returns a new profile.
 */
export function voteTaste(t: TasteProfile, items: CatalogItem[], delta: 1 | -1): TasteProfile {
  const next = structuredClone(t);
  for (const tag of new Set(items.flatMap((i) => [...i.tags, i.protein ?? ""].filter(Boolean)))) {
    next.tag_counts[tag] = (next.tag_counts[tag] ?? 0) + delta;
  }
  next.chain_counts[items[0].chain] = (next.chain_counts[items[0].chain] ?? 0) + delta;
  return next;
}
