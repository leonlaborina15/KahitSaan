// Rule parser = "Simple mode" (SPEC §4.3 step 3). Pure, no I/O.
import type { ChainId, Filters, Level } from "@/lib/types";

const TAGALOG_NUMBERS: Record<string, number> = {
  isa: 1, dalawa: 2, dalawang: 2, tatlo: 3, tatlong: 3, apat: 4, lima: 5, limang: 5,
  anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10,
};

const CRAVINGS: [string, RegExp][] = [
  ["chicken", /\b(chicken|manok|chickenjoy|inasal|pecho|paa)\b/],
  ["burger", /\bburgers?\b/],
  ["fries", /\bfries\b/],
  ["spaghetti", /\b(spaghetti|spag|pasta)\b/],
  ["sisig", /\bsisig\b/],
  ["fish", /\b(isda|fish|bangus)\b/],
  ["noodles", /\b(noodles?|mami|pancit)\b/],
  ["palabok", /\bpalabok\b/],
  ["siopao", /\bsiopao\b/],
  ["siomai", /\bsiomai\b/],
  ["halo-halo", /\bhalo[- ]?halo\b/],
  ["bbq", /\b(bbq|barbecue|barbeque)\b/],
  ["fried rice", /\b(fried rice|chao ?fan)\b/],
  ["ice cream", /\b(ice cream|mcflurry|sundae)\b/],
  ["dessert", /\b(dessert|matamis|sweets?)\b/],
  ["beef", /\b(beef|baka)\b/],
];

const AVOID: [string, RegExp][] = [
  ["pork", /\b(bawal|no|walang|ayaw|ayoko|hindi|wag|iwas)( ng| sa| sa mga)? (baboy|pork)\b|\bhalal\b/],
  ["beef", /\b(bawal|no|walang|ayaw|ayoko|wag)( ng| sa)? (baka|beef)\b/],
  ["seafood", /\b(bawal|no|walang|ayaw|ayoko|allergic)( ng| sa)? (seafood|shrimp|hipon)\b/],
  ["spicy", /\b(ayoko|ayaw|no|hindi|di|wag)( ng| sa)? (maanghang|spicy)\b/],
];

const CHAINS: [ChainId, RegExp][] = [
  ["jollibee", /\b(jollibee|jolibee|jabee|jabi)\b/],
  ["mcdonalds", /\b(mcdo|mcdonalds?|mcdonald's|mcd)\b/],
  ["mang-inasal", /\b(mang inasal|inasal)\b/],
  ["chowking", /\bchowking\b/],
  ["kfc", /\b(kfc|kentucky fried chicken)\b/],
  ["goldilocks", /\bgoldilocks\b/],
  ["greenwich", /\bgreenwich\b/],
  ["shakeys", /\b(shakey'?s|shakeys)\b/],
];

// A number followed by these is not money.
const NOT_MONEY = /^\s*(mins?|minutes?|am|pm|kami|pax|tao|people|pcs?|pieces?|sticks?|km|hrs?|oras|years?)\b/;

function parsePeople(t: string): number {
  const word = "(\\d+|" + Object.keys(TAGALOG_NUMBERS).join("|") + ")";
  const m =
    t.match(new RegExp(`\\bkaming ${word}\\b`)) ??
    t.match(new RegExp(`\\b${word} (kami|tao|pax|people|katao)\\b`)) ??
    t.match(new RegExp(`\\bgroup of ${word}\\b`)) ??
    t.match(new RegExp(`\\bfor ${word}\\b`));
  if (!m) return 1;
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : TAGALOG_NUMBERS[m[1]];
  return n >= 1 && n <= 20 ? n : 1;
}

function parseBudget(t: string, people: number): number | null {
  const amounts: { value: number; perPerson: boolean }[] = [];
  for (const m of t.matchAll(/(₱|php|p)?\s*(\d{2,5})/g)) {
    const after = t.slice(m.index! + m[0].length);
    if (NOT_MONEY.test(after)) continue;
    const before = t.slice(Math.max(0, m.index! - 6), m.index!);
    const value = Number(m[2]);
    if (value < 20) continue;
    const perPerson = /tig-?\s*$/.test(before) || /^\s*(each|per (person|head|tao)|kada isa|bawat isa)/.test(after);
    amounts.push({ value, perPerson });
  }
  if (!amounts.length) return null;
  const best = amounts.reduce((a, b) => (b.value > a.value ? b : a));
  return best.perPerson ? best.value * people : best.value;
}

function parseHunger(t: string): Level {
  if (/\b(hindi|di) (pa )?(ako )?gutom\b|\bmeryenda\b|\bkonti lang\b|\bsnack\b|\blight lang\b/.test(t)) return "low";
  if (/\bgutom\b|\bnagugutom\b|\bstarving\b|\bhungry\b/.test(t)) return "high";
  return "normal";
}

function parseUrgency(t: string): Level {
  if (/\b(di|hindi) (ako )?nagmamadali\b|\bchill\b|\brelax\b|\bkahit malayo\b|\bno rush\b|\bok lang (maghintay|matagal)\b/.test(t)) return "low";
  if (/\bayoko ng matagal\b|\bayaw ng matagal\b|\bnagmamadali\b|\bbilis\b|\bmabilis\b|\bmay klase\b|\bin \d+ ?min|\basap\b|\brush\b|\blate na\b|\bquick\b/.test(t)) return "high";
  return "normal";
}

function parseTime(t: string): Filters["time_context"] {
  const m = t.match(/\b(\d{1,2}) ?am\b/);
  if (m && Number(m[1]) <= 4) return "late_night";
  if (/\b(madaling araw|late night|hatinggabi|midnight|puyat)\b/.test(t)) return "late_night";
  if (/\b(breakfast|almusal|umaga)\b/.test(t)) return "breakfast";
  return null;
}

export function parseRules(input: string): Filters {
  const t = input.toLowerCase().replace(/\s+/g, " ").trim();
  const people = parsePeople(t);
  const avoid = AVOID.filter(([, re]) => re.test(t)).map(([k]) => k);
  // Don't treat avoided foods as cravings ("no pork" must not add "pork").
  const cravings = CRAVINGS.filter(([k, re]) => re.test(t) && !avoid.includes(k)).map(([k]) => k);
  return {
    budget: parseBudget(t, people),
    people,
    hunger: parseHunger(t),
    urgency: parseUrgency(t),
    max_distance_km: /\bmalapit\b|\bwalking distance\b|\blakad lang\b/.test(t) ? 1 : null,
    cravings,
    avoid,
    chains: CHAINS.filter(([, re]) => re.test(t)).map(([k]) => k),
    time_context: parseTime(t),
  };
}
