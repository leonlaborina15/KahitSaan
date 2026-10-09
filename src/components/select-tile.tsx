"use client";

import { Check, type Icon } from "@phosphor-icons/react";
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
  Icon?: Icon;
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
        "relative flex min-h-11 rounded-[24px] border text-left transition-colors duration-150",
        layout === "tile" ? "flex-col items-center justify-center gap-2 p-3 text-center" : "items-center gap-4 p-4",
        on ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "bg-card hover:border-brand/50",
      )}
    >
      {Icon && (
        <span
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-[16px]", on ? "bg-white/20" : "bg-surface-2 text-primary")}
          aria-hidden
        >
          <Icon size={24} weight="duotone" />
        </span>
      )}
      <span className="flex flex-col">
        <span className={cn("font-semibold", layout === "tile" ? "text-sm" : "text-base")}>{label}</span>
        {helper && <span className={cn("text-sm", on ? "text-white/85" : "text-muted-foreground")}>{helper}</span>}
      </span>
      {badge ??
        (on && (
          <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-primary" aria-hidden>
            <Check size={12} weight="bold" />
          </span>
        ))}
    </button>
  );
}

export function SelectChip({
  on,
  onClick,
  children,
  rank,
  tag,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Unahin order badge. */
  rank?: number;
  /** Tiny "setup" tag. */
  tag?: string;
}) {
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
      {on && rank !== undefined ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary" aria-label={`Pang-${rank}`}>
          {rank}
        </span>
      ) : (
        on && <Check size={16} weight="bold" aria-hidden />
      )}
      {children}
      {tag && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", on ? "bg-white/20" : "bg-muted text-muted-foreground")}>{tag}</span>}
    </button>
  );
}
