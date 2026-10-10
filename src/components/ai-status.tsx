"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getLlmStatus, initLlm, subscribeLlm, type LlmStatus } from "@/lib/ai/llm";

export type AiStatus = LlmStatus;

const SERVER: AiStatus = { state: "basic", reason: "not-downloaded" };

/** Live local-model status. Basic mode until a model is downloaded and loaded (SPEC §9). */
export function useAiStatus(): AiStatus {
  useEffect(() => void initLlm(), []);
  return useSyncExternalStore(subscribeLlm, getLlmStatus, () => SERVER);
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
      {status.state === "ready" ? "AI handa · offline" : "Basic mode"}
    </span>
  );
}
