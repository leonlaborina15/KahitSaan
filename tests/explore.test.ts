// "Done when" checks for the Results + Kahit Saan logic.
import { describe, expect, it } from "vitest";
import { filtersFromRequest } from "@/components/app-data";
import { catalog } from "@/lib/catalog";
import { explore, isPeak, openStatus, pickWeighted, speedOf, type SortKey } from "@/lib/rank/explore";
import { DEFAULT_PREFS, EMPTY_TASTE } from "@/lib/store/db";
import type { Prefs } from "@/lib/types";

const here = catalog.landmarks.find((l) => l.id === "public-market")!;
const noon = new Date(2026, 9, 9, 12, 0);
const prefs: Prefs = { ...DEFAULT_PREFS, usual_budget: 250, appetite: "normal", avoid_pork: true, dislikes: ["seafood"] };
const run = (q: string, sort: SortKey = "best", p = prefs) =>
  explore({ catalog, filters: filtersFromRequest(q, p, noon).filters, prefs: p, taste: EMPTY_TASTE, here, now: noon, sort });

describe("request overrides setup", () => {
  it("'₱100 gutom malapit' overrides budget, hunger, distance; dislikes still apply", () => {
    const { filters: f, fromSetup } = filtersFromRequest("₱100 gutom malapit", prefs, noon);
    expect(f.budget).toBe(100);
    expect(f.hunger).toBe("high");
    expect(f.max_distance_km).toBe(1);
    expect(f.avoid).toEqual(expect.arrayContaining(["pork", "seafood"]));
    expect(fromSetup.has("budget")).toBe(false);
    expect(fromSetup.has("avoid")).toBe(true);
  });

  it("unmentioned values fall back to setup", () => {
    expect(filtersFromRequest("gutom", prefs, noon).filters.budget).toBe(250);
  });

  it("results never contain avoided food", () => {
    for (const r of run("")) for (const i of r.items) {
      expect(i.contains_pork).toBe(false);
      expect(["seafood", "fish"]).not.toContain(i.protein);
    }
  });
});

describe("results list", () => {
  it("no duplicate meals", () => {
    const keys = run("").map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(3);
  });

  it("all within budget", () => {
    for (const r of run("₱120 lang")) expect(r.total).toBeLessThanOrEqual(120);
  });

  it.each([
    ["cheap", (a: { total: number }, b: { total: number }) => a.total <= b.total],
    ["near", (a: { distance_km: number }, b: { distance_km: number }) => a.distance_km <= b.distance_km],
    ["fast", (a: { eta_min: number }, b: { eta_min: number }) => a.eta_min <= b.eta_min],
    ["filling", (a: { fill: number }, b: { fill: number }) => a.fill >= b.fill],
    ["best", (a: { score: number }, b: { score: number }) => a.score >= b.score],
  ] as const)("sort %s orders the list", (sort, ok) => {
    const list = run("", sort as SortKey);
    for (let i = 1; i < list.length; i++) expect(ok(list[i - 1] as never, list[i] as never)).toBe(true);
  });

  it("food type filter is respected", () => {
    const list = run("chicken");
    expect(list.length).toBeGreaterThan(0);
    for (const r of list) expect(r.items.some((i) => i.tags.includes("chicken") || i.food_type === "chicken")).toBe(true);
  });

  it("open-only hides closed branches; off shows them", () => {
    const at3am = new Date(2026, 9, 9, 3, 0);
    const f = filtersFromRequest("", prefs, at3am).filters;
    const open = explore({ catalog, filters: f, prefs, taste: EMPTY_TASTE, here, now: at3am });
    const all = explore({ catalog, filters: { ...f, open_only: false }, prefs, taste: EMPTY_TASTE, here, now: at3am });
    for (const r of open) expect(r.status.open).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(open.length);
  });
});

describe("wait + open labels", () => {
  it("speed thresholds", () => {
    expect(speedOf(7)).toBe("fast");
    expect(speedOf(8)).toBe("ok");
    expect(speedOf(15)).toBe("ok");
    expect(speedOf(16)).toBe("slow");
  });
  it("peak windows", () => {
    expect(isPeak(new Date(2026, 9, 9, 12, 0))).toBe(true);
    expect(isPeak(new Date(2026, 9, 9, 19, 0))).toBe(true);
    expect(isPeak(new Date(2026, 9, 9, 15, 0))).toBe(false);
  });
  it("closing soon", () => {
    const b = catalog.branches.find((x) => !x.is_24h && x.hours.close === "21:00")!;
    expect(openStatus(b, new Date(2026, 9, 9, 20, 40)).label).toBe("Magsasara na in 20 min");
    expect(openStatus(b, new Date(2026, 9, 9, 22, 0)).open).toBe(false);
  });
});

describe("Kahit Saan", () => {
  it("rerolls never repeat within a session", () => {
    const f = filtersFromRequest("", prefs, noon).filters;
    const shown = new Set<string>();
    const picks: string[] = [];
    for (let n = 0; n < 6; n++) {
      const list = explore({ catalog, filters: f, prefs, taste: EMPTY_TASTE, here, now: noon, excludeItems: shown });
      const p = pickWeighted(list);
      if (!p) break;
      expect(p.items.some((i) => shown.has(i.id))).toBe(false);
      p.items.forEach((i) => shown.add(i.id));
      picks.push(p.key);
    }
    expect(picks.length).toBeGreaterThan(2);
    expect(new Set(picks).size).toBe(picks.length);
  });

  it("weighted pick stays in the top 5", () => {
    const list = run("");
    const top5 = new Set([...list].sort((a, b) => b.score - a.score).slice(0, 5).map((r) => r.key));
    for (const x of [0, 0.3, 0.6, 0.99]) expect(top5.has(pickWeighted(list, () => x)!.key)).toBe(true);
  });
});
