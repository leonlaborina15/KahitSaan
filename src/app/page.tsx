"use client";

import { Mic, Search, Shuffle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { filtersFromRequest, useApp } from "@/components/app-data";
import { AppShell, SectionTitle } from "@/components/app-shell";
import { MiniFoodCard } from "@/components/food";
import { LocationRow } from "@/components/location";
import { RatingButtons } from "@/components/rating";
import { Setup } from "@/components/setup";
import { EmptyNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Welcome } from "@/components/welcome";
import { catalog } from "@/lib/catalog";
import { explore, mealPeriod } from "@/lib/rank/explore";
import { DEFAULT_PREFS } from "@/lib/store/db";
import type { CatalogItem, MealPeriod } from "@/lib/types";

const QUICK = ["₱100 lang", "Gutom na gutom", "Bilis!", "Malapit lang", "Kaming 4", "Chicken"];
const GREETING: Record<MealPeriod, string> = {
  breakfast: "Almusal time!",
  lunch: "Tanghalian na!",
  merienda: "Merienda?",
  dinner: "Hapunan na!",
  late: "Midnight cravings?",
};
const MEAL_NAME: Record<MealPeriod, string> = {
  breakfast: "almusal",
  lunch: "tanghalian",
  merienda: "merienda",
  dinner: "hapunan",
  late: "midnight snack",
};

/** Greeting buckets per spec: <10 almusal, 10–14 tanghalian, 14–17 merienda, 17–21 hapunan, else midnight. */
function greetingPeriod(now: Date): MealPeriod {
  const h = now.getHours();
  if (h < 10 && h >= 4) return "breakfast";
  return mealPeriod(now);
}

function Carousel({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">{children}</div>;
}

const itemsFromIds = (ids: string[]) => ids.map((id) => catalog.items.find((i) => i.id === id)).filter((i): i is CatalogItem => !!i);

export default function Home() {
  const router = useRouter();
  const { ready, prefs, setPrefs, taste, place, history, saved, rate } = useApp();
  const [onboarding, setOnboarding] = useState<"welcome" | "setup">("welcome");
  const [text, setText] = useState("");
  const period = greetingPeriod(new Date());

  const suggestions = useMemo(() => {
    if (!prefs || !taste || !place) return null;
    try {
      return explore({ catalog, filters: filtersFromRequest("", prefs).filters, prefs, taste, here: place }).slice(0, 5);
    } catch {
      return [];
    }
  }, [prefs, taste, place]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((h) => (seen.has(h.item_ids.join("+")) ? false : (seen.add(h.item_ids.join("+")), true)))
      .slice(0, 10);
  }, [history]);

  // Ask about the most recent unrated pick once it's at least 30 minutes old.
  const toRate = history.find((h) => h.rating === null && !h.rating_dismissed && Date.now() - Date.parse(h.at) > 30 * 60_000);

  if (!ready)
    return (
      <AppShell nav={false}>
        <div className="flex flex-col gap-4 py-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-36 w-full rounded-[20px]" />
          <Skeleton className="h-40 w-full rounded-[20px]" />
        </div>
      </AppShell>
    );

  if (!prefs)
    return (
      <AppShell nav={false}>
        {onboarding === "welcome" ? (
          <Welcome onStart={() => setOnboarding("setup")} onSkip={() => void setPrefs({ ...DEFAULT_PREFS, created_at: new Date().toISOString() })} />
        ) : (
          <Setup onBack={() => setOnboarding("welcome")} onDone={(p) => void setPrefs(p)} />
        )}
      </AppShell>
    );

  const search = () => router.push(`/results?q=${encodeURIComponent(text.trim())}`);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 pt-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-tight">{GREETING[period]}</h1>
          <LocationRow />
        </div>

        {toRate && (
          <section className="flex items-center gap-3 rounded-[20px] border bg-card p-4" aria-label="Rating">
            <p className="flex-1 text-sm">
              Nabusog ka ba sa <span className="font-semibold">{toRate.label}</span>{" "}
              {new Date(toRate.at).toDateString() === new Date().toDateString() ? "kanina" : "kahapon"}?
            </p>
            <RatingButtons h={toRate} />
            <button type="button" aria-label="Huwag na" onClick={() => void rate(toRate.id, null, true)} className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="size-5" />
            </button>
          </section>
        )}

        <section className="relative overflow-hidden rounded-[20px] bg-primary p-5 text-primary-foreground shadow-[var(--shadow-raised)]">
          <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-white/10" aria-hidden />
          <h2 className="text-xl">Hindi makapili?</h2>
          <p className="mb-4 text-sm text-white/90">Ako na bahala. Isang tap lang, may kakainin ka na.</p>
          <Button size="lg" variant="secondary" className="h-12 w-full bg-white text-base text-primary hover:bg-white/90" onClick={() => router.push("/kahit-saan")}>
            <Shuffle className="size-5" aria-hidden /> Kahit Saan
          </Button>
        </section>

        <section className="flex flex-col gap-3 rounded-[20px] border bg-card p-3">
          <div className="relative">
            <label htmlFor="request" className="sr-only">Ano&apos;ng hanap mo?</label>
            <Textarea
              id="request"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hal. ₱150 lang, gutom na gutom, ayoko ng matagal"
              className="min-h-24 resize-none rounded-[14px] border-0 bg-muted/60 pr-14 text-base shadow-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <span className="group absolute bottom-2 right-2">
              <button type="button" disabled aria-label="Voice input, soon" className="flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground opacity-60">
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
          <Button size="lg" className="h-12 w-full text-base" onClick={search}>
            <Search className="size-5" aria-hidden /> Hanapin
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Bagay ngayong {MEAL_NAME[period]}</SectionTitle>
          {suggestions === null ? (
            place ? <Skeleton className="h-36 rounded-[20px]" /> : <EmptyNote>Pumili ng lokasyon para makita ang mga malapit.</EmptyNote>
          ) : suggestions.length === 0 ? (
            <EmptyNote>Walang bukas na pasok sa budget mo ngayon. Subukan ang Hanapin.</EmptyNote>
          ) : (
            <Carousel>
              {suggestions.map((r) => (
                <MiniFoodCard key={r.key} items={r.items} sub={`${r.distance_km.toFixed(1)} km · ~${r.eta_min} min`} />
              ))}
            </Carousel>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Huling kinain mo</SectionTitle>
          {recent.length === 0 ? (
            <EmptyNote>Wala pa. Hanap na tayo!</EmptyNote>
          ) : (
            <Carousel>
              {recent.map((h) => {
                const items = itemsFromIds(h.item_ids);
                return items.length ? <MiniFoodCard key={h.id} items={items} sub={h.branch_name} /> : null;
              })}
            </Carousel>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Paborito mo</SectionTitle>
          {saved.items.length === 0 ? (
            <EmptyNote>I-tap ang ♥ sa kahit anong pagkain para lumabas dito.</EmptyNote>
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
