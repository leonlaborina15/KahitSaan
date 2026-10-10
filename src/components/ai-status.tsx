"use client";

export type AiStatus = { state: "ready" } | { state: "loading"; pct: number } | { state: "basic" };

/** Until the local model lands (TASKS 3.6) the app runs in Basic mode. */
export function useAiStatus(): AiStatus {
  return { state: "basic" };
}

/** Plain micro text with a status dot. */
export function AiStatusPill({ status }: { status: AiStatus }) {
  const base = "flex items-center gap-1.5 text-micro";
  if (status.state === "loading")
    return (
      <span className={base} role="status">
        <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> AI naglo-load {status.pct}%
      </span>
    );
  return (
    <span className={base} role="status">
      <span className={status.state === "ready" ? "size-1.5 rounded-full bg-brand" : "size-1.5 rounded-full bg-muted-foreground"} aria-hidden />
      {status.state === "ready" ? "AI handa" : "Basic mode"}
    </span>
  );
}
