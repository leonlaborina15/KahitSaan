"use client";

import {
  Bird, BowlFood, BowlSteam, Coffee, Fire, Fish, ForkKnife, Grains, Hamburger, IceCream, Popcorn, Sparkle, type Icon,
} from "@phosphor-icons/react";
import type { Branch, CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Branch names without dev markers like "(mock)". */
export const branchName = (b: Pick<Branch, "name"> | string) => (typeof b === "string" ? b : b.name).replace(/\s*\(mock\)/gi, "");

const CATEGORY: Record<string, { Icon: Icon; from: string; to: string; ink: string }> = {
  chicken: { Icon: Bird, from: "#FFE1B8", to: "#FFC23D", ink: "#8A5208" },
  burger: { Icon: Hamburger, from: "#FFD9CC", to: "#FF9A7A", ink: "#8C2A12" },
  pasta: { Icon: BowlFood, from: "#FFE4DC", to: "#FF8B6B", ink: "#8C2A12" },
  "rice meal": { Icon: Grains, from: "#FFF3D6", to: "#F6D58A", ink: "#7A5A10" },
  noodles: { Icon: BowlSteam, from: "#FFEBD1", to: "#F7B267", ink: "#7A4510" },
  sisig: { Icon: Fire, from: "#FFE0D6", to: "#F2724F", ink: "#8C2A12" },
  fish: { Icon: Fish, from: "#DDF3FF", to: "#8FD3F5", ink: "#0F5577" },
  snack: { Icon: Popcorn, from: "#FFF0C9", to: "#FFD36B", ink: "#7A5A10" },
  dessert: { Icon: IceCream, from: "#F1EAFF", to: "#C7B6FF", ink: "#4B33B5" },
  drink: { Icon: Coffee, from: "#E6F6EE", to: "#9BDCBC", ink: "#13744A" },
};

export const categoryOf = (items: CatalogItem[]) => {
  const main = items.find((i) => ["meal", "main", "bundle"].includes(i.category)) ?? items[0];
  return CATEGORY[main?.food_type ?? ""] ?? { Icon: ForkKnife, from: "#FFF3E6", to: "#FFD9B8", ink: "#7A4510" };
};

/** Food-type icon on a soft gradient (instead of photos). `size={0}` = fill the given className box. */
export function CategoryTile({ items, size = 56, className }: { items: CatalogItem[]; size?: number; className?: string }) {
  const c = categoryOf(items);
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-[18px]", className)}
      style={{ ...(size ? { width: size, height: size } : {}), background: `linear-gradient(135deg, ${c.from}, ${c.to})`, color: c.ink }}
      aria-hidden
    >
      <c.Icon size={size ? Math.round(size * 0.5) : 36} weight="duotone" />
    </span>
  );
}

/** Ube "done on your phone" micro-label for anything the on-device AI produced. */
export function OnDeviceBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold text-ube", className)}>
      <Sparkle size={12} weight="fill" aria-hidden /> Ginawa sa phone mo
    </span>
  );
}
