"use client";

import { Heart } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-data";
import { AppShell } from "@/components/app-shell";
import { BusogMeter, itemsLabel } from "@/components/food";
import { EmptyNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHAIN_COLORS, CHAIN_NAMES, catalog } from "@/lib/catalog";
import { branchesFor } from "@/lib/rank/explore";
import type { CatalogItem, ChainId } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Saved() {
  const router = useRouter();
  const { ready, saved, toggleItem, toggleChain, openDetail, confirm, place } = useApp();

  const nearestOpen = (chain: ChainId) => (place ? branchesFor(catalog, chain, place).find((b) => b.status.open) : undefined);

  return (
    <AppShell>
      <div className="flex flex-col gap-4 py-2">
        <h1 className="text-title">Saved</h1>
        {!ready ? (
          <Skeleton className="h-40 rounded-[24px]" />
        ) : (
          <Tabs defaultValue="food" className="gap-4">
            <TabsList className="h-11 w-full rounded-full">
              <TabsTrigger value="food" className="min-h-9 rounded-full">Pagkain ({saved.items.length})</TabsTrigger>
              <TabsTrigger value="chains" className="min-h-9 rounded-full">Kainan ({saved.chains.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="food" className="flex flex-col gap-3">
              {saved.items.length === 0 ? (
                <EmptyNote action={{ label: "Maghanap", onClick: () => router.push("/results?q=") }}>Wala pang naka-save. I-tap ang puso sa results para i-save ang pagkain.</EmptyNote>
              ) : (
                saved.items.map((key) => {
                  const items = key.split("+").map((id) => catalog.items.find((i) => i.id === id)).filter((i): i is CatalogItem => !!i);
                  if (!items.length) return null;
                  const total = items.reduce((s, i) => s + i.price, 0);
                  const b = nearestOpen(items[0].chain);
                  return (
                    <article key={key} className="flex flex-col gap-3 rounded-[24px] border bg-card p-4">
                      <div className="flex items-start gap-2">
                        <button type="button" onClick={() => openDetail(items)} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                          <span className="flex items-center gap-2 text-body">
                            <span className={cn("size-2.5 rounded-full", CHAIN_COLORS[items[0].chain])} aria-hidden />
                            {CHAIN_NAMES[items[0].chain]}
                          </span>
                          <span className="font-semibold">{itemsLabel(items)}</span>
                          <span className="flex items-center gap-3">
                            <span className="text-title tabular-nums">₱{total}</span>
                            <BusogMeter value={Math.min(5, items.reduce((s, i) => s + i.fill_score, 0))} />
                          </span>
                        </button>
                        <button type="button" aria-label="Tanggalin sa saved" onClick={() => toggleItem(key)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
                          <Heart size={22} weight="fill" className="text-brand" />
                        </button>
                      </div>
                      <Button className="h-11 self-start px-5" disabled={!b} onClick={() => b && confirm(items, b.branch, total)}>
                        {b ? `Ito na! · ${b.distance_km.toFixed(1)} km` : "Sarado ngayon"}
                      </Button>
                    </article>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="chains" className="flex flex-col gap-3">
              {(Object.keys(CHAIN_NAMES) as ChainId[]).map((c) => {
                const on = saved.chains.includes(c);
                const b = nearestOpen(c);
                return (
                  <article key={c} className="flex items-center gap-3 rounded-[24px] border bg-card p-4" style={{ borderLeft: `4px solid ${catalog.chains.find((x) => x.id === c)?.color}` }}>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{CHAIN_NAMES[c]}</span>
                      <span className="text-body text-muted-foreground">{b ? `Pinakamalapit: ${b.distance_km.toFixed(1)} km` : "Walang bukas na malapit"}</span>
                    </div>
                    {on && (
                      <Button variant="outline" className="h-11" onClick={() => router.push(`/results?q=${encodeURIComponent(CHAIN_NAMES[c])}`)}>
                        Ito na!
                      </Button>
                    )}
                    <button type="button" aria-pressed={on} aria-label={on ? `Tanggalin ang ${CHAIN_NAMES[c]}` : `I-save ang ${CHAIN_NAMES[c]}`} onClick={() => toggleChain(c)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted">
                      <Heart size={22} weight={on ? "fill" : "regular"} className={on ? "text-brand" : "text-muted-foreground"} />
                    </button>
                  </article>
                );
              })}
              {saved.chains.length === 0 && <p className="text-body text-muted-foreground">I-tap ang ♥ para i-save ang paborito mong kainan.</p>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
