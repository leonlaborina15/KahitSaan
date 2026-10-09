"use client";

import { Heart, MagnifyingGlass, Microphone, Shuffle, Sparkle, Wallet, X, ClockCounterClockwise } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app-data";
import { runSearch } from "@/lib/engine";
import { filtersFromRequest } from "@/lib/parse/filters";
import { AppShell, SectionTitle, buzz } from "@/components/app-shell";
import { MiniFoodCard } from "@/components/food";
import { Kanin } from "@/components/kanin";
import { LocationRow } from "@/components/location";
import { RatingButtons } from "@/components/rating";
import { Setup } from "@/components/setup";
import { EmptyNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Welcome } from "@/components/welcome";
import { catalog } from "@/lib/catalog";
import { mealPeriod } from "@/lib/rank/explore";
import { DEFAULT_PREFS } from "@/lib/store/db";
import { loadNope } from "@/lib/store/history";
import type { CatalogItem, MealPeriod } from "@/lib/types";

const QUICK = ["₱100 lang", "Gutom na gutom", "Bilis!", "Malapit lang", "Kaming 4", "Chicken"];
const PROMPTS = ["₱150 lang, gutom na…", "kaming 4 sa Jollibee…", "bawal baboy, malapit lang…", "₱100 pababa, bilis!", "chicken, 'yung malapit"];
const PROMPT_MS = 2600;
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
  return <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1">{children}</div>;
}

/** Rotating example prompts shown inside the empty search box. */
function CyclingPlaceholder() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PROMPTS.length), PROMPT_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="pointer-events-none absolute left-3 top-3.5 flex items-center gap-2 text-base text-muted-foreground" aria-hidden>
      <Sparkle size={18} weight="fill" className="shrink-0 text-ube" />
      <AnimatePresence mode="wait">
        <motion.span key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
          {PROMPTS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function StatTile({ Icon, value, label, onClick }: { Icon: typeof Wallet; value: string; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-1 flex-col items-start gap-1 rounded-[20px] border bg-card p-3 text-left">
      <Icon size={20} weight="duotone" className="text-primary" aria-hidden />
      <span className="font-display text-xl font-extrabold leading-none">{value}</span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </button>
  );
}

const itemsFromIds = (ids: string[]) => ids.map((id) => catalog.items.find((i) => i.id === id)).filter((i): i is CatalogItem => !!i);

export default function Home() {
  const router = useRouter();
  const { ready, prefs, setPrefs, taste, place, history, saved, rate } = useApp();
  const [onboarding, setOnboarding] = useState<"welcome" | "setup">("welcome");
  const [text, setText] = useState("");
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
        <div className="flex flex-col gap-4 py-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-44 w-full rounded-[24px]" />
          <Skeleton className="h-40 w-full rounded-[24px]" />
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

  const search = () => router.push(`/results?q=${encodeURIComponent(text.trim())}`);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 pt-1">
        <LocationRow />

        {toRate && (
          <section className="flex items-center gap-3 rounded-[24px] border bg-card p-3" aria-label="Rating">
            <p className="flex-1 pl-1 text-sm">
              Nabusog ka ba sa <span className="font-semibold">{toRate.label}</span>{" "}
              {new Date(toRate.at).toDateString() === new Date().toDateString() ? "kanina" : "kahapon"}?
            </p>
            <RatingButtons h={toRate} />
            <button type="button" aria-label="Huwag na" onClick={() => void rate(toRate.id, null, true)} className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X size={18} />
            </button>
          </section>
        )}

        {/* Hero: time-aware greeting on gradient + glowing search bar */}
        <section
          className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-[var(--shadow-raised)]"
          style={{ background: "linear-gradient(135deg, #C93A20 0%, #E2482C 45%, #F2802C 100%)" }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" aria-hidden />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 size-32 rounded-full bg-mangga/20" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-[34px] leading-none text-white">{GREETING[period]}</h1>
              <p className="max-w-[22ch] text-sm text-white/90">Hindi makapili? Ako na bahala. Isang tap lang.</p>
            </div>
            <Kanin mood="hungry" size={84} bob className="-mr-1 -mt-1" />
          </div>

          {/* Glowing search bar: rotating conic ring + cycling prompts + pulsing mic */}
          <div className="glow-ring relative mt-4 rounded-[22px] p-[2px]">
            <div className="relative rounded-[20px] bg-card">
              <label htmlFor="request" className="sr-only">Ano&apos;ng hanap mo?</label>
              <Textarea
                id="request"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder=""
                className="min-h-[104px] resize-none rounded-[20px] border-0 bg-transparent pl-3 pr-2 pt-3.5 text-base shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    search();
                  }
                }}
              />
              {!text && <CyclingPlaceholder />}
              <span className="absolute bottom-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Voice input, soon"
                  onClick={() => toast("Voice input — malapit na!")}
                  className="animate-mic-ping flex size-11 items-center justify-center rounded-full bg-surface-2 text-mangga"
                >
                  <Microphone size={20} weight="fill" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Hanapin"
                  onClick={search}
                  className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <MagnifyingGlass size={20} weight="bold" aria-hidden />
                </button>
              </span>
            </div>
          </div>

          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            {QUICK.map((q, i) => (
              <motion.button
                key={q}
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.3 + i * 0.06, type: "spring", stiffness: 400, damping: 22 } }}
                onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${q}` : q))}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white/12 px-4 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
              >
                + {q}
              </motion.button>
            ))}
          </div>

          <Button
            size="lg"
            className="relative mt-3 h-14 w-full rounded-[16px] bg-white font-display text-lg text-primary ring-4 ring-mangga hover:bg-white/95"
            onClick={() => {
              buzz();
              router.push("/kahit-saan");
            }}
          >
            <Shuffle size={22} weight="bold" aria-hidden /> Kahit Saan
          </Button>
        </section>

        {/* Bento: stats */}
        <div className="flex gap-2">
          <StatTile Icon={Wallet} value={`₱${prefs.usual_budget}`} label="default budget" onClick={() => router.push("/ako")} />
          <StatTile Icon={Heart} value={String(saved.items.length)} label="paborito" onClick={() => router.push("/saved")} />
          <StatTile Icon={ClockCounterClockwise} value={String(eatenThisWeek)} label="nakain this week" onClick={() => router.push("/kinain")} />
        </div>

        <section className="flex flex-col gap-3 pt-2">
          <SectionTitle>Bagay ngayong {MEAL_NAME[period]}</SectionTitle>
          {suggestions === null ? (
            place ? <Skeleton className="h-48 rounded-[24px]" /> : <EmptyNote>Pumili ng lokasyon para makita ang mga malapit.</EmptyNote>
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

        <section className="flex flex-col gap-3">
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
