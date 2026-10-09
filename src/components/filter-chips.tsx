"use client";

import { Minus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { SelectChip } from "@/components/select-tile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { CHAIN_NAMES } from "@/lib/catalog";
import type { ExploreFilters } from "@/lib/rank/explore";
import type { ChainId, Level } from "@/lib/types";

export const HUNGER: Record<Level, string> = { low: "Konti", normal: "Sakto", high: "Gutom na gutom" };
export const URGENCY: Record<Level, string> = { low: "Chill", normal: "Normal", high: "Nagmamadali" };
export const AVOID_LABELS: Record<string, string> = { pork: "Baboy", beef: "Baka", seafood: "Seafood", spicy: "Maanghang" };
export const FOOD_TYPES: { id: string; label: string }[] = [
  { id: "chicken", label: "Chicken" },
  { id: "burger", label: "Burger" },
  { id: "spaghetti", label: "Spaghetti" },
  { id: "rice", label: "Rice meal" },
  { id: "noodles", label: "Noodles" },
  { id: "sisig", label: "Sisig" },
  { id: "fish", label: "Fish" },
  { id: "fries", label: "Fries" },
  { id: "dessert", label: "Dessert" },
];
const DISTANCES = [0.5, 1, 2, 5];
const LEVELS: Level[] = ["low", "normal", "high"];
const foodLabel = (t: string) => FOOD_TYPES.find((x) => x.id === t)?.label ?? t;
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export type FilterKey = "budget" | "people" | "hunger" | "urgency" | "distance" | "food" | "avoid" | "chains";

function Stepper({ value, dec, inc, what }: { value: string; dec: () => void; inc: () => void; what: string }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] border bg-card p-1.5">
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Bawasan ${what}`} onClick={dec}>
        <Minus className="size-5" />
      </Button>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Dagdagan ${what}`} onClick={inc}>
        <Plus className="size-5" />
      </Button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Editors for each filter, shared by the chip sheet and the full Filters sheet. */
function Editor({ k, f, set }: { k: FilterKey; f: ExploreFilters; set: (p: Partial<ExploreFilters>) => void }) {
  const [perPerson, setPerPerson] = useState(false);
  switch (k) {
    case "budget": {
      const shown = perPerson ? Math.round(f.budget / f.people) : f.budget;
      const apply = (v: number) => set({ budget: perPerson ? v * f.people : v });
      return (
        <div className="flex flex-col gap-4">
          <div className="text-center text-4xl font-bold tabular-nums">₱{shown}</div>
          <Slider min={50} max={500} step={10} value={[Math.min(500, Math.max(50, shown))]} onValueChange={(v) => apply(Array.isArray(v) ? v[0] : v)} aria-label="Budget" />
          {f.people > 1 && (
            <div className="flex gap-2">
              <SelectChip on={perPerson} onClick={() => setPerPerson(true)}>Per tao</SelectChip>
              <SelectChip on={!perPerson} onClick={() => setPerPerson(false)}>Total</SelectChip>
            </div>
          )}
        </div>
      );
    }
    case "people":
      return (
        <Stepper
          value={`${f.people} ${f.people === 1 ? "tao" : "katao"}`}
          what="tao"
          dec={() => set({ people: Math.max(1, f.people - 1) })}
          inc={() => set({ people: Math.min(20, f.people + 1) })}
        />
      );
    case "hunger":
      return (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <SelectChip key={l} on={f.hunger === l} onClick={() => set({ hunger: l })}>{HUNGER[l]}</SelectChip>
          ))}
        </div>
      );
    case "urgency":
      return (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <SelectChip key={l} on={f.urgency === l} onClick={() => set({ urgency: l })}>{URGENCY[l]}</SelectChip>
          ))}
        </div>
      );
    case "distance":
      return (
        <div className="flex flex-wrap gap-2">
          {DISTANCES.map((km) => (
            <SelectChip key={km} on={f.max_distance_km === km} onClick={() => set({ max_distance_km: km })}>{km} km</SelectChip>
          ))}
          <SelectChip on={f.max_distance_km === null} onClick={() => set({ max_distance_km: null })}>Kahit gaano</SelectChip>
        </div>
      );
    case "food":
      return (
        <div className="flex flex-wrap gap-2">
          {[...new Set([...FOOD_TYPES.map((t) => t.id), ...f.food_types])].map((t) => (
            <SelectChip key={t} on={f.food_types.includes(t)} onClick={() => set({ food_types: toggle(f.food_types, t) })}>{foodLabel(t)}</SelectChip>
          ))}
        </div>
      );
    case "avoid":
      return (
        <div className="flex flex-wrap gap-2">
          {[...new Set([...Object.keys(AVOID_LABELS), ...f.avoid])].map((a) => (
            <SelectChip key={a} on={f.avoid.includes(a)} onClick={() => set({ avoid: toggle(f.avoid, a) })}>{AVOID_LABELS[a] ?? a}</SelectChip>
          ))}
        </div>
      );
    case "chains":
      return (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHAIN_NAMES) as ChainId[]).map((c) => (
            <SelectChip key={c} on={f.chains.includes(c)} onClick={() => set({ chains: toggle(f.chains, c) })}>{CHAIN_NAMES[c]}</SelectChip>
          ))}
        </div>
      );
  }
}

const TITLES: Record<FilterKey, string> = {
  budget: "Budget",
  people: "Ilan kayo?",
  hunger: "Gaano kagutom?",
  urgency: "Gaano kabilis?",
  distance: "Gaano kalayo?",
  food: "Anong klaseng pagkain?",
  avoid: "Iniiwasan",
  chains: "Kainan",
};

/** "Na-intindi ko": parsed filters as chips. Tap to edit; avoid chips have their own ✕. */
export function FilterChips({ f, onChange, fromSetup }: { f: ExploreFilters; onChange: (f: ExploreFilters) => void; fromSetup: Set<string> }) {
  const [editing, setEditing] = useState<FilterKey | null>(null);
  const set = (p: Partial<ExploreFilters>) => onChange({ ...f, ...p });

  const chips: { key: FilterKey; label: string }[] = [
    { key: "budget", label: `₱${f.budget}` },
    { key: "people", label: `${f.people} ${f.people === 1 ? "tao" : "katao"}` },
    { key: "hunger", label: HUNGER[f.hunger] },
    { key: "urgency", label: URGENCY[f.urgency] },
    { key: "distance", label: f.max_distance_km ? `≤ ${f.max_distance_km} km` : "Kahit gaano kalayo" },
    { key: "food", label: f.food_types.length ? f.food_types.map(foodLabel).join(", ") : "Kahit anong pagkain" },
  ];
  const chip = "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold hover:border-brand/50";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Na-intindi ko</p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => setEditing(c.key)} aria-label={`Palitan: ${c.label}`} className={chip}>
            {c.label}
            {fromSetup.has(c.key) && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">setup</span>}
            <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        ))}
        {f.avoid.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => set({ avoid: f.avoid.filter((x) => x !== a) })}
            aria-label={`Alisin ang iwas ${AVOID_LABELS[a] ?? a} para sa search na 'to`}
            className={chip}
          >
            Iwas: {AVOID_LABELS[a] ?? a}
            {fromSetup.has("avoid") && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">setup</span>}
            <span aria-hidden className="text-muted-foreground">✕</span>
          </button>
        ))}
      </div>
      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
          {editing && (
            <>
              <SheetHeader className="px-0">
                <SheetTitle>{TITLES[editing]}</SheetTitle>
              </SheetHeader>
              <Editor k={editing} f={f} set={set} />
              <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={() => setEditing(null)}>
                Tapos na
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** Number of filters that narrow results beyond the basics. */
export const activeFilterCount = (f: ExploreFilters) =>
  (f.food_types.length ? 1 : 0) + (f.chains.length ? 1 : 0) + (f.avoid.length ? 1 : 0) + (f.max_distance_km !== null ? 1 : 0) + (f.open_only ? 0 : 1);

/** Full Filters sheet: edits a draft, shows a live count, applies on "Ipakita". */
export function FiltersSheet({
  open,
  onOpenChange,
  value,
  defaults,
  countFor,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: ExploreFilters;
  defaults: ExploreFilters;
  countFor: (f: ExploreFilters) => number;
  onApply: (f: ExploreFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    // Re-sync the draft whenever the applied filters change.
    setLastValue(value);
    setDraft(value);
  }
  const set = (p: Partial<ExploreFilters>) => setDraft((d) => ({ ...d, ...p }));
  const count = countFor(draft);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] max-w-[440px] flex-col rounded-t-[20px] px-0 pb-0">
        <SheetHeader className="px-5">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-6">
          <Group title="Budget"><Editor k="budget" f={draft} set={set} /></Group>
          <Group title="Ilan kayo"><Editor k="people" f={draft} set={set} /></Group>
          <Group title="Gutom level"><Editor k="hunger" f={draft} set={set} /></Group>
          <Group title="Bilis"><Editor k="urgency" f={draft} set={set} /></Group>
          <Group title="Max na layo"><Editor k="distance" f={draft} set={set} /></Group>
          <Group title="Klase ng pagkain"><Editor k="food" f={draft} set={set} /></Group>
          <Group title="Kainan"><Editor k="chains" f={draft} set={set} /></Group>
          <label className="flex min-h-11 items-center justify-between gap-4 rounded-[14px] border bg-card px-4">
            <span className="text-sm font-semibold">Bukas ngayon lang</span>
            <input
              type="checkbox"
              role="switch"
              checked={draft.open_only}
              onChange={(e) => set({ open_only: e.target.checked })}
              className="size-6 accent-[var(--primary)]"
            />
          </label>
          <Group title="Iwasan"><Editor k="avoid" f={draft} set={set} /></Group>
        </div>
        <div className="flex gap-2 border-t bg-background px-5 py-4">
          <Button variant="ghost" size="lg" className="h-12" onClick={() => setDraft(defaults)}>
            I-reset
          </Button>
          <Button
            size="lg"
            className="h-12 flex-1 text-base"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Ipakita ({count})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
