// Combo builder (SPEC §6). One chain's menu → candidate item lists under budget. Pure.
import type { CatalogItem } from "@/lib/types";
import type { ResolvedFilters } from "@/lib/parse/validate";

const SEAFOOD = ["seafood", "fish", "shrimp", "bangus"];

/** True if the item hits anything in `avoid` (SPEC §5.1). */
export function isAvoided(item: CatalogItem, avoid: string[]): boolean {
  return avoid.some((a) => {
    if (a === "pork") return item.contains_pork !== false || item.protein === "pork";
    if (a === "spicy") return item.spicy;
    if (a === "seafood") return SEAFOOD.includes(item.protein ?? "") || item.tags.some((t) => SEAFOOD.includes(t));
    return item.protein === a || item.tags.includes(a);
  });
}

const MAX_COMBOS = 40;
const total = (items: CatalogItem[]) => items.reduce((s, i) => s + i.price, 0);
const repeat = (item: CatalogItem, n: number) => Array.from({ length: n }, () => item);

export function buildCombos(menu: CatalogItem[], f: ResolvedFilters): CatalogItem[][] {
  const ok = menu.filter((i) => !isAvoided(i, f.avoid));
  const of = (...cats: CatalogItem["category"][]) => ok.filter((i) => cats.includes(i.category));
  const addons = of("side", "drink", "dessert");
  const out: CatalogItem[][] = [];

  if (f.people === 1) {
    for (const base of of("meal", "main")) {
      if (base.category === "meal") out.push([base]);
      for (const add of addons) out.push([base, add]);
      // Hungry and the meal leaves lots of budget: add a main/side (extra rice, fries…).
      if (f.hunger === "high" && base.price < 0.7 * f.budget) {
        for (const extra of of("main", "side")) if (extra.id !== base.id) out.push([base, extra]);
      }
    }
  } else {
    for (const b of of("bundle")) if (b.serves >= f.people) out.push([b], ...addons.map((a) => [b, a]));
    for (const meal of of("meal")) {
      out.push(repeat(meal, f.people));
      for (const side of of("side")) out.push([...repeat(meal, f.people), side]);
    }
  }

  // Under budget, max 3 items per person, deduped.
  const seen = new Set<string>();
  return out
    .filter((c) => total(c) <= f.budget && c.length <= 3 * f.people)
    .filter((c) => {
      const key = c.map((i) => i.id).sort().join("+");
      return seen.has(key) ? false : (seen.add(key), true);
    })
    .sort((a, b) => total(b) - total(a))
    .slice(0, MAX_COMBOS);
}
