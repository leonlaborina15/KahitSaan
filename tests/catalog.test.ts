import { describe, expect, it } from "vitest";
import catalog from "../public/catalog.json";
import type { Catalog } from "@/lib/types";

const c = catalog as Catalog;
const CHAINS = ["jollibee", "mcdonalds", "mang-inasal", "chowking"];
const CATEGORIES = ["meal", "main", "side", "drink", "dessert", "bundle"];

describe("catalog.json matches SPEC §3", () => {
  it("has items for all 4 chains", () => {
    for (const chain of CHAINS) expect(c.items.some((i) => i.chain === chain)).toBe(true);
  });

  it("items are valid", () => {
    const ids = new Set<string>();
    for (const i of c.items) {
      expect(ids.has(i.id), `duplicate id ${i.id}`).toBe(false);
      ids.add(i.id);
      expect(CHAINS).toContain(i.chain);
      expect(CATEGORIES).toContain(i.category);
      expect(Number.isInteger(i.price) && i.price > 0, i.id).toBe(true);
      expect(i.serves).toBeGreaterThanOrEqual(1);
      expect(i.prep_minutes).toBeGreaterThan(0);
      expect([true, false, "unknown"]).toContain(i.contains_pork);
      expect(typeof i.breakfast_only, i.id).toBe("boolean");
    }
  });

  it("branches and landmarks are inside Cabanatuan", () => {
    for (const p of [...c.branches, ...c.landmarks]) {
      expect(p.lat, p.id).toBeGreaterThan(15.4);
      expect(p.lat, p.id).toBeLessThan(15.6);
      expect(p.lng, p.id).toBeGreaterThan(120.9);
      expect(p.lng, p.id).toBeLessThan(121.05);
    }
    expect(c.landmarks.length).toBeGreaterThanOrEqual(5);
  });

  it("branch hours are HH:MM", () => {
    for (const b of c.branches) {
      expect(b.hours.open).toMatch(/^\d\d:\d\d$/);
      expect(b.hours.close).toMatch(/^\d\d:\d\d$/);
    }
  });
});
