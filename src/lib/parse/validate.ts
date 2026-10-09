// Turns any parser/LLM output into valid Filters, then fills defaults from prefs (SPEC §4.1, §4.3).
import type { ChainId, Filters, Level, Prefs } from "@/lib/types";

const LEVELS: Level[] = ["low", "normal", "high"];
const CHAIN_IDS: ChainId[] = ["jollibee", "mcdonalds", "mang-inasal", "chowking"];

const words = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.toLowerCase().trim()).filter(Boolean) : [];

/** Drop invalid fields, keep valid ones. Never throws. */
export function validateFilters(raw: unknown): Filters {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return {
    budget: num(r.budget) !== null ? Math.round(num(r.budget)!) : null,
    people: num(r.people) !== null ? Math.min(20, Math.max(1, Math.round(num(r.people)!))) : 1,
    hunger: LEVELS.includes(r.hunger as Level) ? (r.hunger as Level) : "normal",
    urgency: LEVELS.includes(r.urgency as Level) ? (r.urgency as Level) : "normal",
    max_distance_km: num(r.max_distance_km),
    cravings: words(r.cravings),
    avoid: words(r.avoid),
    chains: words(r.chains).filter((c): c is ChainId => CHAIN_IDS.includes(c as ChainId)),
    time_context: r.time_context === "late_night" || r.time_context === "breakfast" ? r.time_context : null,
  };
}

/** Parse LLM text: JSON, else first {...} block, else null. */
export function parseJsonLoose(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

export interface ResolvedFilters extends Filters {
  budget: number;
}

const APPETITE_TO_HUNGER: Record<Prefs["appetite"], Level> = { light: "low", normal: "normal", big: "high" };

/** Fill "not stated" fields from prefs and the clock. */
export function resolveFilters(f: Filters, prefs: Prefs, now = new Date()): ResolvedFilters {
  const avoid = new Set([...f.avoid, ...prefs.dislikes]);
  if (prefs.avoid_pork) avoid.add("pork");
  const hour = now.getHours();
  return {
    ...f,
    budget: f.budget ?? prefs.usual_budget * f.people,
    // "normal" means not stated; fall back to the usual appetite.
    hunger: f.hunger === "normal" ? APPETITE_TO_HUNGER[prefs.appetite] : f.hunger,
    avoid: [...avoid],
    time_context: f.time_context ?? (hour < 5 || hour >= 22 ? "late_night" : hour < 10 ? "breakfast" : null),
  };
}
