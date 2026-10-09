"use client";

import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one selected style used everywhere: primary fill + white text + check. */
export function SelectTile({
  on,
  onClick,
  Icon,
  label,
  helper,
  badge,
  layout = "tile",
  accent,
}: {
  on: boolean;
  onClick: () => void;
  Icon?: LucideIcon;
  label: string;
  helper?: string;
  badge?: React.ReactNode;
  layout?: "tile" | "row";
  /** Left color accent (chain color). */
  accent?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={accent ? { borderLeft: `6px solid ${accent}` } : undefined}
      className={cn(
        "relative flex min-h-11 rounded-2xl border text-left transition-colors duration-150",
        layout === "tile" ? "flex-col items-center justify-center gap-2 p-3 text-center" : "items-center gap-4 p-4",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-brand/50",
      )}
    >
      {Icon && (
        <span
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-white/20" : "bg-primary-soft text-primary")}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
      )}
      <span className="flex flex-col">
        <span className={cn("font-semibold", layout === "tile" ? "text-sm" : "text-base")}>{label}</span>
        {helper && <span className={cn("text-sm", on ? "text-white/85" : "text-muted-foreground")}>{helper}</span>}
      </span>
      {badge ??
        (on && (
          <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-primary" aria-hidden>
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ))}
    </button>
  );
}

export function SelectChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-brand/50",
      )}
    >
      {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  );
}
