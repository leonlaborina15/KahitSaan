"use client";

import { CaretLeft, List, MagnifyingGlass, MapTrifold, Shuffle, SlidersHorizontal, Wallet } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { useApp } from "@/components/app-data";
import { AppShell, buzz } from "@/components/app-shell";
import { ActiveFilterBar, CLEARED, ChainFilters, FiltersSheet, QuickFilters, UnahinRow, UnderstoodChips, activeFilters, applyQuick } from "@/components/filter-chips";
import { CompactCard, HeroCard } from "@/components/food";
import { LocationRow } from "@/components/location";
import { EmptyResults, ErrorState, ResultsSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { catalog } from "@/lib/catalog";
import { llmParse, llmReasons } from "@/lib/ai/llm";
import { parseRequest, runSearch, type SearchOutput } from "@/lib/engine";
import { filtersFromRequest } from "@/lib/parse/filters";
import { parseRules } from "@/lib/parse/rules";
import { pickWeighted, type ExploreFilters, type ItemResult } from "@/lib/rank/explore";
import { addNope, loadNope, removeNope } from "@/lib/store/history";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 11; // best pick + up to 10 more
const SHUFFLE_MS = 780;
const SETTLE_MS = 650;
const MATCH_WORDS = { cheap: "mura", fast: "mabilis", near: "malapit", filling: "busog", taste: "swak sa panlasa" };

/** Score-weighted shuffle of the current results (Kahit Saan's pickWeighted on a shrinking pool). */
function weightedOrder(results: ItemResult[]): string[] {
  const pool = [...results];
  const keys: string[] = [];
  while (pool.length) {
    const pick = pickWeighted(pool);
    if (!pick) break;
    keys.push(pick.key);
    pool.splice(pool.indexOf(pick), 1);
  }
  return keys;
}

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
  const [settling, setSettling] = useState(false);
  const [noped, setNoped] = useState<Set<string>>(new Set());
  // Items still under "Ayoko nito" (7-day taste memory); hydrated from IndexedDB once.
  const persistedNope = useRef<Set<string>>(new Set());
  const [order, setOrder] = useState<string[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [flip, setFlip] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  if (initial && forQuery !== q) {
    setForQuery(q);
    const quick = params.get("quick")?.split(",").filter(Boolean) ?? [];
    setFilters((prev) => applyQuick(mergeQuery(prev, initial.filters, q), prev ? [] : quick));
    setDraftQ(q);
    setNoped(new Set(persistedNope.current));
    setOrder(null);
    if (!reduce) setSettling(true);
  }

  // Local LLM (when ready): re-parse the request and upgrade the filters; rule parse stays if it fails/times out.
  useEffect(() => {
    if (!prefs || ai.state !== "ready" || !q.trim()) return;
    let live = true;
    void parseRequest(q, prefs, { llm: llmParse }).then((p) => {
      if (!live || p.parser !== "llm") return;
      setFilters((prev) => {
        const m = mergeQuery(prev, p.filters, q);
        const next = { ...m, avoid: [...new Set([...m.avoid, ...p.filters.avoid])] };
        // Never let the AI turn a working search into an empty one.
        const count = (f: ExploreFilters | null) => {
          const r = f && run(f);
          return r && r !== "error" ? r.results.length : 0;
        };
        return count(next) === 0 && count(prev) > 0 ? prev : next;
      });
    });
    return () => {
      live = false;
    };
  }, [q, prefs, ai.state]);

  // Short "computing" beat so the skeleton → staggered reveal reads on a new search.
  useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [settling]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Hydrate remembered "Ayoko nito" items so they stay excluded across reloads/queries.
  useEffect(() => {
    void loadNope().then((s) => {
      persistedNope.current = new Set([...s, ...persistedNope.current]);
      setNoped((cur) => new Set([...persistedNope.current, ...cur]));
    });
  }, []);

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

  const run = (f: ExploreFilters): SearchOutput | "error" => {
    if (!prefs || !taste || !place) return { results: [], notes: [] };
    try {
      return runSearch(f, { catalog, prefs, taste, here: place, excludeItems: noped });
    } catch {
      return "error";
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const out = useMemo(() => (filters ? run(filters) : null), [filters, prefs, taste, place, retry, noped]);
  const results = out === "error" ? "error" : (out?.results ?? null);
  const note = out && out !== "error" ? out.notes[0] : undefined;
  const set = (p: Partial<ExploreFilters>) => {
    setOrder(null);
    setFilters((f) => (f ? { ...f, ...p } : f));
  };

  // Shuffle's score-weighted order; falls back to score order when null.
  const shown = useMemo(() => {
    if (!results || results === "error" || !order) return results;
    const byKey = new Map(results.map((r) => [r.key, r]));
    return order.map((k) => byKey.get(k)).filter((r): r is ItemResult => !!r);
  }, [results, order]);

  // LLM reason lines for the top 3 (one batched call); template reason stays until/unless it answers.
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const top = shown && shown !== "error" ? shown.slice(0, 3) : [];
  const topKey = top.map((r) => `${q}|${r.key}@${r.branch.id}`).join("|");
  useEffect(() => {
    if (ai.state !== "ready" || !top.length) return;
    let live = true;
    const facts = top.map((r) => ({
      names: r.items.map((i) => i.name).join(" + "),
      total: r.total,
      distance_km: r.distance_km,
      eta_min: r.eta_min,
      matches: (Object.keys(r.sub) as (keyof typeof r.sub)[])
        .sort((a, b) => r.sub[b] - r.sub[a])
        .slice(0, 2)
        .map((k) => MATCH_WORDS[k])
        .join(", "),
    }));
    void llmReasons(q, facts).then((rs) => {
      if (!live || !rs) return;
      setAiReasons((m) => {
        const n = { ...m };
        top.forEach((r, i) => rs[i] && (n[`${q}|${r.key}@${r.branch.id}`] = rs[i]!));
        return n;
      });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topKey, ai.state]);
  const withReason = (r: ItemResult) => {
    const s = aiReasons[`${q}|${r.key}@${r.branch.id}`];
    return s ? { ...r, reason: s } : r;
  };

  /** 👎 on a suggestion: slide it away, remember the item for 7 days (taste memory). */
  const nope = (r: ItemResult) => {
    const main = r.items.find((i) => ["meal", "main", "bundle"].includes(i.category)) ?? r.items[0];
    buzz();
    persistedNope.current.add(main.id);
    setNoped((s) => new Set(s).add(main.id));
    void addNope(main.id);
    toast(`Tatandaan ko — iiwasan ko muna ang ${main.name}.`, {
      action: {
        label: "Undo",
        onClick: () => {
          persistedNope.current.delete(main.id);
          setNoped((s) => {
            const n = new Set(s);
            n.delete(main.id);
            return n;
          });
          void removeNope(main.id);
        },
      },
    });
  };

  /** Slot-machine re-roll: cycle names, then spring the cards into a shuffled order. */
  const shuffle = () => {
    if (!results || results === "error" || results.length < 2) return;
    buzz();
    if (reduce) return setOrder(weightedOrder(results));
    setRolling(true);
    const names = catalog.items.filter((i) => i.category !== "drink").map((i) => i.name);
    const steps = 9;
    for (let s = 0; s < steps; s++) {
      timers.current.push(setTimeout(() => setFlip(names[Math.floor(Math.random() * names.length)]), (SHUFFLE_MS / steps) * s));
    }
    timers.current.push(
      setTimeout(() => {
        setOrder(weightedOrder(results));
        setRolling(false);
      }, SHUFFLE_MS),
    );
  };

  if (ready && !prefs) {
    router.replace("/");
    return null;
  }

  const unahinIsSetup = !!filters && !!prefs && filters.unahin.join() === prefs.priority.join();
  const activeCount = filters && initial ? activeFilters(filters, initial.fromSetup).length : 0;

  return (
    <AppShell header={false}>
      <div className={cn("sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-background/95 px-4 backdrop-blur-xl transition-[padding] duration-200", compact ? "py-2" : "py-4")}>
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
              className="min-h-11 flex-1 rounded-[10px] border bg-card px-4 text-sm"
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
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] border bg-card px-4 text-left text-sm"
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
        {!filters || !initial || !place || settling ? (
          place || !ready || settling ? <ResultsSkeleton /> : null
        ) : (
          <>
            <UnderstoodChips f={filters} set={set} fromSetup={initial.fromSetup} />

            {/* Budget slider with live ₱ readout — drags re-rank instantly. */}
            <div className="flex items-center gap-4 rounded-[20px] bg-card px-4 py-2 shadow-[var(--shadow-xs)]">
              <Wallet size={18} weight="duotone" className="shrink-0 text-brand" aria-hidden />
              <Slider
                min={50}
                max={500}
                step={10}
                value={[Math.min(500, Math.max(50, filters.budget))]}
                onValueChange={(v) => set({ budget: Math.round(Array.isArray(v) ? v[0] : v) })}
                aria-label="Budget"
                className="flex-1"
              />
              <span className="w-16 text-right text-title tabular-nums" aria-live="polite">₱{filters.budget}</span>
            </div>

            <UnahinRow f={filters} set={set} isSetup={unahinIsSetup} />
            <QuickFilters f={filters} set={set} />
            <ChainFilters f={filters} set={set} />

            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-11 gap-2 px-3" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={20} aria-hidden /> Filters
                {activeCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{activeCount}</span>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-11 gap-2 px-3"
                disabled={rolling || !shown || shown === "error" || shown.length < 2}
                onClick={shuffle}
                aria-label="I-shuffle ang suggestions"
              >
                <Shuffle size={18} weight="bold" aria-hidden /> Shuffle
              </Button>
              <p className="flex-1 text-right text-sm font-semibold" aria-live="polite">
                {shown === "error" || !shown ? "" : `${shown.length} pasok`}
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

            {shown === "error" ? (
              <ErrorState onRetry={() => setRetry((n) => n + 1)} />
            ) : rolling ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border bg-card" role="status" aria-live="polite" aria-label="Nag-aayos ng bagong suggestions">
                <div className="h-16 w-full [perspective:600px]">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={flip}
                      initial={{ rotateX: 90, opacity: 0 }}
                      animate={{ rotateX: 0, opacity: 1 }}
                      exit={{ rotateX: -90, opacity: 0 }}
                      transition={{ duration: 0.08 }}
                      className="mx-auto flex h-16 max-w-[280px] items-center justify-center rounded-[16px] bg-surface-2 px-4 text-center text-lg font-semibold"
                    >
                      {flip || "…"}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : shown && shown.length === 0 ? (
              <EmptyResults
                budget={filters.budget}
                note={note?.text}
                onRaise={() => set({ budget: filters.budget + 50 })}
                onWiden={filters.max_distance_km !== null ? () => set({ max_distance_km: null }) : undefined}
                onClear={() => set({ ...CLEARED, open_only: true, avoid: filters.avoid })}
              />
            ) : (
              shown && (
                <LayoutGroup>
                  <motion.ul layout={!reduce} className="flex flex-col gap-3">
                    <AnimatePresence initial={false} mode="popLayout">
                      {shown.slice(0, MAX_SHOWN).map((r, i) => (
                        <motion.li
                          key={r.key}
                          layout={!reduce}
                          drag={reduce ? false : "x"}
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.6}
                          onDragEnd={(_e, info) => {
                            if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) nope(r);
                          }}
                          initial={reduce ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 34, delay: Math.min(i, 6) * 0.03 } }}
                          exit={reduce ? undefined : { x: -160, rotate: -8, opacity: 0, transition: { duration: 0.25 } }}
                          className="touch-pan-y"
                        >
                          {i === 1 && <h2 className="mb-3 text-lg">Iba pang option</h2>}
                          {i === 0 ? <HeroCard r={withReason(r)} onNope={() => nope(r)} /> : <CompactCard r={withReason(r)} onNope={() => nope(r)} />}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </motion.ul>
                  {shown.length > MAX_SHOWN && (
                    <p className="text-center text-xs text-muted-foreground">Ipinapakita ang top {MAX_SHOWN} sa {shown.length}.</p>
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
                return r === "error" ? 0 : r.results.length;
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
