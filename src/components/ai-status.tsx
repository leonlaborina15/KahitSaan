"use client";

import { cn } from "@/lib/utils";

export type AiStatus = { state: "ready" } | { state: "loading"; pct: number } | { state: "basic" };

/** Until the local model lands (TASKS 3.6) the app runs in Basic mode. */
export function useAiStatus(): AiStatus {
  return { state: "basic" };
}

export function AiStatusPill({ status }: { status: AiStatus }) {
  if (status.state === "loading")
    return (
      <span className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium" role="status">
        AI naglo-load {status.pct}%
        <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full bg-brand" style={{ width: `${status.pct}%` }} />
        </span>
      </span>
    );
  const ready = status.state === "ready";
  return (
    <span className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium" role="status">
      <span className={cn("size-2 rounded-full", ready ? "bg-success" : "bg-muted-foreground/60")} aria-hidden />
      {ready ? "AI handa" : "Basic mode"}
    </span>
  );
}
