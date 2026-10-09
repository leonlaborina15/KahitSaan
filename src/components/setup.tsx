"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Ban, Beef, ChevronLeft, Cookie, CookingPot, Drumstick, Fish, Flame, Hamburger, IceCreamBowl, MapPin, PiggyBank,
  Popcorn, Shrimp, Soup, UtensilsCrossed, Wallet, Wheat, Zap, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { StickyActions } from "@/components/app-shell";
import { ConfettiBurst } from "@/components/confetti";
import { SelectChip, SelectTile } from "@/components/select-tile";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import { DEFAULT_PREFS } from "@/lib/store/db";
import type { ChainId, Prefs, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const QUICK_BUDGETS = [100, 150, 200, 300];
const FOODS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "chicken", label: "Chicken", Icon: Drumstick },
  { id: "burger", label: "Burger", Icon: Hamburger },
  { id: "spaghetti", label: "Spaghetti", Icon: UtensilsCrossed },
  { id: "rice", label: "Rice meal", Icon: Wheat },
  { id: "noodles", label: "Noodles", Icon: Soup },
  { id: "siopao", label: "Siopao", Icon: Cookie },
  { id: "fries", label: "Fries", Icon: Popcorn },
  { id: "fish", label: "Fish", Icon: Fish },
  { id: "sisig", label: "Sisig", Icon: CookingPot },
  { id: "halo-halo", label: "Halo-halo", Icon: IceCreamBowl },
];
// "pork" maps to prefs.avoid_pork; the rest go to prefs.dislikes.
const AVOIDS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "pork", label: "Baboy", Icon: PiggyBank },
  { id: "beef", label: "Baka", Icon: Beef },
  { id: "seafood", label: "Seafood", Icon: Shrimp },
  { id: "spicy", label: "Maanghang", Icon: Flame },
];
const APPETITES: { id: Prefs["appetite"]; label: string; helper: string; Icon: LucideIcon }[] = [
  { id: "light", label: "Konti lang", helper: "Busog agad, light eater", Icon: Cookie },
  { id: "normal", label: "Sakto", helper: "Normal na kain", Icon: Drumstick },
  { id: "big", label: "Malakas kumain", helper: "Laging gutom, extra rice!", Icon: CookingPot },
];
const PRIORITIES: { id: Priority; label: string; Icon: LucideIcon }[] = [
  { id: "cheap", label: "Mura", Icon: Wallet },
  { id: "filling", label: "Busog", Icon: Soup },
  { id: "near", label: "Malapit", Icon: MapPin },
  { id: "fast", label: "Mabilis", Icon: Zap },
];

const CHAIN_HEX = Object.fromEntries(catalog.chains.map((c) => [c.id, c.color])) as Record<ChainId, string>;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** 6-step setup. Pass `initial` to edit existing prefs (Settings). */
export function Setup({
  onDone,
  onBack,
  initial,
  startStep = 0,
  single = false,
}: {
  onDone: (p: Prefs) => void;
  onBack?: () => void;
  initial?: Prefs;
  /** Edit mode: open this step and save right after it. */
  startStep?: number;
  single?: boolean;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(startStep);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<Prefs>(initial ?? { ...DEFAULT_PREFS, priority: [] });
  const [noneAvoid, setNoneAvoid] = useState(!!initial && !initial.avoid_pork && !initial.dislikes.length);
  const [appetitePicked, setAppetitePicked] = useState(!!initial);
  const [burst, setBurst] = useState(false);
  const update = (patch: Partial<Prefs>) => setP((prev) => ({ ...prev, ...patch }));

  const finish = (prefs: Prefs) => {
    const rest = DEFAULT_PREFS.priority.filter((x) => !prefs.priority.includes(x));
    onDone({ ...prefs, priority: [...prefs.priority, ...rest], created_at: prefs.created_at || new Date().toISOString() });
  };
  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const avoidOn = (id: string) => (id === "pork" ? p.avoid_pork : p.dislikes.includes(id));
  const toggleAvoid = (id: string) => {
    setNoneAvoid(false);
    if (id === "pork") update({ avoid_pork: !p.avoid_pork });
    else update({ dislikes: toggle(p.dislikes, id) });
  };

  const steps: { title: string; helper: string; valid: boolean; body: React.ReactNode }[] = [
    {
      title: "Magkano usually budget mo?",
      helper: "Para sa isang kain. Pwede mong palitan kahit kailan.",
      valid: p.usual_budget > 0,
      body: (
        <div className="flex flex-col gap-6">
          <div className="text-center text-6xl font-bold tabular-nums" aria-live="polite">
            ₱{p.usual_budget}
          </div>
          <Slider
            min={50}
            max={500}
            step={10}
            value={[p.usual_budget]}
            onValueChange={(v) => update({ usual_budget: Array.isArray(v) ? v[0] : v })}
            aria-label="Budget"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_BUDGETS.map((b) => (
              <SelectChip key={b} on={p.usual_budget === b} onClick={() => update({ usual_budget: b })}>
                ₱{b}
              </SelectChip>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Ano'ng hilig mo?",
      helper: "Pumili ng kahit ilan.",
      valid: p.favorite_foods.length > 0,
      body: (
        <div className="grid grid-cols-3 gap-2">
          {FOODS.map((f) => (
            <SelectTile key={f.id} Icon={f.Icon} label={f.label} on={p.favorite_foods.includes(f.id)} onClick={() => update({ favorite_foods: toggle(p.favorite_foods, f.id) })} />
          ))}
        </div>
      ),
    },
    {
      title: "Ano'ng iniiwasan mo?",
      helper: "Hindi namin ito irerekomenda.",
      valid: noneAvoid || p.avoid_pork || p.dislikes.length > 0,
      body: (
        <div className="grid grid-cols-3 gap-2">
          {AVOIDS.map((a) => (
            <SelectTile key={a.id} Icon={a.Icon} label={a.label} on={avoidOn(a.id)} onClick={() => toggleAvoid(a.id)} />
          ))}
          <SelectTile
            Icon={Ban}
            label="Wala"
            on={noneAvoid}
            onClick={() => {
              setNoneAvoid(true);
              update({ avoid_pork: false, dislikes: [] });
            }}
          />
        </div>
      ),
    },
    {
      title: "Gaano ka kalakas kumain?",
      helper: "Para alam namin kung gaano ka-busog dapat.",
      valid: appetitePicked,
      body: (
        <div className="flex flex-col gap-3">
          {APPETITES.map((a) => (
            <SelectTile
              key={a.id}
              layout="row"
              Icon={a.Icon}
              label={a.label}
              helper={a.helper}
              on={appetitePicked && p.appetite === a.id}
              onClick={() => {
                setAppetitePicked(true);
                update({ appetite: a.id });
              }}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Ano'ng pinaka-importante?",
      helper: "Una mong i-tap = pinaka-importante",
      valid: p.priority.length > 0,
      body: (
        <div className="flex flex-col gap-3">
          {/* Ranked first, in tap order; reorder animates. */}
          {[...PRIORITIES]
            .sort((a, b) => {
              const ra = p.priority.indexOf(a.id), rb = p.priority.indexOf(b.id);
              return (ra < 0 ? 9 : ra) - (rb < 0 ? 9 : rb);
            })
            .map((x) => {
              const rank = p.priority.indexOf(x.id);
              return (
                <motion.div key={x.id} layout={!reduce} transition={{ duration: 0.2 }}>
                  <SelectTile
                    layout="row"
                    Icon={x.Icon}
                    label={x.label}
                    on={rank >= 0}
                    onClick={() => update({ priority: toggle(p.priority, x.id) })}
                    badge={
                      rank >= 0 ? (
                        <span className="ml-auto flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-primary" aria-label={`Rank ${rank + 1}`}>
                          {rank + 1}
                        </span>
                      ) : undefined
                    }
                  />
                </motion.div>
              );
            })}
          {p.priority.length > 0 && (
            <button type="button" onClick={() => update({ priority: [] })} className="min-h-11 self-center text-sm font-medium text-primary underline">
              Ulitin
            </button>
          )}
        </div>
      ),
    },
    {
      title: "Favorite mong kainan?",
      helper: "Optional. Bibigyan namin ng konting dagdag na puntos.",
      valid: true,
      body: (
        <div className="flex flex-col gap-2">
          {(Object.keys(CHAIN_NAMES) as ChainId[]).map((c) => {
            const on = p.favorite_chains.includes(c);
            return (
              <SelectTile
                key={c}
                layout="row"
                label={CHAIN_NAMES[c]}
                accent={CHAIN_HEX[c]}
                on={on}
                onClick={() => update({ favorite_chains: toggle(p.favorite_chains, c) })}
              />
            );
          })}
        </div>
      ),
    },
  ];

  const s = steps[step];
  const last = single || step === steps.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 -mx-5 flex items-center gap-3 bg-background/95 px-5 py-2 backdrop-blur">
        <button
          type="button"
          aria-label="Balik"
          onClick={() => (step > startStep && !single ? go(step - 1) : onBack?.())}
          disabled={step === 0 && !onBack}
          className="flex size-11 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={step + 1} aria-label="Setup progress">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", (single ? i === step : i <= step) ? "bg-brand" : "bg-border")} />
          ))}
        </div>
        {!single && (
          <button type="button" onClick={() => finish({ ...DEFAULT_PREFS, ...p })} className="min-h-11 px-2 text-sm font-medium text-muted-foreground underline">
            Laktawan
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, x: 24 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -24 * dir }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-2 pt-4"
        >
          <h1 className="text-[26px] leading-tight">{s.title}</h1>
          <p className="mb-4 text-muted-foreground">{s.helper}</p>
          {s.body}
        </motion.div>
      </AnimatePresence>

      <StickyActions>
        {step > 0 && !single && (
          <Button variant="ghost" size="lg" className="h-12 px-5" onClick={() => go(step - 1)}>
            Balik
          </Button>
        )}
        <div className="relative flex-1">
          <Button
            size="lg"
            className="h-12 w-full text-base"
            disabled={!s.valid}
            onClick={() => {
              if (!last) return go(step + 1);
              setBurst(true);
              setTimeout(() => finish(p), reduce ? 0 : 450);
            }}
          >
            {last ? (initial ? "I-save" : "Simulan na!") : "Tuloy"}
          </Button>
          {burst && <ConfettiBurst />}
        </div>
      </StickyActions>
    </div>
  );
}
