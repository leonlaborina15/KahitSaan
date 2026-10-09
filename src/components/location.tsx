"use client";

import { Check, Crosshair, MapPin, CaretRight } from "@phosphor-icons/react";
import { Kanin } from "@/components/kanin";
import { useState } from "react";
import { useApp } from "@/components/app-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { catalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { place, pickPlace, locate } = useApp();
  const gpsRow = "flex min-h-12 w-full items-center gap-3 rounded-[16px] border border-primary bg-primary px-4 text-left text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors";
  const locationRow = "flex min-h-12 w-full items-center gap-3 rounded-[16px] border bg-card px-4 text-left text-sm font-medium hover:border-brand hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[28px] px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle>Nasaan ka?</SheetTitle>
          <SheetDescription>Para malaman namin kung ano&apos;ng malapit sa&apos;yo.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={gpsRow}
            onClick={() => {
              locate();
              onOpenChange(false);
            }}
          >
            <Crosshair size={20} weight="fill" className="text-primary-foreground" aria-hidden /> Gamitin ang GPS ko
          </button>
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mga lugar sa Cabanatuan</p>
          {catalog.landmarks.map((l) => {
            const on = place?.source === "landmark" && place.label === l.name;
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                className={cn(locationRow, on && "border-brand bg-primary-soft")}
                onClick={() => {
                  pickPlace({ lat: l.lat, lng: l.lng, label: l.name, source: "landmark" });
                  onOpenChange(false);
                }}
              >
                <MapPin size={20} weight="duotone" className={cn(on ? "text-brand" : "text-primary")} aria-hidden /> <span className={cn("flex-1", on && "text-brand")}>{l.name}</span>
                {on && <Check size={16} weight="bold" className="text-brand" aria-hidden />}
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-[16px] border bg-card p-3 text-sm text-left hover:border-brand"
          role="status"
        >
          <Kanin mood="shocked" size={40} />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Your location</div>
            <div className="font-semibold text-foreground">Pumili ng lugar</div>
          </div>
          <CaretRight size={20} weight="bold" className="shrink-0 text-primary" />
        </button>
      ) : (
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <MapPin size={20} weight="fill" className="shrink-0 text-orange-500" aria-hidden />
          <div className="flex-1 truncate">
            <div className="text-xs text-muted-foreground">Your location</div>
            {locStatus === "locating" ? (
              <div className="font-semibold text-foreground">Hinahanap ang lokasyon mo…</div>
            ) : (
              <div className="font-semibold text-foreground">{place?.label}</div>
            )}
          </div>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 p-2 text-primary">
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      )}
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
