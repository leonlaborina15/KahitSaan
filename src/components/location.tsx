"use client";

import { CaretDown, Check, MapPin } from "@phosphor-icons/react";
import { useState } from "react";
import { useApp } from "@/components/app-data";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { catalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function LocationSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { place, pickPlace } = useApp();
  const locationRow = "flex min-h-12 w-full items-center gap-3 rounded-[10px] border bg-card px-4 text-left text-body hover:border-brand hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-[20px] px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle>Nasaan ka?</SheetTitle>
          <SheetDescription>Pumili ng lugar sa Cabanatuan na malapit sa&apos;yo.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          <p className="pt-2 text-meta font-semibold uppercase tracking-wide text-muted-foreground">Mga lugar sa Cabanatuan</p>
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
/** "📍 Malapit sa: X        Palitan" — one line, tap anywhere to change. */
export function LocationRow({ header = false }: { header?: boolean }) {
  const { place, locStatus } = useApp();
  const [open, setOpen] = useState(false);
  const label = locStatus === "need-pick" ? "Pumili ng lugar" : locStatus === "locating" ? "Hinahanap ang lokasyon mo…" : place?.label;
  if (header)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 min-w-0 flex-col items-start text-left" aria-label={`Malapit sa: ${label}. Palitan`}>
          <span className="text-micro">Malapit sa</span>
          <span className="flex max-w-full items-center gap-1 text-section">
            <MapPin size={16} weight="fill" className="shrink-0 text-brand" aria-hidden />
            <span className="truncate">{label}</span>
            <CaretDown size={14} weight="bold" className="shrink-0 text-muted-foreground" aria-hidden />
          </span>
        </button>
        <LocationSheet open={open} onOpenChange={setOpen} />
      </>
    );
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center gap-2 text-left text-meta" role="status">
        <MapPin size={18} weight="fill" className="shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          Malapit sa: <span className="font-semibold text-foreground">{label}</span>
        </span>
        <span className="shrink-0 font-semibold text-brand">Palitan</span>
      </button>
      <LocationSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
