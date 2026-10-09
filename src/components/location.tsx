"use client";

import { useEffect, useState } from "react";
import { catalog } from "@/lib/catalog";
import { loadPlace, savePlace, type SavedPlace } from "@/lib/store/db";

/** GPS once (5 s timeout), else saved place, else landmark picker (SPEC §10). */
export function useLocation() {
  const [place, setPlace] = useState<SavedPlace | null>(null);
  const [status, setStatus] = useState<"locating" | "ready" | "need-pick">("locating");

  useEffect(() => {
    let done = false;
    const fallback = async () => {
      if (done) return;
      done = true;
      const saved = await loadPlace();
      if (saved?.source === "landmark") {
        setPlace(saved);
        setStatus("ready");
      } else setStatus("need-pick");
    };
    if (!("geolocation" in navigator)) return void fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        setPlace({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Lokasyon mo ngayon", source: "gps" });
        setStatus("ready");
      },
      fallback,
      { timeout: 5000, maximumAge: 60_000 },
    );
    const timer = setTimeout(fallback, 6000);
    return () => clearTimeout(timer);
  }, []);

  const pick = (p: SavedPlace) => {
    setPlace(p);
    setStatus("ready");
    void savePlace(p);
  };

  return { place, status, pick };
}

export function LandmarkPicker({ onPick }: { onPick: (p: SavedPlace) => void }) {
  return (
    <div className="grid gap-2 rounded-xl border p-3">
      <p className="text-sm font-medium">Nasaan ka? Pumili ng lugar:</p>
      {catalog.landmarks.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onPick({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" })}
          className="min-h-11 rounded-lg border px-3 text-left text-sm hover:bg-muted"
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
