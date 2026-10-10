// Engine golden scenarios: fixed request → expected behavior. Must pass on mock and real data.
import { describe, expect, it } from "vitest";
import { catalog } from "@/lib/catalog";
import { parseRequest, search } from "@/lib/engine";
import { isOpen } from "@/lib/rank/distance";
import { voteTaste } from "@/lib/rank/taste";
import { DEFAULT_PREFS, EMPTY_TASTE } from "@/lib/store/db";
import type { Branch, Filters, Prefs, TasteProfile } from "@/lib/types";

const at = (id: string) => catalog.landmarks.find((l) => l.id === id)!;
const noon = new Date(2026, 9, 9, 12, 0);
const prefs: Prefs = { ...DEFAULT_PREFS, usual_budget: 200 };
const run = (text: string, opts: { now?: Date; here?: string; taste?: TasteProfile; p?: Prefs } = {}) =>
  search(text, {
    catalog,
    prefs: opts.p ?? prefs,
    taste: opts.taste ?? EMPTY_TASTE,
    here: at(opts.here ?? "sm-cabanatuan"),
    now: opts.now ?? noon,
  });

describe("golden scenarios", () => {
  it("₱150 gutom na gutom → results, all ≤ ₱150, best first", async () => {
    const { results } = await run("₱150 lang, gutom na gutom");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.total).toBeLessThanOrEqual(150);
    for (let i = 1; i < results.length; i++) expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
  });

  it("bawal baboy → no pork, no unknown pork", async () => {
    for (const r of (await run("bawal baboy, 200")).results) for (const i of r.items) expect(i.contains_pork).toBe(false);
  });

  it("ayoko ng maanghang → nothing spicy", async () => {
    for (const r of (await run("ayoko ng maanghang 200")).results) for (const i of r.items) expect(i.spicy).toBe(false);
  });

  it("kaming 4, ₱600 → feeds 4 within budget", async () => {
    const { results } = await run("kaming 4, 600 total");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.total).toBeLessThanOrEqual(600);
      expect(r.items.reduce((s, i) => s + i.serves, 0)).toBeGreaterThanOrEqual(4);
    }
  });

  it("chain in the request is respected", async () => {
    const { results } = await run("200 sa mang inasal");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.branch.chain).toBe("mang-inasal");
  });

  it("craving chicken → best pick has chicken", async () => {
    const [best] = (await run("chicken 150")).results;
    expect(best.items.some((i) => i.tags.includes("chicken") || i.protein === "chicken")).toBe(true);
  });

  it("bilis! → best pick is no slower than without it", async () => {
    const [fast] = (await run("bilis! 150")).results;
    const [plain] = (await run("150")).results;
    expect(fast.eta_min).toBeLessThanOrEqual(plain.eta_min);
  });

  it("every result has a template reason", async () => {
    for (const r of (await run("gutom na gutom 150")).results) expect(r.reason).toMatch(/^₱\d+ lang/);
  });

  it("taste memory moves picked tags up", async () => {
    const rankOf = (rs: { items: { tags: string[] }[] }[]) => rs.findIndex((r) => r.items.some((i) => i.tags.includes("sisig")));
    const before = rankOf((await run("150")).results);
    const after = rankOf((await run("150", { taste: { ...EMPTY_TASTE, pick_count: 5, tag_counts: { sisig: 5 } } })).results);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBeLessThan(before === -1 ? Infinity : before);
  });
});

describe("notes explain empty results", () => {
  it("budget too low → how much more, and the cheapest option", async () => {
    const { results, notes } = await run("₱20 lang");
    expect(results).toEqual([]);
    expect(notes[0].kind).toBe("budget");
    expect(notes[0].text).toMatch(/^Kulang ng ₱\d+\. Pinakamura: .+, ₱\d+\.$/);
  });

  it("everything closed → who opens first", async () => {
    const { results, notes } = await run("mang inasal", { now: new Date(2026, 9, 9, 3, 0) });
    expect(results).toEqual([]);
    expect(notes[0]).toEqual({ kind: "closed", text: "Sarado pa lahat ng malapit. Unang bubukas: Mang Inasal, 9am." });
  });

  it("nothing within the distance limit → how many within 5 km", async () => {
    // ~2 km SW of the nearest branch: outside the 1 km "malapit" limit, inside 5 km.
    const { results, notes } = await search("malapit lang, mang inasal", {
      catalog,
      prefs,
      taste: EMPTY_TASTE,
      here: { id: "sw-edge", name: "SW edge", lat: 15.44, lng: 120.93 },
      now: noon,
    });
    expect(results).toEqual([]);
    expect(notes[0].kind).toBe("far");
    expect(notes[0].text).toMatch(/^Walang pasok sa loob ng 1 km\. May \d+ sa loob ng 5 km\.$/);
  });

  it("no notes when there are results", async () => {
    expect((await run("200")).notes).toEqual([]);
  });
});

describe("parseRequest: LLM with rule-parser fallback (SPEC §4.3)", () => {
  const llmFilters: Filters = {
    budget: 123, people: 1, hunger: "normal", urgency: "normal", max_distance_km: null,
    cravings: [], avoid: [], chains: [], time_context: null,
  };

  it("uses the LLM when it answers", async () => {
    const p = await parseRequest("kahit ano", prefs, { now: noon, llm: async () => llmFilters });
    expect(p.parser).toBe("llm");
    expect(p.filters.budget).toBe(123);
  });

  it("falls back to rules when the LLM returns null, throws, or is too slow", async () => {
    const slow = () => new Promise<Filters>((r) => setTimeout(() => r(llmFilters), 200));
    for (const llm of [async () => null, async () => Promise.reject(new Error("boom")), slow]) {
      const p = await parseRequest("₱150 lang", prefs, { now: noon, llm, timeoutMs: 50 });
      expect(p.parser).toBe("rules");
      expect(p.filters.budget).toBe(150);
    }
  });

  it("empty text never calls the LLM", async () => {
    let called = false;
    const p = await parseRequest("  ", prefs, { now: noon, llm: async () => ((called = true), llmFilters) });
    expect(called).toBe(false);
    expect(p.filters.budget).toBe(200);
  });
});

describe("hours", () => {
  it("isOpen handles past-midnight closing", () => {
    const b = { is_24h: false, hours: { open: "10:00", close: "02:00" } } as Branch;
    expect(isOpen(b, new Date(2026, 9, 9, 1, 0))).toBe(true);
    expect(isOpen(b, new Date(2026, 9, 9, 3, 0))).toBe(false);
  });
});

describe("taste votes (SPEC §3.4)", () => {
  it("👎 three times pushes a tag down; undoing restores it", async () => {
    const sisig = catalog.items.filter((i) => i.tags.includes("sisig")).slice(0, 1);
    const liked: TasteProfile = { ...EMPTY_TASTE, tag_counts: { sisig: 3 } };
    let t = liked;
    for (let n = 0; n < 3; n++) t = voteTaste(t, sisig, -1);
    expect(t.tag_counts.sisig).toBe(0);
    const rankOf = async (taste: TasteProfile) =>
      (await run("150", { taste })).results.findIndex((r) => r.items.some((i) => i.tags.includes("sisig")));
    expect(await rankOf(t)).toBeGreaterThan(await rankOf(liked));
    for (let n = 0; n < 3; n++) t = voteTaste(t, sisig, 1);
    expect(t.tag_counts).toEqual(expect.objectContaining({ sisig: 3 }));
  });
});
