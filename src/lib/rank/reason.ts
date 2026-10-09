// Template reason line (SPEC §7 fallback). The LLM replaces this in Phase 3.
import type { Result, SubScores } from "@/lib/types";
import type { ResolvedFilters } from "@/lib/parse/validate";

const PHRASES: Record<keyof SubScores, string> = {
  cheap: "pasok na pasok sa budget",
  fast: "mabilis makuha",
  near: "malapit lang",
  filling: "sakto sa gutom mo",
  taste: "swak sa panlasa mo",
};

export function templateReason(r: Pick<Result, "total" | "eta_min" | "distance_km" | "sub">, w: SubScores, f: ResolvedFilters): string {
  // Strongest contribution = weight × sub-score.
  const top = (Object.keys(PHRASES) as (keyof SubScores)[]).sort((a, b) => w[b] * r.sub[b] - w[a] * r.sub[a])[0];
  const change = f.budget - r.total;
  const sukli = change >= 20 ? `, may sukli pang ₱${change}` : "";
  return `₱${r.total} lang, ~${r.eta_min} min, ${r.distance_km.toFixed(1)} km — ${PHRASES[top]}${sukli}.`;
}
