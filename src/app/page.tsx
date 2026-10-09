"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FilterChips } from "@/components/filter-chips";
import { LandmarkPicker, useLocation } from "@/components/location";
import { ResultCard } from "@/components/result-card";
import { Setup } from "@/components/setup";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { catalog } from "@/lib/catalog";
import { parseRules } from "@/lib/parse/rules";
import { resolveFilters, type ResolvedFilters } from "@/lib/parse/validate";
import { rank, type RankOutput } from "@/lib/rank/score";
import { loadPrefs, loadTaste, recordPick, savePrefs } from "@/lib/store/db";
import type { Prefs, Result, TasteProfile } from "@/lib/types";

const QUICK = ["₱100 lang", "Gutom na gutom", "Bilis!", "Kaming 4"];

export default function Home() {
  const [prefs, setPrefs] = useState<Prefs | null | undefined>(undefined);
  const [taste, setTaste] = useState<TasteProfile | null>(null);
  const [text, setText] = useState("");
  const [filters, setFilters] = useState<ResolvedFilters | null>(null);
  const [out, setOut] = useState<RankOutput | null>(null);
  const [picking, setPicking] = useState(false);
  const { place, status, pick } = useLocation();

  useEffect(() => {
    void loadPrefs().then((p) => setPrefs(p ?? null));
    void loadTaste().then(setTaste);
  }, []);

  const runRank = (f: ResolvedFilters) => {
    if (!prefs || !taste || !place) return;
    setFilters(f);
    setOut(rank({ catalog, filters: f, prefs, taste, here: place }));
  };

  const search = () => {
    if (!prefs) return;
    // Simple mode: rule parser. The local LLM takes over in Phase 3 (SPEC §4.3).
    runRank(resolveFilters(parseRules(text), prefs));
  };

  const onPick = async (r: Result) => setTaste(await recordPick(r.items));

  if (prefs === undefined) return <AppShell>{null}</AppShell>;
  if (prefs === null)
    return (
      <AppShell>
        <Setup onDone={(p) => void savePrefs(p).then(() => setPrefs(p))} />
      </AppShell>
    );

  const [best, ...alts] = out?.results ?? [];

  return (
    <AppShell>
      <div className="flex flex-col gap-4 py-4">
        <h1 className="text-2xl font-bold">Saan tayo kakain?</h1>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Hal. ₱150 lang, gutom na gutom, ayoko ng matagal"
          className="min-h-24 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              search();
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${q}` : q))}
              className="min-h-9 rounded-full border px-3 text-sm hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>

        {status === "locating" && <p className="text-sm text-muted-foreground">Hinahanap ang lokasyon mo…</p>}
        {status === "ready" && place && !picking && (
          <p className="text-sm text-muted-foreground">
            Malapit sa: <span className="font-medium text-foreground">{place.label}</span>{" "}
            <button type="button" className="underline" onClick={() => setPicking(true)}>
              palitan
            </button>
          </p>
        )}
        {(status === "need-pick" || picking) && (
          <LandmarkPicker
            onPick={(p) => {
              pick(p);
              setPicking(false);
            }}
          />
        )}

        <Button size="lg" className="h-12 text-base" disabled={!place} onClick={search}>
          Hanapin
        </Button>

        {filters && out && (
          <section className="flex flex-col gap-3">
            <FilterChips f={filters} onChange={runRank} />
            {out.relaxedDistance && (
              <p className="text-sm text-muted-foreground">Walang malapit na pasok, kaya isinama ang medyo malayo.</p>
            )}
            {!best && (
              <p className="rounded-xl bg-muted p-4 text-sm">
                Walang pasok sa budget. Taasan ng konti o tanggalin ang ibang filter?
              </p>
            )}
            {best && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Best pick mo</h2>
                <ResultCard key={best.branch.id + best.total} r={best} best onPick={onPick} />
              </>
            )}
            {alts.length > 0 && (
              <>
                <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Iba pang option</h2>
                {alts.map((r) => (
                  <ResultCard key={r.branch.id + r.total} r={r} best={false} onPick={onPick} />
                ))}
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
