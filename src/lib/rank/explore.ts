// Item-first results for the Results screen and Kahit Saan (SPEC §5–6 + wait/peak/open rules).
// Builds combos per branch, scores them, then groups identical meals so each appears once
// at its best branch with a count of other branches. Pure.
import type { Branch, Catalog, CatalogItem, MealPeriod, Prefs, SubScores, TasteProfile } from "@/lib/types";
import type { ResolvedFilters } from "@/lib/parse/validate";
import { buildCombos } from "./combos";
import { distanceKm, isOpen, travelMinutes, type LatLng } from "./distance";
import { templateReason } from "./reason";
import { tasteScore, weights } from "./score";

export type SortKey = "best" | "cheap" | "near" | "fast" | "filling";
export type Speed = "fast" | "ok" | "slow";

export interface ExploreFilters extends ResolvedFilters {
  open_only: boolean;
  /** Hard filter: combo must contain one of these (matched on tags, food_type, name). Empty = any. */
  food_types: string[];
}

export interface OpenStatus {
  open: boolean;
  label: string;
  closingSoon: boolean;
}

export interface BranchOption {
  branch: Branch;
  distance_km: number;
  walk_min: number;
  wait_min: number;
  speed: Speed;
  peak: boolean;
  status: OpenStatus;
}

export interface ItemResult extends BranchOption {
  key: string; // sorted item ids
  items: CatalogItem[];
  total: number;
  eta_min: number;
  fill: number; // busog meter 1–5 (per person)
  sub: SubScores;
  score: number;
  why: string[];
  reason: string;
  other_branches: number;
}

const DISTANCE_CAP_KM = 5;
const TARGET_FILL = { low: 2, normal: 3, high: 5 };
const PEAK_BUMP_MIN = 5;

export function mealPeriod(now: Date): MealPeriod {
  const h = now.getHours();
  if (h >= 5 && h < 10) return "breakfast";
  if (h >= 10 && h < 14) return "lunch";
  if (h >= 14 && h < 17) return "merienda";
  if (h >= 17 && h < 21) return "dinner";
  return "late";
}

/** Peak: 11:30–13:30 and 18:00–20:00. */
export function isPeak(now: Date): boolean {
  const t = now.getHours() * 60 + now.getMinutes();
  return (t >= 690 && t < 810) || (t >= 1080 && t < 1200);
}

export const speedOf = (waitMin: number): Speed => (waitMin < 8 ? "fast" : waitMin <= 15 ? "ok" : "slow");

const fmtTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const hr = h % 12 || 12;
  return `${hr}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};

export function openStatus(b: Branch, now: Date): OpenStatus {
  if (b.is_24h) return { open: true, label: "Bukas 24 oras", closingSoon: false };
  if (!isOpen(b, now)) return { open: false, label: `Sarado, bukas ng ${fmtTime(b.hours.open)}`, closingSoon: false };
  const [ch, cm] = b.hours.close.split(":").map(Number);
  const t = now.getHours() * 60 + now.getMinutes();
  let left = ch * 60 + cm - t;
  if (left < 0) left += 24 * 60;
  if (left <= 30) return { open: true, label: `Magsasara na in ${left} min`, closingSoon: true };
  return { open: true, label: `Bukas hanggang ${fmtTime(b.hours.close)}`, closingSoon: false };
}

export function branchOption(catalog: Catalog, branch: Branch, here: LatLng, now: Date): BranchOption {
  const distance_km = distanceKm(here, branch);
  const peak = isPeak(now);
  const avg = catalog.chains.find((c) => c.id === branch.chain)?.avg_wait[mealPeriod(now)] ?? branch.base_wait_minutes;
  const wait_min = avg + (peak ? PEAK_BUMP_MIN : 0);
  return {
    branch,
    distance_km,
    walk_min: Math.max(1, Math.round(travelMinutes(distance_km))),
    wait_min,
    speed: speedOf(wait_min),
    peak,
    status: openStatus(branch, now),
  };
}

/** Branches of a chain, nearest first (Food detail sheet). */
export function branchesFor(catalog: Catalog, chain: string, here: LatLng, now = new Date()): BranchOption[] {
  return catalog.branches
    .filter((b) => b.chain === chain)
    .map((b) => branchOption(catalog, b, here, now))
    .sort((a, b) => a.distance_km - b.distance_km);
}

const matchesType = (items: CatalogItem[], types: string[]) =>
  !types.length ||
  items.some((i) => types.some((t) => i.food_type === t || i.tags.includes(t) || i.name.toLowerCase().includes(t)));

export const comboKey = (items: CatalogItem[]) => items.map((i) => i.id).sort().join("+");

export interface ExploreInput {
  catalog: Catalog;
  filters: ExploreFilters;
  prefs: Prefs;
  taste: TasteProfile;
  here: LatLng;
  now?: Date;
  sort?: SortKey;
  /** Item ids to leave out (Kahit Saan rerolls, "Ayoko nito", recently eaten). */
  excludeItems?: Set<string>;
}

export function explore({ catalog, filters: f, prefs, taste, here, now = new Date(), sort = "best", excludeItems }: ExploreInput): ItemResult[] {
  const w = weights(prefs, f);
  const maxKm = Math.min(f.max_distance_km ?? DISTANCE_CAP_KM, DISTANCE_CAP_KM);
  const byKey = new Map<string, { best: ItemResult; branches: Set<string> }>();

  for (const branch of catalog.branches) {
    if (f.chains.length && !f.chains.includes(branch.chain)) continue;
    const opt = branchOption(catalog, branch, here, now);
    if (f.open_only && !opt.status.open) continue;
    if (opt.distance_km > maxKm) continue;
    const menu = catalog.items.filter((i) => i.chain === branch.chain && !excludeItems?.has(i.id));
    for (const items of buildCombos(menu, f)) {
      if (!matchesType(items, f.food_types)) continue;
      const total = items.reduce((s, i) => s + i.price, 0);
      const eta_min = opt.walk_min + opt.wait_min;
      const fillSum = items.reduce((s, i) => s + i.fill_score, 0);
      const sub: SubScores = {
        cheap: 1 - total / f.budget,
        fast: 1 - Math.min(eta_min, 30) / 30,
        near: 1 - Math.min(opt.distance_km, DISTANCE_CAP_KM) / DISTANCE_CAP_KM,
        filling: Math.min(fillSum / (TARGET_FILL[f.hunger] * f.people), 1),
        taste: tasteScore(items, prefs, taste, f),
      };
      const score = (Object.keys(w) as (keyof SubScores)[]).reduce((s, k) => s + w[k] * sub[k], 0);
      const key = comboKey(items);
      const r: ItemResult = {
        ...opt,
        key,
        items,
        total,
        eta_min,
        fill: Math.max(1, Math.min(5, Math.round(fillSum / f.people))),
        sub,
        score,
        why: [],
        reason: templateReason({ total, eta_min, distance_km: opt.distance_km, sub }, w, f),
        other_branches: 0,
      };
      const g = byKey.get(key);
      if (!g) byKey.set(key, { best: r, branches: new Set([branch.id]) });
      else {
        g.branches.add(branch.id);
        if (r.score > g.best.score) g.best = r;
      }
    }
  }

  const list = [...byKey.values()].map(({ best, branches }) => ({ ...best, other_branches: branches.size - 1 }));
  const by: Record<SortKey, (a: ItemResult, b: ItemResult) => number> = {
    best: (a, b) => b.score - a.score,
    cheap: (a, b) => a.total - b.total || b.score - a.score,
    near: (a, b) => a.distance_km - b.distance_km || b.score - a.score,
    fast: (a, b) => a.eta_min - b.eta_min || b.score - a.score,
    filling: (a, b) => b.fill - a.fill || b.score - a.score,
  };
  list.sort(by[sort]);
  return addWhy(list, f.budget);
}

/** Up to 3 why-tags per result, relative to the whole list. */
function addWhy(list: ItemResult[], budget: number): ItemResult[] {
  if (!list.length) return list;
  const maxFill = Math.max(...list.map((r) => r.fill));
  const minKm = Math.min(...list.map((r) => r.distance_km));
  return list.map((r) => {
    const why: string[] = [];
    if (r.total <= budget * 0.8) why.push("Pasok sa budget");
    if (r.fill === maxFill) why.push("Pinakabusog");
    if (r.distance_km === minKm) why.push("Pinakamalapit");
    if (r.speed === "fast") why.push("Mabilis");
    if (r.sub.taste >= 0.5) why.push("Swak sa panlasa");
    return { ...r, why: why.slice(0, 3) };
  });
}

/** Kahit Saan: weighted random pick from the top 5 by score. `rand` is injectable for tests. */
export function pickWeighted(list: ItemResult[], rand = Math.random): ItemResult | null {
  const top = [...list].sort((a, b) => b.score - a.score).slice(0, 5);
  if (!top.length) return null;
  const total = top.reduce((s, r) => s + Math.max(r.score, 0.01), 0);
  let x = rand() * total;
  for (const r of top) {
    x -= Math.max(r.score, 0.01);
    if (x <= 0) return r;
  }
  return top[top.length - 1];
}
