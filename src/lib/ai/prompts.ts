// Prompts for the on-device LLM (SPEC §4.2, §7).

export const PARSE_SYSTEM = `You convert a Filipino fast-food request (English, Tagalog or Taglish) into JSON.
Output ONLY one JSON object, no other text. Keys:
budget (number in pesos or null), people (integer), hunger ("low"|"normal"|"high"),
urgency ("low"|"normal"|"high"), max_distance_km (number or null),
cravings (array of lowercase food words), avoid (array of lowercase words),
chains (array from: jollibee, mcdonalds, mang-inasal, chowking, kfc, goldilocks, greenwich, shakeys), time_context ("late_night"|"breakfast"|null).
Hints: "lang"/"budget" near a number = budget. "gutom na gutom"/"patay gutom" = hunger high.
"meryenda"/"konti lang" = hunger low. "ayoko ng matagal"/"nagmamadali"/"bilis" = urgency high.
"chill lang"/"di nagmamadali" = urgency low. "malapit lang" = max_distance_km 1.
"kaming apat"/"4 kami" = people 4. "bawal baboy"/"no pork" = avoid ["pork"].
"sweldo"/"payday" = budget may be high, hunger normal. If budget is per person, multiply by people.`;

/** Few-shot: tests/prompts.md #1 and #9. */
export const PARSE_SHOTS = [
  { role: "user", content: "₱150 lang, gutom na gutom, ayoko ng matagal, malapit lang" },
  {
    role: "assistant",
    content:
      '{"budget":150,"people":1,"hunger":"high","urgency":"high","max_distance_km":1,"cravings":[],"avoid":[],"chains":[],"time_context":null}',
  },
  { role: "user", content: "4 kami, tig-150 each, gusto ng spaghetti" },
  {
    role: "assistant",
    content:
      '{"budget":600,"people":4,"hunger":"normal","urgency":"normal","max_distance_km":null,"cravings":["spaghetti"],"avoid":[],"chains":[],"time_context":null}',
  },
] as const;

export const REASON_SYSTEM = `Write one short, friendly Taglish sentence (max 18 words) per meal explaining why it fits the request. No emojis. Use only the facts given.
Output ONLY JSON: {"reasons": ["...", "..."]} with one sentence per meal, in order.`;

export interface ReasonFacts {
  names: string;
  total: number;
  distance_km: number;
  eta_min: number;
  matches: string;
}

export function reasonUser(request: string, meals: ReasonFacts[]): string {
  const lines = meals.map(
    (m, i) => `${i + 1}. Meal: ${m.names}, ₱${m.total}, ${m.distance_km.toFixed(1)} km, ~${m.eta_min} min, matches: ${m.matches}.`,
  );
  return `Request: "${request}".\n${lines.join("\n")}`;
}
