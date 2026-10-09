"use client";

import { CHAIN_NAMES } from "@/lib/catalog";
import type { ResolvedFilters } from "@/lib/parse/validate";
import type { Level } from "@/lib/types";

const NEXT: Record<Level, Level> = { low: "normal", normal: "high", high: "low" };
const HUNGER: Record<Level, string> = { low: "Konting gutom", normal: "Sakto gutom", high: "Gutom na gutom" };
const URGENCY: Record<Level, string> = { low: "Chill lang", normal: "Normal bilis", high: "Bilisan!" };

function Chip({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="min-h-9 rounded-full border bg-background px-3 text-sm hover:bg-muted"
    >
      {children}
    </button>
  );
}

/** Parsed filters as one-tap-editable chips (SPEC §4.3 step 4). */
export function FilterChips({ f, onChange }: { f: ResolvedFilters; onChange: (f: ResolvedFilters) => void }) {
  const set = (patch: Partial<ResolvedFilters>) => onChange({ ...f, ...patch });
  const drop = (key: "cravings" | "avoid" | "chains", v: string) => set({ [key]: (f[key] as string[]).filter((x) => x !== v) });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-full border">
        <button type="button" aria-label="Bawasan budget" className="min-h-9 px-3" onClick={() => set({ budget: Math.max(50, f.budget - 50) })}>
          −
        </button>
        <span className="text-sm font-semibold">₱{f.budget}</span>
        <button type="button" aria-label="Dagdagan budget" className="min-h-9 px-3" onClick={() => set({ budget: f.budget + 50 })}>
          +
        </button>
      </div>
      <div className="flex items-center rounded-full border">
        <button type="button" aria-label="Bawasan tao" className="min-h-9 px-3" onClick={() => set({ people: Math.max(1, f.people - 1) })}>
          −
        </button>
        <span className="text-sm">{f.people} tao</span>
        <button type="button" aria-label="Dagdagan tao" className="min-h-9 px-3" onClick={() => set({ people: f.people + 1 })}>
          +
        </button>
      </div>
      <Chip label="Palitan gutom" onClick={() => set({ hunger: NEXT[f.hunger] })}>
        {HUNGER[f.hunger]}
      </Chip>
      <Chip label="Palitan bilis" onClick={() => set({ urgency: NEXT[f.urgency] })}>
        {URGENCY[f.urgency]}
      </Chip>
      <Chip label="Palitan layo" onClick={() => set({ max_distance_km: f.max_distance_km ? null : 1 })}>
        {f.max_distance_km ? `≤ ${f.max_distance_km} km` : "Kahit saan"}
      </Chip>
      {f.cravings.map((c) => (
        <Chip key={c} label={`Tanggalin ${c}`} onClick={() => drop("cravings", c)}>
          ♥ {c} ✕
        </Chip>
      ))}
      {f.avoid.map((a) => (
        <Chip key={a} label={`Tanggalin iwas ${a}`} onClick={() => drop("avoid", a)}>
          🚫 {a} ✕
        </Chip>
      ))}
      {f.chains.map((c) => (
        <Chip key={c} label={`Tanggalin ${c}`} onClick={() => drop("chains", c)}>
          {CHAIN_NAMES[c]} ✕
        </Chip>
      ))}
    </div>
  );
}
