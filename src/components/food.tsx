"use client";

import { BowlFood, Clock, GitBranch, Heart, MapPin, NavigationArrow, PersonSimpleWalk, Sparkle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useApp } from "@/components/app-data";
import { Kanin } from "@/components/kanin";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CategoryTile, OnDeviceBadge, branchName } from "@/components/visuals";
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

export function BusogMeter({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`Busog meter ${value} sa 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <BowlFood key={n} size={size} weight={n <= value ? "fill" : "regular"} className={n <= value ? "text-brand" : "text-border"} aria-hidden />
      ))}
    </span>
  );
}

export const SPEED: Record<Speed, { label: string; cls: string }> = {
  fast: { label: "Usually mabilis", cls: "bg-success/12 text-success-ink" },
  ok: { label: "Sakto", cls: "bg-muted text-foreground" },
  slow: { label: "Usually matagal", cls: "bg-warning/18 text-warning-ink" },
};

export function WaitChip({ o }: { o: Pick<BranchOption, "speed" | "wait_min" | "peak"> }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", SPEED[o.speed].cls)}>
        <Clock size={14} weight="duotone" aria-hidden /> Pila ~{o.wait_min} min · {SPEED[o.speed].label}
      </span>
      {o.peak && <span className="rounded-full bg-warning/18 px-2.5 py-1 text-xs font-semibold text-warning-ink">Peak ngayon</span>}
    </span>
  );
}

export function OpenLabel({ o }: { o: Pick<BranchOption, "status"> }) {
  return (
    <span className={cn("text-xs font-semibold", !o.status.open ? "text-destructive" : o.status.closingSoon ? "text-warning-ink" : "text-success-ink")}>
      {o.status.label}
    </span>
  );
}

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
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted", className)}
    >
      <Heart size={22} weight={on ? "fill" : "regular"} className={on ? "text-brand" : "text-muted-foreground"} />
    </button>
  );
}

export function ChainLine({ chain, branch, wrap = false }: { chain: CatalogItem["chain"]; branch?: string; wrap?: boolean }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-x-2 text-sm", wrap && "flex-wrap")}>
      <span className={cn("size-2.5 shrink-0 rounded-full", CHAIN_COLORS[chain])} aria-hidden />
      <span className="shrink-0 font-semibold">{CHAIN_NAMES[chain]}</span>
      {branch && <span className={cn("text-muted-foreground", !wrap && "truncate")}>{branchName(branch)}</span>}
    </span>
  );
}

/** AI-written reason: ube soft box + spark + on-device label. */
export function ReasonBox({ text, compact = false }: { text: string; compact?: boolean }) {
  if (compact)
    return (
      <span className="flex items-start gap-1.5 text-sm text-ube">
        <Sparkle size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
        <span className="line-clamp-2 text-foreground">{text}</span>
      </span>
    );
  return (
    <span className="flex flex-col gap-1 rounded-[16px] bg-ube-soft p-3">
      <span className="flex gap-2 text-sm">
        <Sparkle size={16} weight="fill" className="mt-0.5 shrink-0 text-ube" aria-hidden />
        <span>{text}</span>
      </span>
      <OnDeviceBadge className="pl-6" />
    </span>
  );
}

function Stat({ Icon, top, bottom, cls }: { Icon: typeof Clock; top: string; bottom: string; cls?: string }) {
  return (
    <span className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-[16px] bg-surface-2 px-2 py-2.5 text-center", cls)}>
      <Icon size={20} weight="duotone" aria-hidden />
      <span className="font-display text-base font-bold leading-none">{top}</span>
      <span className="text-[11px] font-medium opacity-80">{bottom}</span>
    </span>
  );
}

function BranchCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <GitBranch size={14} aria-hidden /> May {n} pang branch
    </span>
  );
}

/** Best pick hero card. */
export function HeroCard({ r }: { r: ItemResult }) {
  const { openDetail, confirm } = useApp();
  const reduce = useReducedMotion();
  return (
    <motion.article
      whileTap={reduce ? undefined : { scale: 0.99 }}
      className="relative flex flex-col gap-4 overflow-hidden rounded-[24px] border bg-card p-5 shadow-[var(--shadow-raised)]"
      aria-label={`Best pick: ${itemsLabel(r.items)}`}
    >
      <span className="absolute left-0 top-4 rounded-r-full bg-mangga py-1 pl-4 pr-3 text-xs font-extrabold text-[#5a3c00]">★ Best pick</span>
      <SaveButton items={r.items} className="absolute right-3 top-3" />
      <button type="button" onClick={() => openDetail(r.items)} className="mt-8 flex gap-4 text-left">
        <CategoryTile items={r.items} size={72} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="text-xl leading-tight">{itemsLabel(r.items)}</h3>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display text-4xl font-extrabold tabular-nums">₱{r.total}</span>
            <BusogMeter value={r.fill} />
          </span>
        </span>
      </button>
      <span className="flex flex-col gap-1">
        <ChainLine chain={r.branch.chain} branch={r.branch.name} wrap />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OpenLabel o={r} />
          <BranchCount n={r.other_branches} />
        </span>
      </span>
      <span className="flex gap-2">
        <Stat Icon={MapPin} top={`${r.distance_km.toFixed(1)} km`} bottom="layo" />
        <Stat Icon={PersonSimpleWalk} top={`${r.walk_min} min`} bottom="lakad" />
        <Stat Icon={Clock} top={`~${r.wait_min} min`} bottom={r.peak ? "pila · peak" : "pila"} cls={SPEED[r.speed].cls} />
      </span>
      {r.why.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {r.why.map((w) => (
            <span key={w} className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success-ink">
              {w}
            </span>
          ))}
        </span>
      )}
      <ReasonBox text={r.reason} />
      <Button size="lg" className="h-14 rounded-[16px] font-display text-lg" onClick={() => confirm(r.items, r.branch, r.total)}>
        Ito na!
      </Button>
    </motion.article>
  );
}

/** Compact horizontal card for other options. Full names, no truncation. */
export function CompactCard({ r }: { r: ItemResult }) {
  const { openDetail, confirm } = useApp();
  const reduce = useReducedMotion();
  return (
    <motion.article whileTap={reduce ? undefined : { scale: 0.98 }} className="flex gap-3 rounded-[24px] border bg-card p-3">
      <button type="button" onClick={() => openDetail(r.items)} className="flex min-w-0 flex-1 gap-3 text-left" aria-label={`${itemsLabel(r.items)}, ₱${r.total}`}>
        <CategoryTile items={r.items} size={52} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-semibold leading-snug">{itemsLabel(r.items)}</span>
          <ChainLine chain={r.branch.chain} branch={r.branch.name} wrap />
          <span className="text-xs text-muted-foreground">
            {r.distance_km.toFixed(1)} km · Lakad {r.walk_min} min ·{" "}
            <span className={cn("font-semibold", r.speed === "fast" ? "text-success-ink" : r.speed === "slow" ? "text-warning-ink" : "")}>Pila ~{r.wait_min} min</span>
          </span>
          <BranchCount n={r.other_branches} />
        </span>
      </button>
      <span className="flex shrink-0 flex-col items-end justify-between gap-1">
        <span className="font-display text-lg font-extrabold tabular-nums">₱{r.total}</span>
        <SaveButton items={r.items} />
        <Button size="sm" variant="outline" className="h-11 px-3" onClick={() => confirm(r.items, r.branch, r.total)}>
          Ito na!
        </Button>
      </span>
    </motion.article>
  );
}

/** Carousel card: colored category tile on top. */
export function MiniFoodCard({ items, sub, onTap }: { items: CatalogItem[]; sub?: string; onTap?: () => void }) {
  const { openDetail } = useApp();
  return (
    <button
      type="button"
      onClick={onTap ?? (() => openDetail(items))}
      className="flex w-[46%] min-w-40 shrink-0 snap-start flex-col overflow-hidden rounded-[24px] border bg-card text-left hover:border-brand/50"
    >
      <CategoryTile items={items} size={0} className="h-20 w-full rounded-none" />
      <span className="flex flex-col gap-1 p-3">
        <ChainLine chain={items[0].chain} />
        <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{itemsLabel(items)}</span>
        <span className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold tabular-nums">₱{items.reduce((s, i) => s + i.price, 0)}</span>
          <BusogMeter value={fillOf(items)} size={14} />
        </span>
        {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
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
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto flex max-h-[90dvh] max-w-[440px] flex-col rounded-t-[28px] px-0 pb-0">
        {detail && (
          <>
            <DragHandle />
            <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-4">
              <SheetHeader className="flex-row items-center gap-4 p-0">
                <CategoryTile items={items} size={64} />
                <div className="flex min-w-0 flex-col gap-1 text-left">
                  <ChainLine chain={items[0].chain} />
                  <SheetTitle className="font-display text-2xl leading-tight">{itemsLabel(items)}</SheetTitle>
                </div>
              </SheetHeader>
              <SheetDescription className="text-sm">{[...new Set(items.map((i) => i.includes))].join(" ")}</SheetDescription>
              <div className="flex items-center justify-between rounded-[16px] bg-surface-2 px-4 py-3">
                <span className="font-display text-3xl font-extrabold tabular-nums">₱{detail.total}</span>
                <BusogMeter value={fillOf(items)} size={20} />
              </div>
              <h3 className="text-base">Mga branch, pinakamalapit muna</h3>
              {!place && <p className="text-sm text-muted-foreground">Pumili muna ng lokasyon sa Home.</p>}
              <ul className="flex flex-col gap-2">
                {branches.map((b) => (
                  <li key={b.branch.id} className="flex items-center gap-3 rounded-[20px] border bg-card p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-sm font-semibold">{branchName(b.branch)}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.distance_km.toFixed(1)} km · Lakad {b.walk_min} min
                      </span>
                      <WaitChip o={b} />
                      <OpenLabel o={b} />
                    </div>
                    <Button variant="outline" className="h-11 px-4" disabled={!b.status.open} onClick={() => confirm(items, b.branch, detail.total)}>
                      Dito
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 border-t bg-background px-5 py-4">
              <span className="rounded-[16px] border">
                <SaveButton items={items} />
              </span>
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
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-w-[440px] rounded-t-[28px] px-5 pb-8">
        {confirmed && (
          <>
            <DragHandle />
            <SheetHeader className="items-center p-0 text-center">
              <Kanin mood="happy" size={72} />
              <span className="text-sm font-semibold text-success-ink">Ayos! Ito ang kakainin mo:</span>
              <SheetTitle className="font-display text-2xl">{itemsLabel(confirmed.items)}</SheetTitle>
              <SheetDescription>
                {CHAIN_NAMES[confirmed.branch.chain]} · {branchName(confirmed.branch)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-between rounded-[16px] bg-surface-2 px-4 py-3">
              <span className="font-display text-3xl font-extrabold tabular-nums">₱{confirmed.total}</span>
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
              className="tap inline-flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <NavigationArrow size={20} weight="fill" aria-hidden /> Buksan sa Maps
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
