"use client";

import { CaretLeft, List, MagnifyingGlass, MapTrifold, SlidersHorizontal } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { filtersFromRequest, useApp } from "@/components/app-data";
import { AppShell } from "@/components/app-shell";
import { ActiveFilterBar, CLEARED, FiltersSheet, QuickFilters, UnahinRow, UnderstoodChips, activeFilters, applyQuick } from "@/components/filter-chips";
import { CompactCard, HeroCard } from "@/components/food";
import { LocationRow } from "@/components/location";
import { EmptyResults, ErrorState, ResultsSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import { parseRules } from "@/lib/parse/rules";
import { explore, type ExploreFilters, type ItemResult } from "@/lib/rank/explore";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 11; // best pick + up to 10 more

/** On a new query: take what the text says, keep the user's Unahin + narrowing filters. */
function mergeQuery(prev: ExploreFilters | null, next: ExploreFilters, text: string): ExploreFilters {
  if (!prev) return next;
  return {
    ...next,
    unahin: prev.unahin,
    open_only: prev.open_only,
    fast_only: prev.fast_only,
    max_total: prev.max_total,
    chains: next.chains.length ? next.chains : prev.chains,
    food_types: next.food_types.length ? next.food_types : prev.food_types,
    max_distance_km: next.max_distance_km ?? prev.max_distance_km,
    // Keep this session's removed setup dislikes removed; add anything the new text avoids.
    avoid: [...new Set([...prev.avoid, ...parseRules(text).avoid])],
  };
}

function ResultsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const reduce = useReducedMotion();
  const ai = useAiStatus();
  const { ready, prefs, taste, place, openDetail } = useApp();

  const initial = useMemo(() => (prefs ? filtersFromRequest(q, prefs) : null), [q, prefs]);
  const [filters, setFilters] = useState<ExploreFilters | null>(null);
  const [forQuery, setForQuery] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState(false);
  const [draftQ, setDraftQ] = useState(q);
  const [retry, setRetry] = useState(0);
  const [compact, setCompact] = useState(false);

  if (initial && forQuery !== q) {
    setForQuery(q);
    const quick = params.get("quick")?.split(",").filter(Boolean) ?? [];
    setFilters((prev) => applyQuick(mergeQuery(prev, initial.filters, q), prev ? [] : quick));
    setDraftQ(q);
  }

  // Header shrinks on scroll.
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ?detail=<item id> opens the detail sheet (deep links + demo screenshots).
  const detailId = params.get("detail");
  useEffect(() => {
    const item = detailId ? catalog.items.find((i) => i.id === detailId) : undefined;
    if (item && place) openDetail([item]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId, place]);

  const run = (f: ExploreFilters): ItemResult[] | "error" => {
    if (!prefs || !taste || !place) return [];
    try {
      return explore({ catalog, filters: f, prefs, taste, here: place });
    } catch {
      return "error";
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const results = useMemo(() => (filters ? run(filters) : null), [filters, prefs, taste, place, retry]);
  const set = (p: Partial<ExploreFilters>) => setFilters((f) => (f ? { ...f, ...p } : f));

  if (ready && !prefs) {
    router.replace("/");
    return null;
  }

  const unahinIsSetup = !!filters && !!prefs && filters.unahin.join() === prefs.priority.join();
  const activeCount = filters && initial ? activeFilters(filters, initial.fromSetup).length : 0;

  return (
    <AppShell header={false}>
      <div className={cn("sticky top-0 z-20 -mx-5 flex items-center gap-2 bg-background/95 px-5 backdrop-blur-xl transition-[padding] duration-200", compact ? "py-2" : "py-4")}>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Balik sa Home" onClick={() => router.push("/")}>
          <CaretLeft size={22} />
        </Button>
        {editingQuery ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setEditingQuery(false);
              router.replace(`/results?q=${encodeURIComponent(draftQ)}`);
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
              <MagnifyingGlass size={20} />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditingQuery(true)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border bg-card px-4 text-left text-sm"
            aria-label="I-edit ang hanap"
          >
            <MagnifyingGlass size={18} className="shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{q || "Kahit ano (defaults)"}</span>
          </button>
        )}
        {!compact && !editingQuery && <AiStatusPill status={ai} />}
      </div>

      <div className="flex flex-col gap-4">
        <LocationRow />
        {!filters || !initial || !place ? (
          place || !ready ? <ResultsSkeleton /> : null
        ) : (
          <>
            <UnderstoodChips f={filters} set={set} fromSetup={initial.fromSetup} />
            <UnahinRow f={filters} set={set} isSetup={unahinIsSetup} />
            <QuickFilters f={filters} set={set} />

            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-11 gap-2 px-3" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={20} aria-hidden /> Filters
                {activeCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{activeCount}</span>
                )}
              </Button>
              <p className="flex-1 text-sm font-semibold" aria-live="polite">
                {results === "error" || !results ? "" : `${results.length} pasok`}
              </p>
              <div className="flex rounded-[16px] border bg-card p-0.5" role="group" aria-label="View">
                <button type="button" aria-pressed className="flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground" aria-label="List view">
                  <List size={20} />
                </button>
                <button type="button" disabled className="flex size-10 items-center justify-center rounded-[14px] text-muted-foreground opacity-50" aria-label="Map view, soon" title="Soon">
                  <MapTrifold size={20} />
                </button>
              </div>
            </div>
            <ActiveFilterBar f={filters} set={set} fromSetup={initial.fromSetup} />

            {results === "error" ? (
              <ErrorState onRetry={() => setRetry((n) => n + 1)} />
            ) : results && results.length === 0 ? (
              <EmptyResults
                budget={filters.budget}
                onRaise={() => set({ budget: filters.budget + 50 })}
                onWiden={filters.max_distance_km !== null ? () => set({ max_distance_km: null }) : undefined}
                onClear={() => set({ ...CLEARED, open_only: true, avoid: filters.avoid })}
              />
            ) : (
              results && (
                <LayoutGroup>
                  <motion.ul layout={!reduce} className="flex flex-col gap-3">
                    <AnimatePresence initial={false} mode="popLayout">
                      {results.slice(0, MAX_SHOWN).map((r, i) => (
                        <motion.li
                          key={r.key}
                          layout={!reduce}
                          initial={reduce ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 34, delay: Math.min(i, 6) * 0.03 } }}
                          exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                        >
                          {i === 1 && <h2 className="mb-3 text-lg">Iba pang option</h2>}
                          {i === 0 ? <HeroCard r={r} /> : <CompactCard r={r} />}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                  {results.length > MAX_SHOWN && (
                    <p className="text-center text-xs text-muted-foreground">Ipinapakita ang top {MAX_SHOWN} sa {results.length}.</p>
                  )}
                </LayoutGroup>
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
