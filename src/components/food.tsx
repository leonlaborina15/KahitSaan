"use client";

import { Clock, Footprints, Heart, MapPin, Navigation, Soup, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CHAIN_COLORS, CHAIN_NAMES, catalog } from "@/lib/catalog";
import { mapsUrl } from "@/lib/rank/distance";
import { branchesFor, comboKey, type BranchOption, type ItemResult, type Speed } from "@/lib/rank/explore";
import type { CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "4× Chickenjoy + Coke" */
export function itemsLabel(items: CatalogItem[]) {
  const m = new Map<string, { item: CatalogItem; qty: number }>();
  for (const i of items) m.set(i.id, { item: i, qty: (m.get(i.id)?.qty ?? 0) + 1 });
  return [...m.values()].map(({ item, qty }) => (qty > 1 ? `${qty}× ${item.name}` : item.name)).join(" + ");
}

export function BusogMeter({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`Busog meter ${value} sa 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Soup key={n} className={cn(size === "md" ? "size-5" : "size-4", n <= value ? "text-brand" : "text-border")} aria-hidden />
      ))}
    </span>
  );
}

const SPEED: Record<Speed, { label: string; cls: string }> = {
  fast: { label: "Usually mabilis", cls: "bg-success/12 text-[#1f7a52]" },
  ok: { label: "Sakto", cls: "bg-muted text-foreground" },
  slow: { label: "Usually matagal", cls: "bg-warning/20 text-[#8a5a12]" },
};

export function WaitLabel({ o }: { o: Pick<BranchOption, "speed" | "wait_min" | "peak"> }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", SPEED[o.speed].cls)}>
        <Clock className="size-3.5" aria-hidden /> ~{o.wait_min} min · {SPEED[o.speed].label}
      </span>
      {o.peak && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-[#8a5a12]">Peak ngayon</span>}
    </span>
  );
}

export function OpenLabel({ o }: { o: Pick<BranchOption, "status"> }) {
  return (
    <span className={cn("text-xs font-medium", !o.status.open ? "text-destructive" : o.status.closingSoon ? "text-[#8a5a12]" : "text-[#1f7a52]")}>
      {o.status.label}
    </span>
  );
}

function SaveButton({ items }: { items: CatalogItem[] }) {
  const { saved, toggleItem } = useApp();
  const key = comboKey(items);
  const on = saved.items.includes(key);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleItem(key);
      }}
      aria-label={on ? "Tanggalin sa saved" : "I-save"}
      aria-pressed={on}
      className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
    >
      <Heart className={cn("size-5", on ? "fill-brand text-brand" : "text-muted-foreground")} />
    </button>
  );
}

function ChainLine({ chain, branch }: { chain: CatalogItem["chain"]; branch?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className={cn("size-2.5 shrink-0 rounded-full", CHAIN_COLORS[chain])} aria-hidden />
      <span className="shrink-0 font-semibold">{CHAIN_NAMES[chain]}</span>
      {branch && <span className="truncate text-muted-foreground">{branch}</span>}
    </div>
  );
}

/** Result card. `hero` = best pick. Tapping the body opens Food detail. */
export function ResultCard({ r, hero = false }: { r: ItemResult; hero?: boolean }) {
  const { openDetail, confirm } = useApp();
  return (
    <article
      className={cn("flex flex-col gap-3 rounded-[20px] border bg-card p-4", hero && "gap-4 p-5 shadow-[var(--shadow-raised)]")}
      aria-label={hero ? "Best pick" : itemsLabel(r.items)}
    >
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => openDetail(r.items)} className="flex min-w-0 flex-1 flex-col gap-1 text-left">
          {hero && <span className="w-fit rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">Best pick</span>}
          <h3 className={cn("leading-snug", hero ? "text-xl" : "text-base")}>{itemsLabel(r.items)}</h3>
          <div className="flex items-center gap-3">
            <span className={cn("font-bold tabular-nums", hero ? "text-4xl" : "text-2xl")}>₱{r.total}</span>
            <BusogMeter value={r.fill} />
          </div>
        </button>
        <SaveButton items={r.items} />
      </div>

      <button type="button" onClick={() => openDetail(r.items)} className="flex flex-col gap-2 text-left">
        <ChainLine chain={r.branch.chain} branch={r.branch.name} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{r.distance_km.toFixed(1)} km</span>
          <span className="flex items-center gap-1"><Footprints className="size-4" aria-hidden />Lakad {r.walk_min} min</span>
          <OpenLabel o={r} />
        </div>
        <WaitLabel o={r} />
        {r.other_branches > 0 && <span className="text-xs font-semibold text-primary">May {r.other_branches} pang branch</span>}
        {r.why.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {r.why.map((w) => (
              <span key={w} className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-[#1f7a52]">
                {w}
              </span>
            ))}
          </span>
        )}
        <span className={cn("flex gap-2 text-sm", hero && "rounded-[14px] bg-primary-soft p-3")}>
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span className={cn(!hero && "line-clamp-1")}>{r.reason}</span>
        </span>
      </button>

      <Button
        size="lg"
        variant={hero ? "default" : "outline"}
        className={cn("h-12 text-base", !hero && "h-11 self-start px-5 text-sm")}
        onClick={() => confirm(r.items, r.branch, r.total)}
      >
        Ito na!
      </Button>
    </article>
  );
}

/** Small card for home carousels and saved items. */
export function MiniFoodCard({ items, sub, onTap }: { items: CatalogItem[]; sub?: string; onTap?: () => void }) {
  const { openDetail } = useApp();
  return (
    <button
      type="button"
      onClick={onTap ?? (() => openDetail(items))}
      className="flex w-40 shrink-0 flex-col gap-1.5 rounded-[20px] border bg-card p-3 text-left hover:border-brand/50"
    >
      <ChainLine chain={items[0].chain} />
      <span className="line-clamp-2 min-h-10 text-sm font-semibold">{itemsLabel(items)}</span>
      <span className="flex items-center justify-between">
        <span className="font-bold tabular-nums">₱{items.reduce((s, i) => s + i.price, 0)}</span>
        <BusogMeter value={Math.min(5, Math.max(1, items.reduce((s, i) => s + i.fill_score, 0)))} />
      </span>
      {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
    </button>
  );
}

function FoodDetailSheet() {
  const { detail, closeDetail, confirm, place } = useApp();
  const open = detail !== null;
  const items = detail?.items ?? [];
  const branches = items.length && place ? branchesFor(catalog, items[0].chain, place) : [];
  const fill = Math.min(5, Math.max(1, items.reduce((s, i) => s + i.fill_score, 0)));
  const nearestOpen = branches.find((b) => b.status.open);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDetail()}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] max-w-[440px] overflow-y-auto rounded-t-[20px] px-5 pb-8">
        {detail && (
          <>
            <SheetHeader className="px-0">
              <ChainLine chain={items[0].chain} />
              <SheetTitle className="text-2xl">{itemsLabel(items)}</SheetTitle>
              <SheetDescription>{[...new Set(items.map((i) => i.includes))].join(" ")}</SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-between rounded-[14px] border bg-card p-4">
              <span className="text-3xl font-bold tabular-nums">₱{detail.total}</span>
              <BusogMeter value={fill} size="md" />
            </div>
            <h3 className="pt-2 text-sm font-semibold">Mga branch (pinakamalapit muna)</h3>
            {!place && <p className="text-sm text-muted-foreground">Pumili muna ng lokasyon sa Home.</p>}
            <ul className="flex flex-col gap-2">
              {branches.map((b) => (
                <li key={b.branch.id} className="flex items-center gap-3 rounded-[14px] border bg-card p-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-semibold">{b.branch.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.distance_km.toFixed(1)} km · Lakad {b.walk_min} min
                    </span>
                    <WaitLabel o={b} />
                    <OpenLabel o={b} />
                  </div>
                  <Button variant="outline" className="h-11 px-4" disabled={!b.status.open} onClick={() => confirm(items, b.branch, detail.total)}>
                    Dito
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-2">
              <div className="rounded-[14px] border">
                <SaveButton items={items} />
              </div>
              <Button size="lg" className="h-12 flex-1 text-base" disabled={!nearestOpen} onClick={() => nearestOpen && confirm(items, nearestOpen.branch, detail.total)}>
                {nearestOpen ? "Ito na!" : "Sarado lahat ngayon"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ConfirmSheet() {
  const { confirmed, closeConfirm, place } = useApp();
  const opt = confirmed && place ? branchesFor(catalog, confirmed.branch.chain, place).find((b) => b.branch.id === confirmed.branch.id) : undefined;
  return (
    <Sheet open={confirmed !== null} onOpenChange={(o) => !o && closeConfirm()}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
        {confirmed && (
          <>
            <SheetHeader className="px-0">
              <span className="text-sm font-semibold text-[#1f7a52]">Ayos! Ito ang kakainin mo:</span>
              <SheetTitle className="text-2xl">{itemsLabel(confirmed.items)}</SheetTitle>
              <SheetDescription>
                {CHAIN_NAMES[confirmed.branch.chain]} · {confirmed.branch.name}
              </SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-between rounded-[14px] border bg-card p-4">
              <span className="text-3xl font-bold tabular-nums">₱{confirmed.total}</span>
              {opt && (
                <span className="text-right text-sm text-muted-foreground">
                  {opt.distance_km.toFixed(1)} km · Lakad {opt.walk_min} min
                </span>
              )}
            </div>
            <a
              href={mapsUrl(confirmed.branch)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Navigation className="size-5" aria-hidden /> Buksan sa Maps
            </a>
            <Button variant="ghost" size="lg" className="h-12" onClick={closeConfirm}>
              Tapos
            </Button>
            <p className="text-center text-xs text-muted-foreground">Kailangan ng internet para sa directions. Naka-save na sa Kinain.</p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Mounted once in the root layout. */
export function GlobalSheets() {
  return (
    <>
      <FoodDetailSheet />
      <ConfirmSheet />
    </>
  );
}
