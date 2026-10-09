// Distance + open-hours helpers. Pure.
import type { Branch } from "@/lib/types";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Walking minutes: road factor 1.3, ~5 km/h (SPEC §5.2). */
export const travelMinutes = (km: number) => km * 1.3 * 12;

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Handles branches that close after midnight (e.g. 10:00–02:00). */
export function isOpen(branch: Branch, now: Date): boolean {
  if (branch.is_24h) return true;
  const t = now.getHours() * 60 + now.getMinutes();
  const open = toMin(branch.hours.open);
  const close = toMin(branch.hours.close);
  return open <= close ? t >= open && t < close : t >= open || t < close;
}

export const mapsUrl = (b: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking`;
