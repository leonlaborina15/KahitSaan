"use client";

import { Check, LocateFixed, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { catalog } from "@/lib/catalog";
import { loadPlace, savePlace, type SavedPlace } from "@/lib/store/db";
import { cn } from "@/lib/utils";

/** GPS once (5 s timeout), else saved place, else ask for a landmark (SPEC §10). */
export function useLocation() {
  const [place, setPlace] = useState<SavedPlace | null>(null);
  const [status, setStatus] = useState<"locating" | "ready" | "need-pick">("locating");

  const locate = useCallback(() => {
    let done = false;
    setStatus("locating");
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
    setTimeout(fallback, 6000);
  }, []);

  useEffect(locate, [locate]);

  const pick = (p: SavedPlace) => {
    setPlace(p);
    setStatus("ready");
    void savePlace(p);
  };

  return { place, status, pick, locate };
}

export function LocationSheet({
  open,
  onOpenChange,
  current,
  onPick,
  onGps,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: SavedPlace | null;
  onPick: (p: SavedPlace) => void;
  onGps: () => void;
}) {
  const row = "flex min-h-12 w-full items-center gap-3 rounded-[14px] border bg-card px-4 text-left text-sm font-medium hover:border-brand/50";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle>Nasaan ka?</SheetTitle>
          <SheetDescription>Para malaman namin kung ano&apos;ng malapit sa&apos;yo.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={row}
            onClick={() => {
              onGps();
              onOpenChange(false);
            }}
          >
            <LocateFixed className="size-5 text-primary" aria-hidden /> Gamitin ang GPS ko
          </button>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mga lugar sa Cabanatuan</p>
          {catalog.landmarks.map((l) => {
            const on = current?.source === "landmark" && current.label === l.name;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                className={cn(row, on && "border-primary bg-primary text-primary-foreground")}
                onClick={() => {
                  onPick({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" });
                  onOpenChange(false);
                }}
              >
                <MapPin className="size-5" aria-hidden /> <span className="flex-1">{l.name}</span>
                {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
