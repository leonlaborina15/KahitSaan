// Why results are empty (docs/architecture.md §3 notesFor). Pure.
import { isOpen } from "./distance";
import { branchOption, explore, fmtTime, type ExploreInput, type ItemResult } from "./explore";

export type NoteKind = "closed" | "far" | "budget" | "filtered";

export interface Note {
  kind: NoteKind;
  text: string;
}

const DISTANCE_CAP_KM = 5;
const NO_LIMIT = 1_000_000;

/** Minutes from `now` until a branch opens (0 if open). */
function minutesUntilOpen(open: string, now: Date): number {
  const [h, m] = open.split(":").map(Number);
  const diff = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  return diff >= 0 ? diff : diff + 24 * 60;
}

/**
 * One note for an empty result list, checked in this order: everything closed, nothing within the
 * distance limit, budget too low, other filters. Empty array when there are results.
 */
export function notesFor(input: ExploreInput, results: ItemResult[]): Note[] {
  if (results.length) return [];
  const { catalog, filters: f, here, now = new Date() } = input;
  const maxKm = Math.min(f.max_distance_km ?? DISTANCE_CAP_KM, DISTANCE_CAP_KM);
  const inArea = catalog.branches.filter(
    (b) => (!f.chains.length || f.chains.includes(b.chain)) && branchOption(catalog, b, here, now).distance_km <= DISTANCE_CAP_KM,
  );

  if (f.open_only && inArea.length && !inArea.some((b) => isOpen(b, now))) {
    const next = [...inArea].sort((a, b) => minutesUntilOpen(a.hours.open, now) - minutesUntilOpen(b.hours.open, now))[0];
    return [{ kind: "closed", text: `Sarado pa lahat ng malapit. Unang bubukas: ${catalog.chains.find((c) => c.id === next.chain)?.name ?? next.name}, ${fmtTime(next.hours.open)}.` }];
  }

  if (maxKm < DISTANCE_CAP_KM) {
    const wider = explore({ ...input, filters: { ...f, max_distance_km: null } });
    if (wider.length) return [{ kind: "far", text: `Walang pasok sa loob ng ${maxKm} km. May ${wider.length} sa loob ng ${DISTANCE_CAP_KM} km.` }];
  }

  const cap = Math.min(f.budget, f.max_total ?? f.budget);
  const richer = explore({ ...input, filters: { ...f, budget: NO_LIMIT, max_total: null }, sort: "cheap" });
  if (richer.length && richer[0].total > cap) {
    const c = richer[0];
    const who = f.people > 1 ? ` para sa ${f.people}` : "";
    return [{ kind: "budget", text: `Kulang ng ₱${c.total - cap}${who}. Pinakamura: ${c.items.map((i) => i.name).join(" + ")}, ₱${c.total}.` }];
  }

  return [{ kind: "filtered", text: "Walang tugma sa filters mo. Subukang bawasan ang filters." }];
}
