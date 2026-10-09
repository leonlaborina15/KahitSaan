"use client";

import { CHAIN_COLORS, catalog } from "@/lib/catalog";
import type { TasteProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecentPicks({ taste, onTap }: { taste: TasteProfile | null; onTap: (name: string) => void }) {
  const items = (taste?.recent_picks ?? []).map((id) => catalog.items.find((i) => i.id === id)).filter((i) => !!i);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base">Huling kinain mo</h2>
      {items.length === 0 ? (
        <p className="rounded-[20px] border border-dashed bg-card p-4 text-sm text-muted-foreground">Wala pa. Hanap na tayo!</p>
      ) : (
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
          {items.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onTap(i.name)}
              className="flex w-36 shrink-0 flex-col gap-2 rounded-[20px] border bg-card p-3 text-left hover:border-brand/50"
            >
              <span className={cn("size-2.5 rounded-full", CHAIN_COLORS[i.chain])} aria-hidden />
              <span className="line-clamp-2 text-sm font-semibold">{i.name}</span>
              <span className="text-sm text-muted-foreground">₱{i.price}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
