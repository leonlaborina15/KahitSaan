"use client";

import { LogoMark, MicIcon, SearchIcon, ShuffleIcon, SparklesIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useApp } from "@/components/app-data";
import { AiStatusPill, useAiStatus } from "@/components/ai-status";
import { runSearch } from "@/lib/engine";
import { filtersFromRequest } from "@/lib/parse/filters";
import { AppShell, SectionTitle, buzz } from "@/components/app-shell";
import { MiniFoodCard } from "@/components/food";
import { Kanin } from "@/components/kanin";
import { LocationRow } from "@/components/location";
import { RatingButtons } from "@/components/rating";
import { Setup } from "@/components/setup";
import { EmptyNote, MiniSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Welcome } from "@/components/welcome";
import { chipClass } from "@/components/select-tile";
import { catalog } from "@/lib/catalog";
import { mealPeriod } from "@/lib/rank/explore";
import { DEFAULT_PREFS } from "@/lib/store/db";
import { loadNope } from "@/lib/store/history";
import type { CatalogItem, MealPeriod } from "@/lib/types";

const QUICK = ["₱100 lang", "Gutom na gutom", "Bilis!", "Malapit lang", "Kaming 4", "Chicken"];
const GREETING: Record<MealPeriod, string> = {
  breakfast: "Almusal time!",
  lunch: "Tanghalian na!",
  merienda: "Merienda?",
  dinner: "Hapunan na!",
  late: "Midnight cravings?",
};
const MEAL_NAME: Record<MealPeriod, string> = { breakfast: "almusal", lunch: "tanghalian", merienda: "merienda", dinner: "hapunan", late: "midnight snack" };

/** <10 almusal, 10–14 tanghalian, 14–17 merienda, 17–21 hapunan, else midnight. */
function greetingPeriod(now: Date): MealPeriod {
  const h = now.getHours();
  if (h < 10 && h >= 4) return "breakfast";
  return mealPeriod(now);
}

function Carousel({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1">{children}</div>;
}

/** One cell of the summary row: number in title step, label in micro. */
function Stat({ value, label, onClick }: { value: string; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-11 flex-1 flex-col items-start gap-1 px-4 first:pl-0 text-left">
      <span className="text-title tabular-nums">{value}</span>
      <span className="text-micro">{label}</span>
    </button>
  );
}

const itemsFromIds = (ids: string[]) => ids.map((id) => catalog.items.find((i) => i.id === id)).filter((i): i is CatalogItem => !!i);

export default function Home() {
  const router = useRouter();
  const { ready, prefs, setPrefs, taste, place, history, saved, rate } = useApp();
  const [onboarding, setOnboarding] = useState<"welcome" | "setup">("welcome");
  const [text, setText] = useState("");
  const [searching, startSearch] = useTransition();
  const ai = useAiStatus();
  const [noped, setNoped] = useState<Set<string>>(new Set());
  const period = greetingPeriod(new Date());

  // "Ayoko nito" items stay out of the suggestion strip too.
  useEffect(() => {
    void loadNope().then(setNoped);
  }, []);

  const suggestions = useMemo(() => {
    if (!prefs || !taste || !place) return null;
    try {
      return runSearch(filtersFromRequest("", prefs).filters, { catalog, prefs, taste, here: place, excludeItems: noped }).results.slice(0, 5);
    } catch {
      return [];
    }
  }, [prefs, taste, place, noped]);

  const eatenThisWeek = history.filter((h) => Date.now() - Date.parse(h.at) < 7 * 86_400_000).length;

  const toRate = history.find((h) => h.rating === null && !h.rating_dismissed && Date.now() - Date.parse(h.at) > 30 * 60_000);

  if (!ready)
    return (
      <AppShell nav={false}>
        <div className="flex flex-col gap-4 py-8">
          <span className="skeleton block h-8 w-2/3 rounded-[10px]" />
          <span className="skeleton block h-12 w-full rounded-[10px]" />
          <div className="flex gap-4 overflow-hidden"><MiniSkeleton /><MiniSkeleton /></div>
        </div>
      </AppShell>
    );

  if (!prefs)
    return (
      <AppShell nav={false} header={onboarding === "setup"}>
        {onboarding === "welcome" ? (
          <Welcome onStart={() => setOnboarding("setup")} onSkip={() => void setPrefs({ ...DEFAULT_PREFS, created_at: new Date().toISOString() })} />
        ) : (
          <Setup onBack={() => setOnboarding("welcome")} onDone={(p) => void setPrefs(p)} />
        )}
      </AppShell>
    );

  const search = () => startSearch(() => router.push(`/results?q=${encodeURIComponent(text.trim())}`));

  return (
    <AppShell header={false}>
      <div className="flex flex-col">
        {/* Header: logo + where you are + AI status. */}
        <header className="flex items-center gap-3 pb-4 pt-6">
          <LogoMark size={32} className="shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <LocationRow header />
          </div>
          <AiStatusPill status={ai} />
        </header>

        {/* Hero card: date, greeting, Kanin with a speech bubble, the one primary action. */}
        <section className="relative overflow-hidden rounded-[20px] bg-primary p-5 text-primary-foreground shadow-[var(--shadow-raised)]">
          <div className="pointer-events-none absolute -right-14 -top-16 size-52 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-black/10" aria-hidden />
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex flex-col gap-2">
              <h1 className="text-display">{GREETING[period]}</h1>
              <p className="max-w-[22ch] text-meta text-primary-foreground/90">Hindi makapili? Ako na bahala. Isang tap lang.</p>
            </div>
            <Kanin mood="hungry" size={96} bob className="shrink-0 drop-shadow-[0_8px_12px_rgb(0_0_0/0.18)]" />
          </div>

          <Button
            size="lg"
            className="relative mt-4 h-14 w-full gap-2 rounded-[10px] bg-card text-body font-semibold text-primary shadow-[var(--shadow-soft)] hover:bg-card/95"
            onClick={() => {
              buzz();
              router.push("/kahit-saan");
            }}
          >
            <ShuffleIcon key="hero" size={22} aria-hidden /> Kahit Saan
          </Button>
        </section>

        {toRate && (
          <section className="mt-4 flex items-center gap-2 rounded-[20px] bg-card py-1 pl-4 pr-1 shadow-[var(--shadow-xs)]" aria-label="Rating">
            <p className="flex-1 text-meta">
              Nabusog ka ba sa <span className="text-foreground">{toRate.label}</span>{" "}
              {new Date(toRate.at).toDateString() === new Date().toDateString() ? "kanina" : "kahapon"}?
            </p>
            <RatingButtons h={toRate} />
            <button type="button" aria-label="Huwag na" onClick={() => void rate(toRate.id, null, true)} className="flex size-11 items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground">
              <XIcon size={18} />
            </button>
          </section>
        )}

        {/* Search: secondary, in a soft card. */}
        <section className="mt-8 flex flex-col gap-2 rounded-[20px] bg-card p-4 shadow-[var(--shadow-soft)]">
          <p className="flex items-center gap-1.5 pb-1 text-section"><SparklesIcon size={18} className="text-brand" aria-hidden /> Ano&apos;ng hanap mo?</p>
          <div className="relative">
            <label htmlFor="request" className="sr-only">Ano&apos;ng hanap mo?</label>
            <textarea
              id="request"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Ano'ng gusto mo? Hal. ₱150 lang, gutom na gutom, ayoko ng matagal"
              className="block w-full resize-none rounded-[10px] border border-border bg-background py-3 pl-4 pr-12 text-body placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <button type="button" disabled title="Soon" aria-label="Voice input, soon" className="absolute right-0 top-0 flex size-11 items-center justify-center text-muted-foreground opacity-60">
              <MicIcon size={20} aria-hidden />
            </button>
          </div>
          <div className="no-scrollbar edge-fade -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${q}` : q))} className={chipClass(false)}>
                + {q}
              </button>
            ))}
          </div>
          <Button variant="outline" size="lg" className="h-12 w-full gap-2 rounded-[10px] border-border-strong bg-transparent text-body font-semibold" onClick={search} disabled={searching} aria-busy={searching}>
            {searching ? <SpinnerIcon size={20} className="animate-spin" aria-hidden /> : <SearchIcon size={20} aria-hidden />}
            {searching ? "Hinahanap..." : "Hanapin"}
          </Button>
        </section>

        {/* Summary: one borderless row with thin dividers. */}
        <div className="mt-4 flex divide-x rounded-[20px] bg-card px-4 py-4 shadow-[var(--shadow-soft)]">
          <Stat value={`₱${prefs.usual_budget}`} label="default budget" onClick={() => router.push("/ako")} />
          <Stat value={String(saved.items.length)} label="paborito" onClick={() => router.push("/saved")} />
          <Stat value={String(eatenThisWeek)} label="nakain this week" onClick={() => router.push("/kinain")} />
        </div>

        <section className="flex flex-col gap-4 pt-8">
          <SectionTitle>Bagay ngayong {MEAL_NAME[period]}</SectionTitle>
          {suggestions === null ? (
            place ? <Carousel><MiniSkeleton /><MiniSkeleton /></Carousel> : <EmptyNote>Pumili ng lokasyon para makita ang mga malapit.</EmptyNote>
          ) : suggestions.length === 0 ? (
            <EmptyNote action={{ label: "Hanapin", onClick: search }}>Walang bukas na pasok sa budget mo ngayon.</EmptyNote>
          ) : (
            <Carousel>
              {suggestions.map((r) => (
                <MiniFoodCard key={r.key} items={r.items} sub={`${r.distance_km.toFixed(1)} km · ~${r.eta_min} min`} />
              ))}
            </Carousel>
          )}
        </section>

        <section className="flex flex-col gap-4 pt-4">
          <SectionTitle>Paborito mo</SectionTitle>
          {saved.items.length === 0 ? (
            <EmptyNote>I-tap ang puso sa kahit anong pagkain para lumabas dito.</EmptyNote>
          ) : (
            <Carousel>
              {saved.items.map((key) => {
                const items = itemsFromIds(key.split("+"));
                return items.length ? <MiniFoodCard key={key} items={items} /> : null;
              })}
            </Carousel>
          )}
        </section>
      </div>
    </AppShell>
  );
}
