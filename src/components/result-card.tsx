"use client";

import { ChevronDown, Clock, Footprints, MapPin, Navigation, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CHAIN_COLORS, CHAIN_NAMES } from "@/lib/catalog";
import { mapsUrl, travelMinutes } from "@/lib/rank/distance";
import type { CatalogItem, Result, SubScores } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "4× Chickenjoy" instead of listing the same item 4 times. */
export function itemsLabel(items: CatalogItem[]) {
  const m = new Map<string, { item: CatalogItem; qty: number }>();
  for (const i of items) m.set(i.id, { item: i, qty: (m.get(i.id)?.qty ?? 0) + 1 });
  return [...m.values()].map(({ item, qty }) => (qty > 1 ? `${qty}× ${item.name}` : item.name)).join(" + ");
}

const WIN_LABELS: Record<keyof SubScores, string> = {
  cheap: "Pinakamura",
  filling: "Pinakabusog",
  near: "Pinakamalapit",
  fast: "Pinakamabilis",
  taste: "Swak sa panlasa",
};

/** Which sub-scores each result wins among the shown results (presentation only). */
export function winsFor(results: Result[]): string[][] {
  return results.map((r) =>
    (Object.keys(WIN_LABELS) as (keyof SubScores)[])
      .filter((k) => r.sub[k] > 0 && results.every((o) => o.sub[k] <= r.sub[k]))
      .map((k) => WIN_LABELS[k]),
  );
}

const times = (r: Result) => {
  const walk = Math.max(1, Math.round(travelMinutes(r.distance_km)));
  return { walk, queue: Math.max(1, r.eta_min - walk) };
};

function ChainLine({ r, badge }: { r: Result; badge?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn("size-2.5 shrink-0 rounded-full", CHAIN_COLORS[r.branch.chain])} aria-hidden />
      <span className="shrink-0 text-sm font-semibold">{CHAIN_NAMES[r.branch.chain]}</span>
      <span className="truncate text-sm text-muted-foreground">{r.branch.name}</span>
      {badge}
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <p className="flex gap-2 rounded-[14px] bg-primary-soft p-3 text-sm">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

export function ResultCard({
  r,
  best,
  onPick,
  wins = [],
  onOtherBranch,
}: {
  r: Result;
  best: boolean;
  onPick: (r: Result) => void;
  wins?: string[];
  onOtherBranch?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { walk, queue } = times(r);

  if (best)
    return (
      <article className="flex flex-col gap-4 rounded-[20px] border bg-card p-5 shadow-[var(--shadow-raised)]" aria-label="Best pick">
        <ChainLine r={r} badge={<span className="ml-auto shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">Best pick</span>} />
        <div className="flex flex-col gap-1">
          <h3 className="text-xl leading-snug">{itemsLabel(r.items)}</h3>
          <p className="text-4xl font-bold tabular-nums">₱{r.total}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Footprints className="size-5" aria-hidden />Lakad {walk} min</span>
          <span className="flex items-center gap-1.5"><Clock className="size-5" aria-hidden />Pila ~{queue} min</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-5" aria-hidden />{r.distance_km.toFixed(1)} km</span>
        </div>
        {wins.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {wins.map((w) => (
              <span key={w} className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-[#1f7a52]">
                {w}
              </span>
            ))}
          </div>
        )}
        <Reason text={r.reason} />
        <div className="flex flex-col gap-1">
          <Button size="lg" className="h-12 w-full text-base" onClick={() => onPick(r)}>
            Ito na!
          </Button>
          {onOtherBranch && (
            <Button variant="ghost" className="h-11 text-sm" onClick={onOtherBranch}>
              Ibang branch
            </Button>
          )}
        </div>
      </article>
    );

  return (
    <article className="rounded-[20px] border bg-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-col gap-1.5 p-4 text-left">
        <ChainLine r={r} badge={<ChevronDown className={cn("ml-auto size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />} />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{itemsLabel(r.items)}</span>
          <span className="shrink-0 text-lg font-bold tabular-nums">₱{r.total}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {r.distance_km.toFixed(1)} km · ~{r.eta_min} min
        </span>
        {!open && <span className="line-clamp-1 text-sm">{r.reason}</span>}
      </button>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {open && (
          <>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Footprints className="size-5" aria-hidden />Lakad {walk} min</span>
              <span className="flex items-center gap-1.5"><Clock className="size-5" aria-hidden />Pila ~{queue} min</span>
            </div>
            {wins.length > 0 && <p className="text-xs font-semibold text-[#1f7a52]">{wins.join(" · ")}</p>}
            <Reason text={r.reason} />
          </>
        )}
        <Button variant="outline" className="h-11 self-start px-5" onClick={() => onPick(r)}>
          Ito na!
        </Button>
      </div>
    </article>
  );
}

/** Confirmation after "Ito na!": item, branch, open in Maps. */
export function PickSheet({ r, onClose }: { r: Result | null; onClose: () => void }) {
  return (
    <Sheet open={r !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
        {r && (
          <>
            <SheetHeader className="px-0">
              <SheetTitle className="text-xl">{itemsLabel(r.items)}</SheetTitle>
              <SheetDescription>
                {CHAIN_NAMES[r.branch.chain]} · {r.branch.name}
              </SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-between rounded-[14px] border bg-card p-4">
              <span className="text-3xl font-bold tabular-nums">₱{r.total}</span>
              <span className="text-sm text-muted-foreground">
                {r.distance_km.toFixed(1)} km · ~{r.eta_min} min
              </span>
            </div>
            <a
              href={mapsUrl(r.branch)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Navigation className="size-5" aria-hidden /> Buksan sa Maps
            </a>
            <p className="text-center text-xs text-muted-foreground">Kailangan ng internet para sa directions.</p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
