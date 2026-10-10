"use client";

import { NavigationArrow } from "@phosphor-icons/react";
import { useApp } from "@/components/app-data";
import { CheckIcon, HeartIcon, SparklesIcon } from "@/components/icons";
import { Kanin } from "@/components/kanin";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryTile, branchName } from "@/components/visuals";
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

export const fillOf = (items: CatalogItem[]) => Math.min(5, Math.max(1, items.reduce((s, i) => s + i.fill_score, 0)));

/** One muted word instead of a 5-bowl meter. */
export const busogLabel = (fill: number) => (fill >= 5 ? "Pinakabusog" : fill >= 3 ? "Busog" : "Katamtaman");

export function BusogMeter({ value }: { value: number; size?: number }) {
  return <span className="text-micro">{busogLabel(value)}</span>;
}

export const SPEED: Record<Speed, { label: string; cls: string }> = {
  fast: { label: "Usually mabilis", cls: "" },
  ok: { label: "Sakto", cls: "" },
  slow: { label: "Usually matagal", cls: "" },
};

/** "~5 min pila · Usually mabilis · Peak ngayon" as plain muted text. */
export function WaitChip({ o }: { o: Pick<BranchOption, "speed" | "wait_min" | "peak"> }) {
  return (
    <span className="text-meta">
      ~{o.wait_min} min pila · {SPEED[o.speed].label}
      {o.peak && " · Peak ngayon"}
    </span>
  );
}

export function OpenLabel({ o }: { o: Pick<BranchOption, "status"> }) {
  return <span className={cn(!o.status.open && "text-destructive")}>{o.status.label}</span>;
}

/** "1.9 km · 29 min lakad · ~5 min pila" */
export const metaLine = (r: Pick<BranchOption, "distance_km" | "walk_min" | "wait_min">) =>
  `${r.distance_km.toFixed(1)} km · ${r.walk_min} min lakad · ~${r.wait_min} min pila`;

function SaveButton({ items, className }: { items: CatalogItem[]; className?: string }) {
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
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-[10px]", on ? "text-brand" : "text-muted-foreground hover:text-foreground", className)}
    >
      <HeartIcon size={22} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

export function ChainLine({ chain, branch }: { chain: CatalogItem["chain"]; branch?: string; wrap?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-meta">
      <span className={cn("size-2 shrink-0 rounded-full", CHAIN_COLORS[chain])} aria-hidden />
      <span className="shrink-0 text-foreground">{CHAIN_NAMES[chain]}</span>
      {branch && <span className="truncate">· {branchName(branch)}</span>}
    </span>
  );
}

/** AI-written reason: plain muted text, one small sparkle. */
export function ReasonBox({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <span className="flex items-start gap-2 text-meta">
      <SparklesIcon size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span className={cn(compact && "line-clamp-2")}>{text}</span>
    </span>
  );
}

/** Best pick: inset art, name + price, checklist of why, one filled button. */
export function HeroCard({ r }: { r: ItemResult }) {
  const { openDetail, confirm } = useApp();
  return (
    <article className="flex flex-col gap-4 rounded-[20px] bg-card p-2 pb-4 shadow-[var(--shadow-soft)]" aria-label={`Best pick: ${itemsLabel(r.items)}`}>
      <div className="relative">
        <button type="button" onClick={() => openDetail(r.items)} className="block w-full" aria-label={`Detalye: ${itemsLabel(r.items)}`}>
          <CategoryTile items={r.items} size={0} className="h-40 w-full" />
        </button>
        <span className="absolute left-2 top-2 rounded-full bg-card px-2.5 py-1 text-micro text-foreground">Best pick</span>
        <SaveButton items={r.items} className="absolute right-1 top-1" />
      </div>
      <div className="flex flex-col gap-2 px-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-section">{itemsLabel(r.items)}</h3>
          <span className="shrink-0 text-title tabular-nums">₱{r.total}</span>
        </div>
        <ChainLine chain={r.branch.chain} branch={r.branch.name} />
        <span className="text-meta">
          {metaLine(r)} · <OpenLabel o={r} />
          {r.other_branches > 0 && ` · May ${r.other_branches} pang branch`}
        </span>
      </div>
      {r.why.length > 0 && (
        <ul className="flex flex-col gap-2 px-2">
          {r.why.map((w) => (
            <li key={w} className="flex items-center gap-2 text-body">
              <CheckIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}
      <div className="px-2">
        <ReasonBox text={r.reason} />
      </div>
      <div className="px-2">
        <Button className="h-12 w-full rounded-[10px] text-body font-semibold" onClick={() => confirm(r.items, r.branch, r.total)}>
          Ito na!
        </Button>
      </div>
    </article>
  );
}

/** Other options: small art, text, price on the right. */
export function CompactCard({ r }: { r: ItemResult }) {
  const { openDetail, confirm } = useApp();
  return (
    <article className="flex flex-col gap-2 rounded-[20px] bg-card p-4 shadow-[var(--shadow-soft)]">
      <button type="button" onClick={() => openDetail(r.items)} className="flex min-w-0 gap-4 text-left" aria-label={`${itemsLabel(r.items)}, ₱${r.total}`}>
        <CategoryTile items={r.items} size={64} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-section">{itemsLabel(r.items)}</span>
            <span className="shrink-0 text-title tabular-nums">₱{r.total}</span>
          </span>
          <ChainLine chain={r.branch.chain} branch={r.branch.name} />
          <span className="text-meta">{metaLine(r)}</span>
        </span>
      </button>
      <span className="flex items-center gap-2">
        <span className="flex-1 pl-20 text-micro">{busogLabel(r.fill)}</span>
        <SaveButton items={r.items} />
        <Button variant="outline" className="h-11 rounded-[10px] px-4 text-meta font-semibold text-foreground" onClick={() => confirm(r.items, r.branch, r.total)}>
          Ito na!
        </Button>
      </span>
    </article>
  );
}

/** Carousel card: inset art on top, name + price, chain, meta. */
export function MiniFoodCard({ items, sub, onTap }: { items: CatalogItem[]; sub?: string; onTap?: () => void }) {
  const { openDetail } = useApp();
  return (
    <button
      type="button"
      onClick={onTap ?? (() => openDetail(items))}
      className="flex w-[64%] min-w-52 max-w-64 shrink-0 snap-start flex-col gap-2 rounded-[20px] bg-card p-2 pb-4 text-left shadow-[var(--shadow-soft)]"
    >
      <CategoryTile items={items} size={0} className="h-28 w-full" />
      <span className="flex flex-col gap-1 px-2 pt-2">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 min-h-10 text-section">{itemsLabel(items)}</span>
          <span className="shrink-0 text-title tabular-nums">₱{items.reduce((s, i) => s + i.price, 0)}</span>
        </span>
        <ChainLine chain={items[0].chain} />
        <span className="truncate text-meta">
          {sub ? `${sub} · ` : ""}
          {busogLabel(fillOf(items))}
        </span>
      </span>
    </button>
  );
}

function DragHandle() {
  return <span className="mx-auto mb-1 mt-1 h-1.5 w-12 rounded-full bg-border" aria-hidden />;
}

function FoodDetailSheet() {
  const { detail, closeDetail, confirm, place } = useApp();
  const items = detail?.items ?? [];
  const branches = items.length && place ? branchesFor(catalog, items[0].chain, place) : [];
  const nearestOpen = branches.find((b) => b.status.open);

  return (
    <Sheet open={detail !== null} onOpenChange={(o) => !o && closeDetail()}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto flex max-h-[90dvh] max-w-[440px] flex-col rounded-t-[20px] px-0 pb-0">
        {detail && (
          <>
            <DragHandle />
            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
              <CategoryTile items={items} size={0} className="h-36 w-full" />
              <SheetHeader className="gap-2 p-0 text-left">
                <ChainLine chain={items[0].chain} />
                <div className="flex items-start justify-between gap-4">
                  <SheetTitle className="text-section">{itemsLabel(items)}</SheetTitle>
                  <span className="shrink-0 text-title tabular-nums">₱{detail.total}</span>
                </div>
                <SheetDescription className="text-meta">
                  {[...new Set(items.map((i) => i.includes))].join(" ")} · {busogLabel(fillOf(items))}
                </SheetDescription>
              </SheetHeader>
              <h3 className="pt-4 text-section">Mga branch, pinakamalapit muna</h3>
              {!place && <p className="text-meta">Pumili muna ng lokasyon sa Home.</p>}
              <ul className="flex flex-col divide-y">
                {branches.map((b) => (
                  <li key={b.branch.id} className="flex items-center gap-4 py-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-body">{branchName(b.branch)}</span>
                      <span className="text-meta">
                        {metaLine(b)} · <OpenLabel o={b} />
                      </span>
                    </div>
                    <Button variant="outline" className="h-11 rounded-[10px] px-4" disabled={!b.status.open} onClick={() => confirm(items, b.branch, detail.total)}>
                      Dito
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 border-t bg-card px-4 py-4">
              <SaveButton items={items} className="size-12 border" />
              <Button size="lg" className="h-12 flex-1 rounded-[10px] text-body font-semibold" disabled={!nearestOpen} onClick={() => nearestOpen && confirm(items, nearestOpen.branch, detail.total)}>
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
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-w-[440px] rounded-t-[20px] px-4 pb-8">
        {confirmed && (
          <>
            <DragHandle />
            <SheetHeader className="items-center gap-2 p-0 text-center">
              <Kanin mood="happy" size={72} />
              <span className="text-meta">Ayos! Ito ang kakainin mo:</span>
              <SheetTitle className="text-section">{itemsLabel(confirmed.items)}</SheetTitle>
              <SheetDescription className="text-meta">
                {CHAIN_NAMES[confirmed.branch.chain]} · {branchName(confirmed.branch)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col items-center gap-1 py-4">
              <span className="text-title tabular-nums">₱{confirmed.total}</span>
              {opt && <span className="text-meta">{metaLine(opt)}</span>}
            </div>
            <a
              href={mapsUrl(confirmed.branch)}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-body font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <NavigationArrow size={20} weight="fill" aria-hidden /> Buksan sa Maps
            </a>
            <Button variant="ghost" size="lg" className="h-12 rounded-[10px]" onClick={closeConfirm}>
              Tapos
            </Button>
            <p className="text-center text-micro">Kailangan ng internet para sa directions. Naka-save na sa Kinain.</p>
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
