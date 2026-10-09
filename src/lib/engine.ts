// Engine entry point (docs/architecture.md §3). UI calls these; it never ranks or parses itself.
import { filtersFromParsed, type FiltersFromSetup } from "@/lib/parse/filters";
import { parseRules } from "@/lib/parse/rules";
import { explore, type ExploreFilters, type ExploreInput, type ItemResult } from "@/lib/rank/explore";
import { notesFor, type Note } from "@/lib/rank/notes";
import type { Filters, Prefs } from "@/lib/types";

/** SPEC §4.3: fall back to the rule parser if the LLM takes longer than this. */
export const LLM_TIMEOUT_MS = 4000;

/** Local LLM parser (Phase 3). Returns null when its output is unusable. */
export type LlmParser = (text: string) => Promise<Filters | null>;

export interface Parsed extends FiltersFromSetup {
  parser: "llm" | "rules";
}

export type SearchContext = Omit<ExploreInput, "filters">;

export interface SearchOutput {
  results: ItemResult[];
  notes: Note[];
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      () => (clearTimeout(t), resolve(null)),
    );
  });
}

/** Text → filters. LLM if given and it answers in time, else the rule parser. Never throws. */
export async function parseRequest(
  text: string,
  prefs: Prefs,
  { now = new Date(), llm, timeoutMs = LLM_TIMEOUT_MS }: { now?: Date; llm?: LlmParser; timeoutMs?: number } = {},
): Promise<Parsed> {
  const fromLlm = llm && text.trim() ? await withTimeout(llm(text), timeoutMs) : null;
  return { ...filtersFromParsed(fromLlm ?? parseRules(text), prefs, now), parser: fromLlm ? "llm" : "rules" };
}

/** Filters → ranked meals + notes. Sync; re-run on every chip edit. */
export function runSearch(filters: ExploreFilters, ctx: SearchContext): SearchOutput {
  const input: ExploreInput = { ...ctx, filters };
  const results = explore(input);
  return { results, notes: notesFor(input, results) };
}

/** Parse + search in one call. */
export async function search(
  text: string,
  ctx: SearchContext & { llm?: LlmParser; timeoutMs?: number },
): Promise<Parsed & SearchOutput> {
  const parsed = await parseRequest(text, ctx.prefs, { now: ctx.now, llm: ctx.llm, timeoutMs: ctx.timeoutMs });
  return { ...parsed, ...runSearch(parsed.filters, ctx) };
}
