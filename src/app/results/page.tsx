"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, List, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { filtersFromRequest, useApp } from "@/components/app-data";
import { AppShell } from "@/components/app-shell";
import { FilterChips, FiltersSheet, activeFilterCount } from "@/components/filter-chips";
import { ResultCard } from "@/components/food";
import { LocationRow } from "@/components/location";
import { EmptyResults, ErrorState, ResultsSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import { explore, type ExploreFilters, type ItemResult, type SortKey } from "@/lib/rank/explore";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "cheap", label: "Pinakamura" },
  { id: "near", label: "Pinakamalapit" },
  { id: "fast", label: "Pinakamabilis" },
  { id: "filling", label: "Pinakabusog" },
];
const MAX_SHOWN = 11; // best pick + up to 10 more

function ResultsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const reduce = useReducedMotion();
  const { ready, prefs, taste, place } = useApp();

  const initial = useMemo(() => (prefs ? filtersFromRequest(q, prefs) : null), [q, prefs]);
  const [filters, setFilters] = useState<ExploreFilters | null>(null);
  const [forQuery, setForQuery] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("best");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState(false);
  const [draftQ, setDraftQ] = useState(q);
  const [retry, setRetry] = useState(0);

  // New query → start from its parsed filters again.
  if (initial && forQuery !== q) {
    setForQuery(q);
    setFilters(initial.filters);
    setDraftQ(q);
  }

  const run = (f: ExploreFilters, s: SortKey = sort): ItemResult[] | "error" => {
    if (!prefs || !taste || !place) return [];
    try {
      return explore({ catalog, filters: f, prefs, taste, here: place, sort: s });
    } catch {
      return "error";
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => (filters ? run(filters) : null), [filters, sort, prefs, taste, place, retry]);

  const resubmit = (text: string) => {
    setEditingQuery(false);
    router.replace(`/results?q=${encodeURIComponent(text)}`);
  };

  if (ready && !prefs) {
    router.replace("/");
    return null;
  }

  return (
    <AppShell header={false}>
      <div className="sticky top-0 z-20 -mx-5 flex items-center gap-2 bg-background/95 px-5 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Balik sa Home" onClick={() => router.push("/")}>
          <ChevronLeft className="size-5" />
        </Button>
        {editingQuery ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              resubmit(draftQ);
            }}
          >
            <label htmlFor="q" className="sr-only">Hanap</label>
            <input
              id="q"
              autoFocus
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              className="min-h-11 flex-1 rounded-full border bg-card px-4 text-sm"
              placeholder="Hal. ₱150 lang, gutom na gutom"
            />
            <Button type="submit" size="icon" className="size-11 rounded-full" aria-label="Hanapin ulit">
              <Search className="size-5" />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingQuery(true)}
            className="flex min-h-11 flex-1 items-center gap-2 truncate rounded-full border bg-card px-4 text-left text-sm"
            aria-label="I-edit ang hanap"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{q || "Kahit ano (setup defaults)"}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <LocationRow />
        {!filters || !initial || !place ? (
          place || !ready ? <ResultsSkeleton /> : null
        ) : (
          <>
            <FilterChips f={filters} onChange={setFilters} fromSetup={initial.fromSetup} />

            <div className="flex items-center gap-2">
              <Button variant="outline" className="relative h-11 px-3" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal className="size-5" aria-hidden /> Filters
                {activeFilterCount(filters) > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {activeFilterCount(filters)}
                  </span>
                )}
              </Button>
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-11 min-w-0 flex-1 rounded-[14px] border bg-card px-3 text-sm font-semibold"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="flex rounded-[14px] border bg-card p-0.5" role="group" aria-label="View">
                <button type="button" aria-pressed className="flex size-10 items-center justify-center rounded-[12px] bg-primary text-primary-foreground" aria-label="List view">
                  <List className="size-5" />
                </button>
                <button type="button" disabled className="flex size-10 items-center justify-center rounded-[12px] text-muted-foreground opacity-50" aria-label="Map view, soon" title="Soon">
                  <MapIcon className="size-5" />
                </button>
              </div>
            </div>

            {results === "error" ? (
              <ErrorState onRetry={() => setRetry((n) => n + 1)} />
            ) : results && results.length === 0 ? (
              <EmptyResults
                budget={filters.budget}
                onRaise={() => setFilters({ ...filters, budget: filters.budget + 50 })}
                onWiden={filters.max_distance_km !== null ? () => setFilters({ ...filters, max_distance_km: null }) : undefined}
                onClear={() => setFilters({ ...filters, food_types: [], chains: [], max_distance_km: null, open_only: true })}
              />
            ) : (
              results && (
                <>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {results.length} {results.length === 1 ? "option" : "options"}
                    {results.length > MAX_SHOWN && ` · top ${MAX_SHOWN} ang nakalista`}
                  </p>
                  <motion.ul layout={!reduce} className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {results.slice(0, MAX_SHOWN).map((r, i) => (
                        <motion.li
                          key={r.key}
                          layout={!reduce}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {i === 1 && <h2 className="mb-3 text-base">Iba pang option</h2>}
                          <ResultCard r={r} hero={i === 0} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                </>
              )
            )}

            <FiltersSheet
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              value={filters}
              defaults={initial.filters}
              countFor={(f) => {
                const r = run(f);
                return r === "error" ? 0 : r.length;
              }}
              onApply={setFilters}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<AppShell header={false}><ResultsSkeleton /></AppShell>}>
      <ResultsInner />
    </Suspense>
  );
}
