"use client";

import { MapPin, Mic, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, StickyActions } from "@/components/app-shell";
import { FilterChips, type FilterKey } from "@/components/filter-chips";
import { LocationSheet, useLocation } from "@/components/location";
import { RecentPicks } from "@/components/recent-picks";
import { PickSheet, ResultCard, winsFor } from "@/components/result-card";
import { Setup } from "@/components/setup";
import { EmptyResults, ErrorState, LocationDenied, Searching } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Welcome } from "@/components/welcome";
import { catalog } from "@/lib/catalog";
import { parseRules } from "@/lib/parse/rules";
import { resolveFilters, type ResolvedFilters } from "@/lib/parse/validate";
import { rank, type RankOutput } from "@/lib/rank/score";
import { DEFAULT_PREFS, loadPrefs, loadTaste, recordPick, savePrefs } from "@/lib/store/db";
import type { Filters, Prefs, Result, TasteProfile } from "@/lib/types";

const QUICK = ["₱100 lang", "Gutom na gutom", "Bilis!", "Kaming 4"];
// Short pause so the searching state is visible; ranking itself is instant.
const SEARCH_DELAY_MS = 700;

/** Which chips were filled from setup prefs rather than the request text. */
function setupKeys(parsed: Filters, prefs: Prefs): Set<FilterKey> {
  const s = new Set<FilterKey>();
  if (parsed.budget === null) s.add("budget");
  if (parsed.hunger === "normal") s.add("hunger");
  if (!parsed.avoid.length && (prefs.avoid_pork || prefs.dislikes.length)) s.add("avoid");
  return s;
}

export default function Home() {
  const [prefs, setPrefs] = useState<Prefs | null | undefined>(undefined);
  const [onboarding, setOnboarding] = useState<"welcome" | "setup">("welcome");
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<ResolvedFilters | null>(null);
  const [fromSetup, setFromSetup] = useState<Set<FilterKey>>(new Set());
  const [out, setOut] = useState<RankOutput | null>(null);
  const [phase, setPhase] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [locOpen, setLocOpen] = useState(false);
  const [picked, setPicked] = useState<Result | null>(null);
  const { place, status, pick, locate } = useLocation();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadPrefs().then((p) => setPrefs(p ?? null));
    void loadTaste().then(setTaste);
  }, []);

  const runRank = (f: ResolvedFilters) => {
    if (!prefs || !taste || !place) return;
    setFilters(f);
    try {
      setOut(rank({ catalog, filters: f, prefs, taste, here: place }));
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  const search = () => {
    if (!prefs || !place) return;
    setPhase("searching");
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      // Basic mode: rule parser. The local LLM takes over in Phase 3 (SPEC §4.3).
      const parsed = parseRules(text);
      setFromSetup(setupKeys(parsed, prefs));
      runRank(resolveFilters(parsed, prefs));
    }, SEARCH_DELAY_MS);
  };

  const onPick = async (r: Result) => {
    setPicked(r);
    setTaste(await recordPick(r.items));
    toast.success("Enjoy! Natandaan ko 'to.");
  };

  if (prefs === undefined)
    return (
      <AppShell nav={false}>
        <div className="flex flex-col gap-4 py-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full rounded-[20px]" />
        </div>
      </AppShell>
    );

  if (prefs === null)
    return (
      <AppShell nav={false}>
        {onboarding === "welcome" ? (
          <Welcome
            onStart={() => setOnboarding("setup")}
            onSkip={() => {
              const p = { ...DEFAULT_PREFS, created_at: new Date().toISOString() };
              void savePrefs(p).then(() => setPrefs(p));
            }}
          />
        ) : (
          <Setup onBack={() => setOnboarding("welcome")} onDone={(p) => void savePrefs(p).then(() => setPrefs(p))} />
        )}
      </AppShell>
    );

  const results = out?.results ?? [];
  const [best, ...alts] = results;
  const wins = winsFor(results);
  const sameChainAlt = best ? alts.findIndex((a) => a.branch.chain === best.branch.chain) : -1;

  return (
    <AppShell>
      <div className="flex flex-col gap-5 pt-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Hi! Gutom ka na?</p>
          <h1 className="text-[28px] leading-tight">Saan tayo kakain?</h1>
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] border bg-card p-3">
          <div className="relative">
            <label htmlFor="request" className="sr-only">
              Ano&apos;ng hanap mo?
            </label>
            <Textarea
              id="request"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hal. ₱150 lang, gutom na gutom, ayoko ng matagal"
              className="min-h-24 resize-none rounded-[14px] border-0 bg-muted/60 pr-14 text-base shadow-none focus-visible:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <span className="group absolute bottom-2 right-2">
              <button
                type="button"
                disabled
                aria-label="Voice input, soon"
                className="flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground opacity-60"
              >
                <Mic className="size-5" aria-hidden />
              </button>
              <span className="pointer-events-none absolute -top-8 right-0 rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                Soon
              </span>
            </span>
          </div>
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${q}` : q))}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-semibold hover:border-brand/50"
              >
                + {q}
              </button>
            ))}
          </div>
        </div>

        {status === "need-pick" ? (
          <LocationDenied onPick={() => setLocOpen(true)} />
        ) : (
          <div className="flex min-h-11 items-center gap-2 text-sm">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex-1 truncate">
              {status === "locating" ? (
                <span className="text-muted-foreground">Hinahanap ang lokasyon mo…</span>
              ) : (
                <>
                  Malapit sa: <span className="font-semibold">{place?.label}</span>
                </>
              )}
            </span>
            <button type="button" onClick={() => setLocOpen(true)} className="min-h-11 px-2 font-semibold text-primary">
              Palitan
            </button>
          </div>
        )}

        <div ref={resultsRef} className="scroll-mt-20" />

        {phase === "searching" && <Searching />}
        {phase === "error" && <ErrorState onRetry={search} />}
        {phase === "done" && filters && (
          <section className="flex flex-col gap-4" aria-label="Resulta">
            <FilterChips f={filters} onChange={runRank} fromSetup={fromSetup} />
            {out?.relaxedDistance && (
              <p className="rounded-[14px] bg-warning/15 p-3 text-sm">Walang malapit na pasok, kaya isinama ko ang medyo malayo.</p>
            )}
            {!best ? (
              <EmptyResults
                budget={filters.budget}
                onRaise={() => runRank({ ...filters, budget: filters.budget + 50 })}
                onWiden={filters.max_distance_km !== null ? () => runRank({ ...filters, max_distance_km: null }) : undefined}
              />
            ) : (
              <>
                <ResultCard
                  key={best.branch.id + best.total}
                  r={best}
                  best
                  wins={wins[0]}
                  onPick={onPick}
                  onOtherBranch={
                    sameChainAlt >= 0
                      ? () => document.getElementById(`alt-${sameChainAlt}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
                      : undefined
                  }
                />
                {alts.length > 0 && (
                  <>
                    <h2 className="text-base">Iba pang option</h2>
                    {alts.map((r, i) => (
                      <div key={r.branch.id + r.total} id={`alt-${i}`}>
                        <ResultCard r={r} best={false} wins={wins[i + 1]} onPick={onPick} />
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {phase === "idle" && <RecentPicks taste={taste} onTap={(name) => setText(name.toLowerCase())} />}
      </div>

      <StickyActions aboveNav>
        <Button size="lg" className="h-12 w-full text-base" disabled={!place || phase === "searching"} onClick={search}>
          <Search className="size-5" aria-hidden /> Hanapin
        </Button>
      </StickyActions>

      <LocationSheet open={locOpen} onOpenChange={setLocOpen} current={place} onPick={pick} onGps={locate} />
      <PickSheet r={picked} onClose={() => setPicked(null)} />
    </AppShell>
  );
}
