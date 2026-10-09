// Request + setup → the filters the ranker uses. Pure.
import type { ExploreFilters } from "@/lib/rank/explore";
import type { Filters, Prefs } from "@/lib/types";
import { parseRules } from "./rules";
import { resolveFilters } from "./validate";

export interface FiltersFromSetup {
  filters: ExploreFilters;
  /** Chips whose value came from setup, not from the request text. */
  fromSetup: Set<string>;
}

/**
 * Setup answers are defaults; the parsed request overrides what it mentions (resolveFilters).
 * `parsed` comes from the rule parser or the LLM; both use the same contract (SPEC §4.1).
 */
export function filtersFromParsed(parsed: Filters, prefs: Prefs, now = new Date()): FiltersFromSetup {
  const filters: ExploreFilters = {
    ...resolveFilters(parsed, prefs, now),
    open_only: true,
    food_types: parsed.cravings,
    unahin: [...prefs.priority],
    max_total: null,
    fast_only: false,
  };
  const fromSetup = new Set<string>();
  if (parsed.budget === null) fromSetup.add("budget");
  if (parsed.hunger === "normal") fromSetup.add("hunger");
  if (filters.avoid.some((a) => !parsed.avoid.includes(a))) fromSetup.add("avoid");
  fromSetup.add("unahin");
  return { filters, fromSetup };
}

/** Rule-parser shortcut (Basic mode, quick suggestions). */
export const filtersFromRequest = (text: string, prefs: Prefs, now = new Date()) => filtersFromParsed(parseRules(text), prefs, now);
