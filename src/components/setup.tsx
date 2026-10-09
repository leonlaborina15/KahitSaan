"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAIN_NAMES } from "@/lib/catalog";
import { DEFAULT_PREFS } from "@/lib/store/db";
import type { ChainId, Prefs, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const BUDGETS = [100, 150, 200, 300];
const FOODS = ["chicken", "burger", "spaghetti", "rice", "noodles", "sisig", "siopao", "halo-halo", "fries", "fish"];
const DISLIKES = ["seafood", "beef", "spicy"];
const APPETITES: { id: Prefs["appetite"]; label: string; sub: string }[] = [
  { id: "light", label: "Light eater", sub: "Konti lang, busog na" },
  { id: "normal", label: "Sakto lang", sub: "Normal na kain" },
  { id: "big", label: "Malakas kumain", sub: "Laging gutom" },
];
const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "cheap", label: "Mura" },
  { id: "fast", label: "Mabilis" },
  { id: "near", label: "Malapit" },
  { id: "filling", label: "Busog" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function Setup({ onDone }: { onDone: (p: Prefs) => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Prefs>({ ...DEFAULT_PREFS, priority: [] });
  const [custom, setCustom] = useState("");
  const update = (patch: Partial<Prefs>) => setP((prev) => ({ ...prev, ...patch }));

  const finish = (prefs: Prefs) => {
    // Unranked priorities go last in default order.
    const rest = DEFAULT_PREFS.priority.filter((x) => !prefs.priority.includes(x));
    onDone({ ...prefs, priority: [...prefs.priority, ...rest], created_at: new Date().toISOString() });
  };

  const steps = [
    {
      title: "Magkano usually budget mo?",
      body: (
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => (
            <Chip key={b} on={p.usual_budget === b && !custom} onClick={() => (setCustom(""), update({ usual_budget: b }))}>
              ₱{b}
            </Chip>
          ))}
          <input
            inputMode="numeric"
            placeholder="Iba pa ₱"
            value={custom}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              setCustom(v);
              if (Number(v) > 0) update({ usual_budget: Number(v) });
            }}
            className="min-h-11 w-28 rounded-full border px-4 text-sm"
          />
        </div>
      ),
    },
    {
      title: "Ano'ng hilig mo?",
      body: (
        <div className="flex flex-wrap gap-2">
          {FOODS.map((f) => (
            <Chip key={f} on={p.favorite_foods.includes(f)} onClick={() => update({ favorite_foods: toggle(p.favorite_foods, f) })}>
              {f}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Ano'ng ayaw mo?",
      body: (
        <div className="flex flex-wrap gap-2">
          <Chip on={p.avoid_pork} onClick={() => update({ avoid_pork: !p.avoid_pork })}>
            bawal baboy
          </Chip>
          {DISLIKES.map((d) => (
            <Chip key={d} on={p.dislikes.includes(d)} onClick={() => update({ dislikes: toggle(p.dislikes, d) })}>
              {d}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Gaano ka kalakas kumain?",
      body: (
        <div className="grid gap-2">
          {APPETITES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => update({ appetite: a.id })}
              className={cn("rounded-xl border p-4 text-left", p.appetite === a.id && "border-primary bg-primary/10")}
            >
              <div className="font-semibold">{a.label}</div>
              <div className="text-sm text-muted-foreground">{a.sub}</div>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "I-tap ayon sa importansya",
      hint: "Una mong i-tap = pinaka-importante",
      body: (
        <div className="grid grid-cols-2 gap-2">
          {PRIORITIES.map((x) => {
            const rank = p.priority.indexOf(x.id);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => update({ priority: toggle(p.priority, x.id) })}
                className={cn("relative min-h-16 rounded-xl border p-4 font-semibold", rank >= 0 && "border-primary bg-primary/10")}
              >
                {x.label}
                {rank >= 0 && (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {rank + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Favorite mong kainan?",
      body: (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHAIN_NAMES) as ChainId[]).map((c) => (
            <Chip key={c} on={p.favorite_chains.includes(c)} onClick={() => update({ favorite_chains: toggle(p.favorite_chains, c) })}>
              {CHAIN_NAMES[c]}
            </Chip>
          ))}
        </div>
      ),
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="flex min-h-[80vh] flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn("h-1.5 w-6 rounded-full bg-muted", i <= step && "bg-primary")} />
          ))}
        </div>
        <button type="button" onClick={() => finish({ ...DEFAULT_PREFS, ...p })} className="text-sm text-muted-foreground underline">
          Laktawan
        </button>
      </div>
      {step === 0 && <p className="text-lg">Tara, kain tayo! 30 seconds lang &apos;to.</p>}
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{s.title}</h2>
        {"hint" in s && <p className="text-sm text-muted-foreground">{s.hint}</p>}
        {s.body}
      </div>
      <div className="mt-auto flex gap-2">
        {step > 0 && (
          <Button variant="outline" size="lg" className="h-12" onClick={() => setStep(step - 1)}>
            Balik
          </Button>
        )}
        <Button size="lg" className="h-12 flex-1" onClick={() => (last ? finish(p) : setStep(step + 1))}>
          {last ? "Game na!" : "Next"}
        </Button>
      </div>
    </div>
  );
}
