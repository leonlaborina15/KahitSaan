"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Footprints, MapPin, Shuffle, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { filtersFromRequest, useApp } from "@/components/app-data";
import { AppShell } from "@/components/app-shell";
import { BusogMeter, OpenLabel, WaitLabel, itemsLabel } from "@/components/food";
import { LocationRow } from "@/components/location";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAIN_COLORS, CHAIN_NAMES, catalog } from "@/lib/catalog";
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
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const roll = useCallback(async () => {
    if (!prefs || !taste || !place) return;
    timers.current.forEach(clearTimeout);
    try {
      const shown = loadShown();
      const exclude = new Set([...shown, ...(await loadNope()), ...recentlyEaten(history, 2)]);
      // Setup defaults only + time of day; must be open now.
      const { filters } = filtersFromRequest("", prefs);
      if (mealPeriod(new Date()) === "merienda") filters.hunger = "low";
      const list = explore({ catalog, filters, prefs, taste, here: place, excludeItems: exclude });
      const chosen = pickWeighted(list);
      if (!chosen) return setState("none");
      chosen.items.forEach((i) => shown.add(i.id));
      saveShown(shown);
      setPick(chosen);
      if (reduce) return setState("shown");
      setState("shuffling");
      // Flip through food names, then land.
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
    pick && prefs
      ? `${PERIOD_LINE[mealPeriod(new Date())]}, pasok sa ₱${prefs.usual_budget} mo${ateThisWeek ? "" : ", at hindi mo pa 'to nakain this week"}.`
      : "";

  return (
    <AppShell nav={false} header={false}>
      <div className="flex items-center justify-between py-3">
        <span className="flex items-center gap-2 text-lg font-bold">
          <Shuffle className="size-5 text-primary" aria-hidden /> Kahit Saan
        </span>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Isara" onClick={() => router.back()}>
          <X className="size-5" />
        </Button>
      </div>

      {!place ? (
        <div className="flex flex-col gap-4 pt-6">
          <LocationRow />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-6 py-4">
          {state === "loading" && <Skeleton className="h-[420px] w-full rounded-[20px]" />}

          {state === "shuffling" && (
            <div className="flex h-[420px] items-center justify-center rounded-[20px] border bg-card p-6" role="status" aria-live="polite">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={flip}
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ rotateX: -90, opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="text-center text-2xl font-bold"
                >
                  {flip}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {state === "shown" && pick && (
            <motion.article
              initial={reduce ? false : { scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex flex-col gap-4 rounded-[20px] border bg-card p-6 shadow-[var(--shadow-raised)]"
              aria-live="polite"
            >
              <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">Ito ang kakainin mo!</span>
              <h1 className="text-[28px] leading-tight">{itemsLabel(pick.items)}</h1>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold tabular-nums">₱{pick.total}</span>
                <BusogMeter value={pick.fill} size="md" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("size-2.5 rounded-full", CHAIN_COLORS[pick.branch.chain])} aria-hidden />
                <span className="font-semibold">{CHAIN_NAMES[pick.branch.chain]}</span>
                <span className="truncate text-muted-foreground">{pick.branch.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{pick.distance_km.toFixed(1)} km</span>
                <span className="flex items-center gap-1"><Footprints className="size-4" aria-hidden />Lakad {pick.walk_min} min</span>
                <OpenLabel o={pick} />
              </div>
              <WaitLabel o={pick} />
              <p className="flex gap-2 rounded-[14px] bg-primary-soft p-3 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {reason}
              </p>
            </motion.article>
          )}

          {state === "none" && (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border bg-card p-6 text-center">
              <p className="text-lg font-bold">Naubos na ang options!</p>
              <p className="text-sm text-muted-foreground">Napakita ko na lahat ng pasok ngayon. Ulitin natin?</p>
              <Button
                className="h-11"
                onClick={() => {
                  saveShown(new Set());
                  void roll();
                }}
              >
                Ulitin mula umpisa
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border bg-card p-6 text-center" role="alert">
              <p className="text-lg font-bold">Ay, may mali.</p>
              <Button variant="outline" className="h-11" onClick={() => void roll()}>Subukan ulit</Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-12 text-base" disabled={state !== "shown" || !pick} onClick={() => pick && confirm(pick.items, pick.branch, pick.total)}>
              Ito na!
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" className="h-12" disabled={state === "shuffling" || state === "loading"} onClick={() => void roll()}>
                Iba naman
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12"
                disabled={state !== "shown" || !pick}
                onClick={async () => {
                  if (!pick) return;
                  // Hide the main item (not the drink/side) for 7 days.
                  const main = pick.items.find((i) => ["meal", "main", "bundle"].includes(i.category)) ?? pick.items[0];
                  await addNope(main.id);
                  toast(`Sige, hindi ko muna ipapakita ang ${main.name} sa loob ng 7 araw.`);
                  void roll();
                }}
              >
                Ayoko nito
              </Button>
            </div>
            <Button variant="ghost" size="lg" className="h-12" onClick={() => router.push("/results?q=")}>
              Tingnan lahat
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
