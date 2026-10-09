"use client";

import { Minus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { SelectChip } from "@/components/select-tile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { CHAIN_NAMES } from "@/lib/catalog";
import type { ResolvedFilters } from "@/lib/parse/validate";
import type { Level } from "@/lib/types";

const HUNGER: Record<Level, string> = { low: "Konting gutom", normal: "Sakto gutom", high: "Gutom na gutom" };
const URGENCY: Record<Level, string> = { low: "Chill lang", normal: "Normal bilis", high: "Bilisan!" };
const AVOID_LABELS: Record<string, string> = { pork: "baboy", beef: "baka", seafood: "seafood", spicy: "maanghang" };
const LEVELS: Level[] = ["low", "normal", "high"];

export type FilterKey = "budget" | "people" | "hunger" | "urgency" | "distance" | "avoid" | "cravings" | "chains";

/** "Na-intindi ko" bar: parsed filters as chips; tap one to edit in a sheet (SPEC §4.3 step 4). */
export function FilterChips({
  f,
  onChange,
  fromSetup = new Set(),
}: {
  f: ResolvedFilters;
  onChange: (f: ResolvedFilters) => void;
  fromSetup?: Set<FilterKey>;
}) {
  const [editing, setEditing] = useState<FilterKey | null>(null);
  const set = (patch: Partial<ResolvedFilters>) => onChange({ ...f, ...patch });

  const chips: { key: FilterKey; label: string }[] = [
    { key: "budget", label: `₱${f.budget}` },
    { key: "people", label: `${f.people} ${f.people === 1 ? "tao" : "katao"}` },
    { key: "hunger", label: HUNGER[f.hunger] },
    { key: "urgency", label: URGENCY[f.urgency] },
    { key: "distance", label: f.max_distance_km ? `≤ ${f.max_distance_km} km` : "Kahit gaano kalayo" },
    ...(f.avoid.length ? [{ key: "avoid" as const, label: `Iwas: ${f.avoid.map((a) => AVOID_LABELS[a] ?? a).join(", ")}` }] : []),
    ...(f.cravings.length ? [{ key: "cravings" as const, label: `Gusto: ${f.cravings.join(", ")}` }] : []),
    ...(f.chains.length ? [{ key: "chains" as const, label: f.chains.map((c) => CHAIN_NAMES[c]).join(", ") }] : []),
  ];

  const stepper = (value: string, dec: () => void, inc: () => void, what: string) => (
    <div className="flex items-center justify-between rounded-[14px] border bg-card p-2">
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Bawasan ${what}`} onClick={dec}>
        <Minus className="size-5" />
      </Button>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Dagdagan ${what}`} onClick={inc}>
        <Plus className="size-5" />
      </Button>
    </div>
  );

  const editor: Record<FilterKey, { title: string; body: React.ReactNode }> = {
    budget: {
      title: "Budget",
      body: (
        <div className="flex flex-col gap-6">
          {stepper(`₱${f.budget}`, () => set({ budget: Math.max(50, f.budget - 10) }), () => set({ budget: f.budget + 10 }), "budget")}
          <Slider min={50} max={Math.max(1000, f.budget)} step={10} value={[f.budget]} onValueChange={(v) => set({ budget: Array.isArray(v) ? v[0] : v })} aria-label="Budget" />
        </div>
      ),
    },
    people: {
      title: "Ilan kayo?",
      body: stepper(String(f.people), () => set({ people: Math.max(1, f.people - 1) }), () => set({ people: Math.min(20, f.people + 1) }), "tao"),
    },
    hunger: {
      title: "Gaano kagutom?",
      body: (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <SelectChip key={l} on={f.hunger === l} onClick={() => set({ hunger: l })}>
              {HUNGER[l]}
            </SelectChip>
          ))}
        </div>
      ),
    },
    urgency: {
      title: "Gaano kabilis?",
      body: (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <SelectChip key={l} on={f.urgency === l} onClick={() => set({ urgency: l })}>
              {URGENCY[l]}
            </SelectChip>
          ))}
        </div>
      ),
    },
    distance: {
      title: "Gaano kalayo?",
      body: (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 5].map((km) => (
            <SelectChip key={km} on={f.max_distance_km === km} onClick={() => set({ max_distance_km: km })}>
              ≤ {km} km
            </SelectChip>
          ))}
          <SelectChip on={f.max_distance_km === null} onClick={() => set({ max_distance_km: null })}>
            Kahit gaano
          </SelectChip>
        </div>
      ),
    },
    avoid: {
      title: "Iniiwasan",
      body: (
        <div className="flex flex-wrap gap-2">
          {[...new Set([...Object.keys(AVOID_LABELS), ...f.avoid])].map((a) => (
            <SelectChip key={a} on={f.avoid.includes(a)} onClick={() => set({ avoid: f.avoid.includes(a) ? f.avoid.filter((x) => x !== a) : [...f.avoid, a] })}>
              {AVOID_LABELS[a] ?? a}
            </SelectChip>
          ))}
        </div>
      ),
    },
    cravings: {
      title: "Gusto mo",
      body: (
        <div className="flex flex-wrap gap-2">
          {f.cravings.map((c) => (
            <SelectChip key={c} on onClick={() => set({ cravings: f.cravings.filter((x) => x !== c) })}>
              {c}
            </SelectChip>
          ))}
          <p className="w-full text-sm text-muted-foreground">I-tap para tanggalin.</p>
        </div>
      ),
    },
    chains: {
      title: "Kainan",
      body: (
        <div className="flex flex-wrap gap-2">
          {f.chains.map((c) => (
            <SelectChip key={c} on onClick={() => set({ chains: f.chains.filter((x) => x !== c) })}>
              {CHAIN_NAMES[c]}
            </SelectChip>
          ))}
          <p className="w-full text-sm text-muted-foreground">I-tap para tanggalin.</p>
        </div>
      ),
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Na-intindi ko</p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setEditing(c.key)}
            aria-label={`Palitan: ${c.label}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold hover:border-brand/50"
          >
            {c.label}
            {fromSetup.has(c.key) && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">setup</span>}
            <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
          {editing && (
            <>
              <SheetHeader className="px-0">
                <SheetTitle>{editor[editing].title}</SheetTitle>
              </SheetHeader>
              {editor[editing].body}
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
