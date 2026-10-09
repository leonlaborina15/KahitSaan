"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHAIN_COLORS, CHAIN_NAMES } from "@/lib/catalog";
import { mapsUrl } from "@/lib/rank/distance";
import type { CatalogItem, Result } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "4× Chickenjoy" instead of listing the same item 4 times. */
function groupItems(items: CatalogItem[]) {
  const m = new Map<string, { item: CatalogItem; qty: number }>();
  for (const i of items) m.set(i.id, { item: i, qty: (m.get(i.id)?.qty ?? 0) + 1 });
  return [...m.values()];
}

export function ResultCard({ r, best, onPick }: { r: Result; best: boolean; onPick: (r: Result) => void }) {
  const [picked, setPicked] = useState(false);
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", best && "border-primary border-2 p-5 shadow-sm")}>
      <div className="flex items-center gap-2">
        <span className={cn("size-3 rounded-full", CHAIN_COLORS[r.branch.chain])} />
        <span className="text-sm font-medium">{CHAIN_NAMES[r.branch.chain]}</span>
        <span className="truncate text-xs text-muted-foreground">· {r.branch.name}</span>
      </div>
      <ul className={cn("font-semibold", best ? "text-xl" : "text-base")}>
        {groupItems(r.items).map(({ item, qty }) => (
          <li key={item.id}>
            {qty > 1 && `${qty}× `}
            {item.name}
          </li>
        ))}
      </ul>
      <div className="flex gap-4 text-sm">
        <span className={cn("font-bold", best ? "text-2xl" : "text-lg")}>₱{r.total}</span>
        <span className="self-end text-muted-foreground">{r.distance_km.toFixed(1)} km</span>
        <span className="self-end text-muted-foreground">~{r.eta_min} min</span>
      </div>
      <p className="text-sm italic">{r.reason}</p>
      {picked ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Noted! Mas kilala na kita.</span>
          <a href={mapsUrl(r.branch)} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
            Paano pumunta
          </a>
        </div>
      ) : (
        <Button
          size="lg"
          variant={best ? "default" : "outline"}
          className="h-11"
          onClick={() => {
            setPicked(true);
            onPick(r);
          }}
        >
          Ito na!
        </Button>
      )}
    </div>
  );
}
