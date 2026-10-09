// Runs the cases in tests/prompts.md against the rule parser (SPEC §4.3, TASKS 1.4).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRules } from "@/lib/parse/rules";
import type { Filters } from "@/lib/types";

const DEFAULTS = { budget: null, people: 1, hunger: "normal", urgency: "normal", avoid: [], cravings: [], chains: [] };

const md = readFileSync(path.join(__dirname, "prompts.md"), "utf8");
const cases = [...md.matchAll(/^\| (\d+) \| [^|]+ \| (.+?) \| `(\{.*\})` \|$/gm)].map((m) => ({
  n: Number(m[1]),
  request: m[2],
  expected: { ...DEFAULTS, ...JSON.parse(m[3]) } as Partial<Filters>,
}));

function failures(actual: Filters, e: Partial<Filters>): string[] {
  const out: string[] = [];
  for (const k of ["budget", "people", "hunger", "urgency"] as const)
    if (actual[k] !== e[k]) out.push(`${k}: got ${actual[k]}, want ${e[k]}`);
  if ([...actual.avoid].sort().join() !== [...(e.avoid ?? [])].sort().join()) out.push(`avoid: got ${actual.avoid}, want ${e.avoid}`);
  for (const k of ["cravings", "chains"] as const)
    for (const w of e[k] ?? []) if (!(actual[k] as string[]).includes(w)) out.push(`${k}: missing ${w}`);
  return out;
}

describe("rule parser vs tests/prompts.md", () => {
  it("found all 15 cases", () => expect(cases.length).toBe(15));

  // Rule parser passes all 15 today; keep it that way (TASKS 1.4 asks ≥10).
  for (const c of cases) {
    it(`#${c.n} ${c.request}`, () => expect(failures(parseRules(c.request), c.expected)).toEqual([]));
  }

  it("never crashes on junk", () => {
    for (const s of ["ano masarap?", "kahit ano", "", "asdfgh", "₱₱₱", "99999999"]) expect(() => parseRules(s)).not.toThrow();
  });
});
