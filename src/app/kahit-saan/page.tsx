"use client";

import { Clock, MapPin, PersonSimpleWalk, Shuffle, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { filtersFromRequest, useApp } from "@/components/app-data";
import { AppShell, buzz } from "@/components/app-shell";
import { ConfettiBurst } from "@/components/confetti";
import { BusogMeter, ChainLine, OpenLabel, SPEED, itemsLabel } from "@/components/food";
import { Kanin } from "@/components/kanin";
import { LocationRow } from "@/components/location";
import { Button } from "@/components/ui/button";
import { CategoryTile, OnDeviceBadge } from "@/components/visuals";
import { catalog } from "@/lib/catalog";
import { explore, mealPeriod, pickWeighted, type ItemResult } from "@/lib/rank/explore";
import { addNope, loadNope, recentlyEaten } from "@/lib/store/history";
import type { MealPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHUFFLE_MS = 1200;
const PERIOD_LINE: Record<MealPeriod, string> = {
  breakfast: "Almusal time",
  lunch: "Tanghalian na",
  merienda: "Merienda time",
  dinner: "Hapunan na",
  late: "Midnight cravings",
};

// Everything shown this session, so "Iba naman" never repeats (cleared when the tab closes).
const SESSION_KEY = "ks-shown";
const loadShown = (): Set<string> => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
};
const saveShown = (s: Set<string>) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s]));
  } catch {}
};

export default function KahitSaan() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { ready, prefs, taste, place, history, confirm } = useApp();
  const [pick, setPick] = useState<ItemResult | null>(null);
  const [state, setState] = useState<"loading" | "shuffling" | "shown" | "none" | "error">("loading");
  const [flip, setFlip] = useState("");
  const [tries, setTries] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const roll = useCallback(async () => {
    if (!prefs || !taste || !place) return;
    timers.current.forEach(clearTimeout);
    buzz();
    try {
      const shown = loadShown();
      const exclude = new Set([...shown, ...(await loadNope()), ...recentlyEaten(history, 2)]);
      // Setup defaults only + time of day; must be open now.
      const { filters } = filtersFromRequest("", prefs);
      if (mealPeriod(new Date()) === "merienda") filters.hunger = "low";
      const chosen = pickWeighted(explore({ catalog, filters, prefs, taste, here: place, excludeItems: exclude }));
      if (!chosen) return setState("none");
      chosen.items.forEach((i) => shown.add(i.id));
      saveShown(shown);
      setPick(chosen);
      setTries((n) => n + 1);
      if (reduce) return setState("shown");
      setState("shuffling");
      const names = catalog.items.filter((i) => i.category !== "drink").map((i) => i.name);
      const steps = 10;
      for (let s = 0; s < steps; s++) {
        timers.current.push(setTimeout(() => setFlip(names[Math.floor(Math.random() * names.length)]), (SHUFFLE_MS / steps) * s));
      }
      timers.current.push(setTimeout(() => setState("shown"), SHUFFLE_MS));
    } catch {
      setState("error");
    }
  }, [prefs, taste, place, history, reduce]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current || !prefs || !taste || !place) return;
    started.current = true;
    void roll();
  }, [prefs, taste, place, roll]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (ready && !prefs) {
    router.replace("/");
    return null;
  }

  const ateThisWeek = pick ? pick.items.some((i) => recentlyEaten(history, 7).has(i.id)) : false;
  const reason =
    pick && prefs ? `${PERIOD_LINE[mealPeriod(new Date())]}, pasok sa ₱${prefs.usual_budget} mo${ateThisWeek ? "" : ", at hindi mo pa 'to nakain this week"}.` : "";

  return (
    <div className="min-h-dvh" style={{ background: "linear-gradient(170deg, #C93A20 0%, #E2482C 50%, #F2802C 100%)" }}>
      <AppShell nav={false} header={false} bare>
        <div className="flex items-center justify-between py-3 text-white">
          <span className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Shuffle size={22} weight="bold" aria-hidden /> Kahit Saan
          </span>
          <span className="flex items-center gap-2">
            {tries > 1 && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Pang-{tries} na try</span>}
            <Button variant="ghost" size="icon" className="size-11 text-white hover:bg-white/15" aria-label="Isara" onClick={() => router.back()}>
              <X size={22} />
            </Button>
          </span>
        </div>

        {!place ? (
          <div className="rounded-[24px] bg-card p-4">
            <LocationRow />
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-5 py-2">
            <div className="relative min-h-[460px]">
              {(state === "loading" || state === "shuffling") && (
                <div className="flex h-[460px] flex-col items-center justify-center gap-6" role="status" aria-live="polite">
                  <motion.div animate={reduce ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}>
                    <Kanin mood="thinking" size={112} />
                  </motion.div>
                  <div className="h-20 w-full [perspective:600px]">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={flip}
                        initial={{ rotateX: 90, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        exit={{ rotateX: -90, opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="mx-auto flex h-20 max-w-[300px] items-center justify-center rounded-[20px] bg-white/95 px-4 text-center font-display text-xl font-bold text-foreground shadow-lg"
                      >
                        {flip || "…"}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {state === "shown" && pick && (
                <motion.article
                  initial={reduce ? false : { scale: 0.85, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="relative flex flex-col gap-4 rounded-[28px] bg-card p-6 shadow-2xl"
                  aria-live="polite"
                >
                  <ConfettiBurst />
                  <div className="-mt-16 flex justify-center">
                    <Kanin mood="happy" size={96} />
                  </div>
                  <span className="mx-auto w-fit rounded-full bg-mangga px-3 py-1 text-xs font-extrabold text-[#5a3c00]">Ito ang kakainin mo!</span>
                  <div className="flex items-center gap-4">
                    <CategoryTile items={pick.items} size={64} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <h1 className="text-2xl leading-tight">{itemsLabel(pick.items)}</h1>
                      <span className="flex items-center gap-3">
                        <span className="font-display text-4xl font-extrabold tabular-nums">₱{pick.total}</span>
                        <BusogMeter value={pick.fill} />
                      </span>
                    </div>
                  </div>
                  <ChainLine chain={pick.branch.chain} branch={pick.branch.name} />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={16} weight="duotone" aria-hidden />{pick.distance_km.toFixed(1)} km</span>
                    <span className="flex items-center gap-1"><PersonSimpleWalk size={16} weight="duotone" aria-hidden />Lakad {pick.walk_min} min</span>
                    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", SPEED[pick.speed].cls)}>
                      <Clock size={14} weight="duotone" aria-hidden />~{pick.wait_min} min · {SPEED[pick.speed].label}
                    </span>
                  </div>
                  <OpenLabel o={pick} />
                  <p className="flex flex-col gap-1 rounded-[16px] bg-ube-soft p-3 text-sm">
                    <span className="flex gap-2">
                      <Sparkle size={16} weight="fill" className="mt-0.5 shrink-0 text-ube" aria-hidden />
                      {reason}
                    </span>
                    <OnDeviceBadge className="pl-6" />
                  </p>
                </motion.article>
              )}

              {state === "none" && (
                <div className="flex flex-col items-center gap-3 rounded-[28px] bg-card p-6 text-center">
                  <Kanin mood="sleepy" size={96} />
                  <p className="font-display text-xl font-bold">Naubos na ang options!</p>
                  <p className="text-sm text-muted-foreground">Napakita ko na lahat ng pasok ngayon.</p>
                  <Button
                    size="lg"
                    className="h-12 w-full"
                    onClick={() => {
                      saveShown(new Set());
                      setTries(0);
                      void roll();
                    }}
                  >
                    Ulitin mula umpisa
                  </Button>
                </div>
              )}

              {state === "error" && (
                <div className="flex flex-col items-center gap-3 rounded-[28px] bg-card p-6 text-center" role="alert">
                  <Kanin mood="shocked" size={96} />
                  <p className="font-display text-xl font-bold">Ay, may mali.</p>
                  <Button size="lg" className="h-12 w-full" onClick={() => void roll()}>Subukan ulit</Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="h-14 rounded-[16px] bg-white font-display text-lg text-primary hover:bg-white/95"
                disabled={state !== "shown" || !pick}
                onClick={() => pick && confirm(pick.items, pick.branch, pick.total)}
              >
                Ito na!
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-[16px] border-2 border-white bg-transparent text-base text-white hover:bg-white/15 hover:text-white"
                disabled={state === "shuffling" || state === "loading"}
                onClick={() => void roll()}
              >
                <Shuffle size={20} weight="bold" aria-hidden /> Iba naman
              </Button>
              <div className="flex justify-between">
                <button
                  type="button"
                  disabled={state !== "shown" || !pick}
                  className="min-h-11 px-2 text-sm font-semibold text-white/90 underline disabled:opacity-50"
                  onClick={async () => {
                    if (!pick) return;
                    const main = pick.items.find((i) => ["meal", "main", "bundle"].includes(i.category)) ?? pick.items[0];
                    await addNope(main.id);
                    toast(`Sige, hindi ko muna ipapakita ang ${main.name} sa loob ng 7 araw.`);
                    void roll();
                  }}
                >
                  Ayoko nito
                </button>
                <button type="button" className="min-h-11 px-2 text-sm font-semibold text-white/90 underline" onClick={() => router.push("/results?q=")}>
                  Tingnan lahat
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </div>
  );
}
