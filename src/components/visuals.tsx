"use client";

import { FoodArt, categoryForItems } from "@/components/art/food-art";
import { SparklesIcon } from "@/components/icons";
import type { Branch, CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Branch names without dev markers like "(mock)". */
export const branchName = (b: Pick<Branch, "name"> | string) => (typeof b === "string" ? b : b.name).replace(/\s*\(mock\)/gi, "");

/** Food illustration tile. `size={0}` = fill the given className box. */
export function CategoryTile({ items, size = 56, className }: { items: CatalogItem[]; size?: number; className?: string }) {
  return (
    <span
      className={cn("block shrink-0 overflow-hidden rounded-[10px]", className)}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden
    >
      <FoodArt category={categoryForItems(items)} className="size-full" />
    </span>
  );
}

/** Said once per screen, at the bottom. */
export function OnDeviceBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-micro", className)}>
      <SparklesIcon size={12} aria-hidden /> Ginawa sa phone mo
    </span>
  );
}
