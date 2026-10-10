"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/app-data";
import { AppShell, SectionTitle } from "@/components/app-shell";
import { RatingButtons } from "@/components/rating";
import { EmptyNote } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniFoodCard } from "@/components/food";
import { CHAIN_COLORS, CHAIN_NAMES, catalog } from "@/lib/catalog";
import type { HistoryEntry } from "@/lib/store/history";
import { cn } from "@/lib/utils";
import { branchName } from "@/components/visuals";
import type { CatalogItem } from "@/lib/types";

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (diff === 0) return "Ngayong araw";
  if (diff === 1) return "Kahapon";
  return d.toLocaleDateString("fil-PH", { weekday: "long", month: "short", day: "numeric" });
}

function Carousel({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1">{children}</div>;
}

const itemsFromIds = (ids: string[]) => ids.map((id) => catalog.items.find((i) => i.id === id)).filter((i): i is CatalogItem => !!i);

export default function Kinain() {
  const router = useRouter();
  const { ready, history, openDetail } = useApp();

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((h) => (seen.has(h.item_ids.join("+")) ? false : (seen.add(h.item_ids.join("+")), true))).slice(0, 10);
  }, [history]);

  const groups = new Map<string, HistoryEntry[]>();
  for (const h of history) {
    const k = dayLabel(h.at);
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5 py-2">
        <h1 className="text-title">Kinain</h1>

        {/* Huling kinain mo section */}
        <section className="flex flex-col gap-3">
          <SectionTitle>Huling kinain mo</SectionTitle>
          {recent.length === 0 ? (
            <EmptyNote>Wala pa. Hanap na tayo!</EmptyNote>
          ) : (
            <Carousel>
              {recent.map((h) => {
                const items = itemsFromIds(h.item_ids);
                return items.length ? <MiniFoodCard key={h.id} items={items} sub={h.branch_name.replace(/\s*\(mock\)/gi, "")} /> : null;
              })}
            </Carousel>
          )}
        </section>

        {!ready ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 rounded-[24px]" />
            <Skeleton className="h-28 rounded-[24px]" />
          </div>
        ) : history.length === 0 ? (
          <EmptyNote>Wala ka pang kinain dito. Pag nag-&quot;Ito na!&quot; ka, lalabas dito.</EmptyNote>
        ) : (
          [...groups.entries()].map(([day, list]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-body font-semibold text-muted-foreground">{day}</h2>
              {list.map((h) => {
                const items = h.item_ids.map((id) => catalog.items.find((i) => i.id === id)).filter((i) => !!i);
                return (
                  <article key={h.id} className="flex flex-col gap-3 rounded-[24px] border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-semibold">{h.label}</span>
                        <span className="flex items-center gap-2 text-body text-muted-foreground">
                          <span className={cn("size-2.5 shrink-0 rounded-full", CHAIN_COLORS[h.chain])} aria-hidden />
                          <span className="truncate">{CHAIN_NAMES[h.chain]} · {branchName(h.branch_name)}</span>
                        </span>
                        <span className="text-meta text-muted-foreground">
                          {new Date(h.at).toLocaleTimeString("fil-PH", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <span className="shrink-0 text-title tabular-nums">₱{h.total}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <RatingButtons h={h} />
                      <Button variant="outline" className="h-11" disabled={!items.length} onClick={() => openDetail(items)}>
                        Kainin ulit
                      </Button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
