import { useId } from "react";
import type { CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type FoodCategory =
  | "rice-meal" | "burger" | "chicken" | "pasta" | "noodles" | "fries"
  | "dessert" | "drink" | "soup" | "seafood" | "breakfast" | "generic";

type Palette = { from: string; to: string; a: string; b: string };
type Art = (c: { a: string; b: string }) => React.ReactNode;

// Each category: its own soft tile + exactly two flat food colors. Strokes >= 2px.
const TILES: Partial<Record<FoodCategory, Palette>> = {
  "rice-meal": { from: "#FFF3DF", to: "#FFE2BC", a: "#A9542A", b: "#FFFDF7" },
  burger: { from: "#FFEADB", to: "#FFD0B4", a: "#8E3A1A", b: "#F7B955" },
  chicken: { from: "#FFE9D2", to: "#FFD3B0", a: "#C8641E", b: "#FFF6EA" },
  generic: { from: "#FBEFE3", to: "#F4DCC6", a: "#B4612F", b: "#FFFAF3" },
};

const RiceMeal: Art = ({ a, b }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    {/* rice dome */}
    <path d="M24 52c0-15 10.5-23 24-23s24 8 24 23Z" fill={b} />
    {/* burger-steak slices on the rice */}
    <rect x="46" y="34" width="22" height="11" rx="5.5" fill={a} transform="rotate(-12 57 39.5)" />
    <rect x="40" y="42" width="18" height="9" rx="4.5" fill={a} transform="rotate(-6 49 46.5)" />
    {/* bowl */}
    <path d="M18 52h60c0 13.8-13.4 24-30 24S18 65.8 18 52Z" fill={a} />
    <path d="M30 62h36" stroke={b} strokeWidth={2.5} />
  </g>
);

const Burger: Art = ({ a, b }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 45c0-12.7 11.2-21 25-21s25 8.3 25 21Z" fill={b} />
    <path d="M38 33.5l2-1M50 31l2 .5M58 36l1.5 1.5M44 39l1.5-.5" stroke={a} strokeWidth={2.5} />
    <rect x="20" y="48" width="56" height="10" rx="5" fill={a} />
    <rect x="23" y="61" width="50" height="11" rx="5.5" fill={b} />
  </g>
);

const Chicken: Art = ({ a, b }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    <path d="M57 55 70 68" stroke={b} strokeWidth={9} />
    <circle cx="73" cy="66" r="5.5" fill={b} />
    <circle cx="68" cy="71" r="5.5" fill={b} />
    <path d="M28 30c9-9 25-8 31 3 5 9 2 19-6 24-8 6-20 6-27-1-7-7-7-17 2-26Z" fill={a} />
    <path d="M33 37l4 3M43 33l3 4M36 48l4 2M48 44l3 3" stroke={b} strokeWidth={2.5} />
  </g>
);

const Generic: Art = ({ a, b }) => (
  <g strokeLinecap="round" strokeLinejoin="round">
    <circle cx="48" cy="50" r="22" fill={b} />
    <circle cx="48" cy="50" r="13" fill="none" stroke={a} strokeWidth={2.5} />
    <path d="M18 30v12M14.5 30v8a3.5 3.5 0 0 0 7 0v-8M18 42v28" stroke={a} strokeWidth={2.5} />
    <path d="M78 70V50" stroke={a} strokeWidth={2.5} />
    <ellipse cx="78" cy="38" rx="4.5" ry="9" fill={a} />
  </g>
);

const ART: Partial<Record<FoodCategory, Art>> = { "rice-meal": RiceMeal, burger: Burger, chicken: Chicken, generic: Generic };

/** Flat 2-color food illustration on a soft tile. Fills its box. */
export function FoodArt({ category, className }: { category: FoodCategory; className?: string }) {
  const id = useId();
  const key = ART[category] ? category : "generic"; // remaining categories land after review
  const t = TILES[key]!;
  const Draw = ART[key]!;
  return (
    <svg viewBox="0 0 96 96" preserveAspectRatio="xMidYMid slice" className={cn("block", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.from} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
      </defs>
      <rect x="-48" y="-48" width="192" height="192" fill={`url(#${id})`} />
      <Draw a={t.a} b={t.b} />
    </svg>
  );
}

// Keyword → category. First match wins, so specific dishes come before generic words.
const RULES: [RegExp, FoodCategory][] = [
  [/burger steak|silog|tapa|longganisa/i, "rice-meal"],
  [/pancake|hotcake|breakfast|muffin|egg|sausage/i, "breakfast"],
  [/spaghetti|pasta|palabok|carbonara/i, "pasta"],
  [/chicken|chickenjoy|inasal|wings|nuggets|mcnugget|pecho|paa/i, "chicken"],
  [/rice|kanin/i, "rice-meal"],
  [/burger|yumburger|sandwich/i, "burger"],
  [/fries|potato/i, "fries"],
  [/pie|sundae|halo|mcflurry|cake|leche|dessert|ice cream|float/i, "dessert"],
  [/noodle|mami|pancit|lomi|chao fan|siopao/i, "noodles"],
  [/soup|sinigang|bulalo|lugaw|congee|arroz caldo/i, "soup"],
  [/fish|shrimp|bangus|seafood|tuna|fillet/i, "seafood"],
  [/coke|soda|drink|juice|tea|coffee|iced|sprite|royal|water/i, "drink"],
];

export function categoryFor(name: string): FoodCategory {
  for (const [re, cat] of RULES) if (re.test(name)) return cat;
  return "generic";
}

// Catalog food_type → category, used before falling back to the name.
const FOOD_TYPE: Record<string, FoodCategory> = {
  chicken: "chicken", burger: "burger", pasta: "pasta", spaghetti: "pasta", "rice meal": "rice-meal", rice: "rice-meal",
  sisig: "rice-meal", noodles: "noodles", fish: "seafood", snack: "fries", fries: "fries", dessert: "dessert", drink: "drink",
};

/** Category for a combo: its main item's food_type, else its name. */
export function categoryForItems(items: CatalogItem[]): FoodCategory {
  const main = items.find((i) => ["meal", "main", "bundle"].includes(i.category)) ?? items[0];
  if (!main) return "generic";
  return FOOD_TYPE[main.food_type ?? ""] ?? categoryFor(main.name);
}
