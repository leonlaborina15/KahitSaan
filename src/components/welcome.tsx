"use client";

import { StickyActions } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

function PlateArt() {
  // Plate + map pin, simple shapes.
  return (
    <svg viewBox="0 0 240 200" className="h-auto w-full max-w-[280px]" role="img" aria-label="Plato at map pin">
      <ellipse cx="120" cy="172" rx="88" ry="12" fill="#EDE6DE" />
      <circle cx="120" cy="110" r="72" fill="#FFFFFF" stroke="#EDE6DE" strokeWidth="4" />
      <circle cx="120" cy="110" r="52" fill="#FDE7DF" />
      <circle cx="104" cy="104" r="16" fill="#E9A23B" />
      <circle cx="136" cy="118" r="12" fill="#2F9E6B" />
      <rect x="22" y="70" width="8" height="80" rx="4" fill="#78716C" />
      <rect x="210" y="70" width="8" height="80" rx="4" fill="#78716C" />
      <path d="M150 18c-17 0-30 13-30 30 0 22 30 52 30 52s30-30 30-52c0-17-13-30-30-30z" fill="#E8552D" />
      <circle cx="150" cy="48" r="11" fill="#FFFFFF" />
    </svg>
  );
}

export function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
        <PlateArt />
        <h1 className="text-[28px] leading-tight">
          Saan tayo kakain? <span className="text-primary">Kahit saan,</span> basta pasok sa budget.
        </h1>
        <p className="text-muted-foreground">30 seconds lang ang setup. Nasa phone mo lang ang info mo.</p>
      </div>
      <StickyActions>
        <div className="flex w-full flex-col items-center gap-2">
          <Button size="lg" className="h-12 w-full text-base" onClick={onStart}>
            Simulan na!
          </Button>
          <button type="button" onClick={onSkip} className="min-h-11 px-4 text-sm font-medium text-muted-foreground underline">
            Laktawan
          </button>
        </div>
      </StickyActions>
    </div>
  );
}
