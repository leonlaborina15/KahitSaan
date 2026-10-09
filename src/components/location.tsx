"use client";

import { Check, LocateFixed, MapPin, MapPinOff } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { catalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { place, pickPlace, locate } = useApp();
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
              locate();
              onOpenChange(false);
            }}
          >
            <LocateFixed className="size-5 text-primary" aria-hidden /> Gamitin ang GPS ko
          </button>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mga lugar sa Cabanatuan</p>
          {catalog.landmarks.map((l) => {
            const on = place?.source === "landmark" && place.label === l.name;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                className={cn(row, on && "border-primary bg-primary text-primary-foreground")}
                onClick={() => {
                  pickPlace({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" });
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

/** "Malapit sa: X · Palitan", or the location-denied prompt. Owns its sheet. */
export function LocationRow() {
  const { place, locStatus } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      {locStatus === "need-pick" ? (
        <div className="flex items-center gap-3 rounded-[14px] border bg-card p-3 text-sm" role="status">
          <MapPinOff className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="flex-1">Hindi ko makita ang lokasyon mo.</span>
          <Button size="sm" className="h-11 px-4" onClick={() => setOpen(true)}>
            Pumili ng lugar
          </Button>
        </div>
      ) : (
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="flex-1 truncate">
            {locStatus === "locating" ? (
              <span className="text-muted-foreground">Hinahanap ang lokasyon mo…</span>
            ) : (
              <>
                Malapit sa: <span className="font-semibold">{place?.label}</span>
              </>
            )}
          </span>
          <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-2 font-semibold text-primary">
            Palitan
          </button>
        </div>
      )}
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
