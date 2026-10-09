// Ranking (SPEC §5): hard filters → sub-scores → weighted score → best + 2 alternatives. Pure.
import type { Catalog, CatalogItem, Combo, Prefs, Result, SubScores, TasteProfile } from "@/lib/types";
import type { ResolvedFilters } from "@/lib/parse/validate";
import { buildCombos } from "./combos";
import { distanceKm, isOpen, travelMinutes, type LatLng } from "./distance";
import { templateReason } from "./reason";

const RANK_WEIGHTS = [0.3, 0.22, 0.15, 0.1];
const TASTE_WEIGHT = 0.23;
const DISTANCE_CAP_KM = 5;
const TARGET_FILL = { low: 2, normal: 3, high: 5 };

export function weights(prefs: Prefs, f: ResolvedFilters): SubScores {
  const w = { cheap: 0, fast: 0, near: 0, filling: 0, taste: TASTE_WEIGHT } as SubScores;
  prefs.priority.forEach((p, i) => (w[p] = RANK_WEIGHTS[i] ?? 0.1));
  if (f.urgency === "high") w.fast *= 2;
  if (f.urgency === "low") w.fast *= 0.5;
  if (f.max_distance_km !== null && f.max_distance_km <= 1) w.near *= 1.5;
  if (f.hunger === "high") w.filling *= 2;
  if (f.cravings.length) w.taste *= 1.5;
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w) as (keyof SubScores)[]) w[k] /= sum;
  return w;
}

/** Taste v0: tag/chain counts + favorite foods + cravings. Embeddings replace the affinity part in Phase 3. */
export function tasteScore(items: CatalogItem[], prefs: Prefs, taste: TasteProfile, f: ResolvedFilters): number {
  const tags = new Set(items.flatMap((i) => [...i.tags, i.protein ?? ""]));
  let affinity = 0;
  for (const t of tags) affinity += (taste.tag_counts[t] ?? 0) + (prefs.favorite_foods.includes(t) ? 2 : 0);
  const craving = f.cravings.some((c) => tags.has(c) || items.some((i) => i.name.toLowerCase().includes(c))) ? 1 : 0;
  const favChain = prefs.favorite_chains.includes(items[0].chain) ? 0.1 : 0;
  const chainHabit = Math.min((taste.chain_counts[items[0].chain] ?? 0) / 10, 0.1);
  return Math.min(1, 0.7 * Math.min(affinity / 6, 1) + 0.3 * craving + favChain + chainHabit);
}

function subScores(c: Combo, prefs: Prefs, taste: TasteProfile, f: ResolvedFilters): SubScores {
  const fill = c.items.reduce((s, i) => s + i.fill_score, 0);
  return {
    cheap: 1 - c.total / f.budget,
    fast: 1 - Math.min(c.eta_min, 30) / 30,
    near: 1 - Math.min(c.distance_km, DISTANCE_CAP_KM) / DISTANCE_CAP_KM,
    filling: Math.min(fill / (TARGET_FILL[f.hunger] * f.people), 1),
    taste: tasteScore(c.items, prefs, taste, f),
  };
}

export interface RankInput {
  catalog: Catalog;
  filters: ResolvedFilters;
  prefs: Prefs;
  taste: TasteProfile;
  here: LatLng;
  now?: Date;
}

export interface RankOutput {
  results: Result[];
  /** True when nothing was within max_distance_km, so the limit was dropped. */
  relaxedDistance: boolean;
}

function rankOnce({ catalog, filters: f, prefs, taste, here, now = new Date() }: RankInput, maxKm: number): Result[] {
  const w = weights(prefs, f);
  const best = new Map<string, Result>(); // one result per branch
  for (const branch of catalog.branches) {
    if (!isOpen(branch, now)) continue;
    if (f.chains.length && !f.chains.includes(branch.chain)) continue;
    const distance_km = distanceKm(here, branch);
    if (distance_km > maxKm) continue;
    const menu = catalog.items.filter((i) => i.chain === branch.chain);
    for (const items of buildCombos(menu, f)) {
      const total = items.reduce((s, i) => s + i.price, 0);
      const eta_min = Math.round(travelMinutes(distance_km) + branch.base_wait_minutes + Math.max(...items.map((i) => i.prep_minutes)));
      const combo: Combo = { branch, items, total, distance_km, eta_min };
      const sub = subScores(combo, prefs, taste, f);
      const score = (Object.keys(w) as (keyof SubScores)[]).reduce((s, k) => s + w[k] * sub[k], 0);
      if (score > (best.get(branch.id)?.score ?? -1)) best.set(branch.id, { ...combo, score, sub, reason: "" });
    }
  }
  const ranked = [...best.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  return ranked.map((r) => ({ ...r, reason: templateReason(r, w, f) }));
}

export function rank(input: RankInput): RankOutput {
  const maxKm = Math.min(input.filters.max_distance_km ?? DISTANCE_CAP_KM, DISTANCE_CAP_KM);
  const results = rankOnce(input, maxKm);
  if (results.length || maxKm >= DISTANCE_CAP_KM) return { results, relaxedDistance: false };
  return { results: rankOnce(input, DISTANCE_CAP_KM), relaxedDistance: true };
}
