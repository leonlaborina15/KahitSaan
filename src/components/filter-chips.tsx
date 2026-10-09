"use client";

import { Minus, PencilSimple, Plus, Sparkle, X } from "@phosphor-icons/react";
import { useState } from "react";
import { SelectChip } from "@/components/select-tile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { CHAIN_NAMES, catalog } from "@/lib/catalog";
import type { ExploreFilters, UnahinKey } from "@/lib/rank/explore";
import type { ChainId, Level } from "@/lib/types";
import { cn } from "@/lib/utils";

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
const UNAHIN: { id: UnahinKey; label: string }[] = [
  { id: "cheap", label: "Mura" },
  { id: "near", label: "Malapit" },
  { id: "filling", label: "Busog" },
  { id: "fast", label: "Mabilis" },
  { id: "taste", label: "Swak sa panlasa" },
];
const DISTANCES = [0.5, 1, 2, 5];
const LEVELS: Level[] = ["low", "normal", "high"];
const foodLabel = (t: string) => FOOD_TYPES.find((x) => x.id === t)?.label ?? t;
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

type Set_ = (p: Partial<ExploreFilters>) => void;
type BasicKey = "budget" | "people" | "hunger" | "urgency";

function Stepper({ value, dec, inc, what }: { value: string; dec: () => void; inc: () => void; what: string }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border bg-card p-1.5">
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Bawasan ${what}`} onClick={dec}>
        <Minus size={20} />
      </Button>
      <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Dagdagan ${what}`} onClick={inc}>
        <Plus size={20} />
      </Button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function BudgetEditor({ f, set }: { f: ExploreFilters; set: Set_ }) {
  const [perPerson, setPerPerson] = useState(false);
  const shown = perPerson ? Math.round(f.budget / f.people) : f.budget;
  const apply = (v: number) => set({ budget: perPerson ? v * f.people : v });
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="text-center font-display text-4xl font-extrabold tabular-nums">₱{shown}</div>
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

function BasicEditor({ k, f, set }: { k: BasicKey; f: ExploreFilters; set: Set_ }) {
  if (k === "budget") return <BudgetEditor f={f} set={set} />;
  if (k === "people")
    return (
      <div className="w-full">
        <Stepper value={`${f.people} ${f.people === 1 ? "tao" : "katao"}`} what="tao" dec={() => set({ people: Math.max(1, f.people - 1) })} inc={() => set({ people: Math.min(20, f.people + 1) })} />
      </div>
    );
  const labels = k === "hunger" ? HUNGER : URGENCY;
  return (
    <>
      {LEVELS.map((l) => (
        <SelectChip key={l} on={f[k] === l} onClick={() => set({ [k]: l })}>{labels[l]}</SelectChip>
      ))}
    </>
  );
}

const BASIC_TITLES: Record<BasicKey, string> = { budget: "Budget", people: "Ilan kayo?", hunger: "Gaano kagutom?", urgency: "Gaano kabilis?" };

/** "Na-intindi ko" (ube = AI): what the request was understood as. Tap a chip to edit. */
export function UnderstoodChips({ f, set, fromSetup }: { f: ExploreFilters; set: Set_; fromSetup: Set<string> }) {
  const [editing, setEditing] = useState<BasicKey | null>(null);
  const chips: { key: BasicKey; label: string }[] = [
    { key: "budget", label: `₱${f.budget}` },
    { key: "people", label: `${f.people} ${f.people === 1 ? "tao" : "katao"}` },
    { key: "hunger", label: HUNGER[f.hunger] },
    { key: "urgency", label: URGENCY[f.urgency] },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ube">
        <Sparkle size={14} weight="fill" aria-hidden /> Na-intindi ko
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setEditing(c.key)}
            aria-label={`Palitan: ${c.label}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ube/25 bg-ube-soft px-4 text-sm font-semibold text-foreground"
          >
            {c.label}
            {fromSetup.has(c.key) && <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">setup</span>}
            <PencilSimple size={14} className="text-ube" aria-hidden />
          </button>
        ))}
      </div>
      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[28px] px-5 pb-8">
          {editing && (
            <>
              <SheetHeader className="px-0">
                <SheetTitle className="font-display text-xl">{BASIC_TITLES[editing]}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-wrap gap-2">
                <BasicEditor k={editing} f={f} set={set} />
              </div>
              <Button size="lg" className="mt-4 h-12 w-full text-base" onClick={() => setEditing(null)}>Tapos na</Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** "Unahin": ordered multi-select. Tap order = ranking weight order. */
export function UnahinRow({ f, set, isSetup }: { f: ExploreFilters; set: Set_; isSetup: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Unahin {isSetup && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case">setup</span>}
      </p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {UNAHIN.map((u) => {
          const rank = f.unahin.indexOf(u.id);
          return (
            <SelectChip key={u.id} on={rank >= 0} rank={rank >= 0 ? rank + 1 : undefined} onClick={() => set({ unahin: toggle(f.unahin, u.id) })}>
              {u.label}
            </SelectChip>
          );
        })}
      </div>
    </div>
  );
}

const QUICK: { id: string; label: string; on: (f: ExploreFilters) => boolean; flip: (f: ExploreFilters) => Partial<ExploreFilters> }[] = [
  { id: "open", label: "Bukas ngayon", on: (f) => f.open_only, flip: (f) => ({ open_only: !f.open_only }) },
  { id: "1km", label: "1 km lang", on: (f) => f.max_distance_km === 1, flip: (f) => ({ max_distance_km: f.max_distance_km === 1 ? null : 1 }) },
  { id: "100", label: "₱100 pababa", on: (f) => f.max_total === 100, flip: (f) => ({ max_total: f.max_total === 100 ? null : 100 }) },
  { id: "rice", label: "Rice meal", on: (f) => f.food_types.includes("rice"), flip: (f) => ({ food_types: toggle(f.food_types, "rice") }) },
  { id: "chicken", label: "Chicken", on: (f) => f.food_types.includes("chicken"), flip: (f) => ({ food_types: toggle(f.food_types, "chicken") }) },
  { id: "fast", label: "Walang pila", on: (f) => f.fast_only, flip: (f) => ({ fast_only: !f.fast_only }) },
];

export const QUICK_IDS = QUICK.map((q) => q.id);
/** Apply quick filters by id (used for ?quick= links). */
export function applyQuick(f: ExploreFilters, ids: string[]): ExploreFilters {
  return ids.reduce((acc, id) => {
    const q = QUICK.find((x) => x.id === id);
    return q && !q.on(acc) ? { ...acc, ...q.flip(acc) } : acc;
  }, f);
}

export function QuickFilters({ f, set }: { f: ExploreFilters; set: Set_ }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Quick filters">
      {QUICK.map((q) => (
        <SelectChip key={q.id} on={q.on(f)} onClick={() => set(q.flip(f))}>{q.label}</SelectChip>
      ))}
    </div>
  );
}

/** Chain chips tinted in each chain's own color (Jollibee red, McDo yellow, MI green). */
export function ChainFilters({ f, set }: { f: ExploreFilters; set: Set_ }) {
  if (!catalog.chains.length) return null;
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Kainan">
      {catalog.chains.map((c) => {
        const on = f.chains.includes(c.id as ChainId);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => set({ chains: toggle(f.chains, c.id as ChainId) })}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
              on ? "border-transparent" : "bg-card hover:border-brand/50",
            )}
            style={on ? { background: `${c.color}33`, boxShadow: `inset 0 0 0 1.5px ${c.color}` } : undefined}
          >
            <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

/** Every narrowing filter as a removable chip. */
export function activeFilters(f: ExploreFilters, fromSetup: Set<string>): { id: string; label: string; tag?: string; clear: Partial<ExploreFilters> }[] {
  const out: { id: string; label: string; tag?: string; clear: Partial<ExploreFilters> }[] = [];
  if (f.open_only) out.push({ id: "open", label: "Bukas ngayon", clear: { open_only: false } });
  if (f.max_distance_km !== null) out.push({ id: "km", label: `≤ ${f.max_distance_km} km`, clear: { max_distance_km: null } });
  if (f.max_total !== null) out.push({ id: "max", label: `₱${f.max_total} pababa`, clear: { max_total: null } });
  if (f.fast_only) out.push({ id: "fast", label: "Walang pila", clear: { fast_only: false } });
  for (const t of f.food_types) out.push({ id: `food-${t}`, label: foodLabel(t), clear: { food_types: f.food_types.filter((x) => x !== t) } });
  for (const c of f.chains) out.push({ id: `chain-${c}`, label: CHAIN_NAMES[c], clear: { chains: f.chains.filter((x) => x !== c) } });
  for (const a of f.avoid)
    out.push({ id: `avoid-${a}`, label: `Iwas: ${AVOID_LABELS[a] ?? a}`, tag: fromSetup.has("avoid") ? "setup" : undefined, clear: { avoid: f.avoid.filter((x) => x !== a) } });
  return out;
}

export const CLEARED: Partial<ExploreFilters> = { open_only: false, max_distance_km: null, max_total: null, fast_only: false, food_types: [], chains: [], avoid: [] };

export function ActiveFilterBar({ f, set, fromSetup }: { f: ExploreFilters; set: Set_; fromSetup: Set<string> }) {
  const list = activeFilters(f, fromSetup);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Mga aktibong filter">
      {list.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => set(a.clear)}
          aria-label={`Alisin: ${a.label}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background"
        >
          {a.label}
          {a.tag && <span className="rounded-full bg-background/20 px-1.5 text-[10px]">{a.tag}</span>}
          <X size={12} weight="bold" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={() => set(CLEARED)} className="min-h-9 px-2 text-xs font-semibold text-primary underline">
        I-clear lahat
      </button>
    </div>
  );
}

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
    setLastValue(value);
    setDraft(value);
  }
  const set: Set_ = (p) => setDraft((d) => ({ ...d, ...p }));
  const count = countFor(draft);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] max-w-[440px] flex-col rounded-t-[28px] px-0 pb-0">
        <SheetHeader className="px-5">
          <SheetTitle className="font-display text-xl">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-6">
          <Group title="Budget"><BudgetEditor f={draft} set={set} /></Group>
          <Group title="Ilan kayo"><BasicEditor k="people" f={draft} set={set} /></Group>
          <Group title="Gutom level"><BasicEditor k="hunger" f={draft} set={set} /></Group>
          <Group title="Bilis"><BasicEditor k="urgency" f={draft} set={set} /></Group>
          <Group title="Max na layo">
            {DISTANCES.map((km) => (
              <SelectChip key={km} on={draft.max_distance_km === km} onClick={() => set({ max_distance_km: draft.max_distance_km === km ? null : km })}>{km} km</SelectChip>
            ))}
          </Group>
          <Group title="Klase ng pagkain">
            {FOOD_TYPES.map((t) => (
              <SelectChip key={t.id} on={draft.food_types.includes(t.id)} onClick={() => set({ food_types: toggle(draft.food_types, t.id) })}>{t.label}</SelectChip>
            ))}
          </Group>
          <Group title="Kainan">
            {(Object.keys(CHAIN_NAMES) as ChainId[]).map((c) => (
              <SelectChip key={c} on={draft.chains.includes(c)} onClick={() => set({ chains: toggle(draft.chains, c) })}>{CHAIN_NAMES[c]}</SelectChip>
            ))}
          </Group>
          <Group title="Iba pa">
            <SelectChip on={draft.open_only} onClick={() => set({ open_only: !draft.open_only })}>Bukas ngayon lang</SelectChip>
            <SelectChip on={draft.fast_only} onClick={() => set({ fast_only: !draft.fast_only })}>Walang pila</SelectChip>
          </Group>
          <Group title="Iwasan">
            {[...new Set([...Object.keys(AVOID_LABELS), ...draft.avoid])].map((a) => (
              <SelectChip key={a} on={draft.avoid.includes(a)} onClick={() => set({ avoid: toggle(draft.avoid, a) })}>{AVOID_LABELS[a] ?? a}</SelectChip>
            ))}
          </Group>
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
