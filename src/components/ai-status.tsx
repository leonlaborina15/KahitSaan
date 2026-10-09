"use client";

import { Sparkle } from "@phosphor-icons/react";

export type AiStatus = { state: "ready" } | { state: "loading"; pct: number } | { state: "basic" };

/** Until the local model lands (TASKS 3.6) the app runs in Basic mode. */
export function useAiStatus(): AiStatus {
  return { state: "basic" };
}

/** Ube = on-device AI, everywhere. */
export function AiStatusPill({ status }: { status: AiStatus }) {
  const base = "flex items-center gap-1.5 rounded-full border border-ube/25 bg-ube-soft px-3 py-1.5 text-xs font-semibold text-ube";
  if (status.state === "loading")
    return (
      <span className={base} role="status">
        <Sparkle size={14} weight="duotone" aria-hidden /> AI naglo-load {status.pct}%
        <span className="h-1 w-10 overflow-hidden rounded-full bg-ube/20" aria-hidden>
          <span className="block h-full bg-ube" style={{ width: `${status.pct}%` }} />
        </span>
      </span>
    );
  return (
    <span className={base} role="status">
      <span className={status.state === "ready" ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-ube/50"} aria-hidden />
      {status.state === "ready" ? "AI handa" : "Basic mode"}
    </span>
  );
}
