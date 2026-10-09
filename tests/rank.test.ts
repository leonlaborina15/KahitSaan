import { describe, expect, it } from "vitest";
import { catalog } from "@/lib/catalog";
import { parseRules } from "@/lib/parse/rules";
import { resolveFilters } from "@/lib/parse/validate";
import { rank } from "@/lib/rank/score";
import { isOpen } from "@/lib/rank/distance";
import { DEFAULT_PREFS, EMPTY_TASTE } from "@/lib/store/db";
import type { Branch } from "@/lib/types";

const here = catalog.landmarks[0];
const noon = new Date(2026, 9, 9, 12, 0);
const run = (text: string, prefs = DEFAULT_PREFS, taste = EMPTY_TASTE, at = here) =>
  rank({ catalog, filters: resolveFilters(parseRules(text), prefs, noon), prefs, taste, here: at, now: noon });

describe("ranking (SPEC §5–6)", () => {
  it("₱150, 1 person → 3 results, all ≤ ₱150, one per branch", () => {
    const { results } = run("₱150 lang");
    expect(results).toHaveLength(3);
    for (const r of results) expect(r.total).toBeLessThanOrEqual(150);
    expect(new Set(results.map((r) => r.branch.id)).size).toBe(3);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("bawal baboy → no pork anywhere", () => {
    for (const r of run("bawal baboy, 200").results) for (const i of r.items) expect(i.contains_pork).toBe(false);
  });

  it("group of 4, ₱600 → feeds 4 within budget", () => {
    const { results } = run("4 kami, 600 total");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.total).toBeLessThanOrEqual(600);
      expect(r.items.reduce((s, i) => s + i.serves, 0)).toBeGreaterThanOrEqual(4);
    }
  });

  it("chain filter is respected", () => {
    for (const r of run("200 sa mang inasal").results) expect(r.branch.chain).toBe("mang-inasal");
  });

  it("impossible budget → empty, no crash", () => {
    expect(run("₱20 lang").results).toEqual([]);
  });

  it("every result has a reason line", () => {
    for (const r of run("gutom na gutom 150").results) expect(r.reason).toMatch(/^₱\d+ lang/);
  });

  it("taste memory shifts results toward picked tags", () => {
    const taste = { ...EMPTY_TASTE, pick_count: 5, tag_counts: { sisig: 5 } };
    const hasSisig = (rs: { items: { tags: string[] }[] }[]) => rs.some((r) => r.items.some((i) => i.tags.includes("sisig")));
    const market = catalog.landmarks.find((l) => l.id === "public-market")!;
    expect(hasSisig(run("150", DEFAULT_PREFS, EMPTY_TASTE, market).results)).toBe(false);
    expect(hasSisig(run("150", DEFAULT_PREFS, taste, market).results)).toBe(true);
  });

  it("isOpen handles past-midnight closing", () => {
    const b = { is_24h: false, hours: { open: "10:00", close: "02:00" } } as Branch;
    expect(isOpen(b, new Date(2026, 9, 9, 1, 0))).toBe(true);
    expect(isOpen(b, new Date(2026, 9, 9, 3, 0))).toBe(false);
  });
});
