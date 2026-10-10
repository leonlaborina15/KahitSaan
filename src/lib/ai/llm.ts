// On-device LLM (WebLLM in a Web Worker). Optional: everything works without it (AGENTS.md rule 5).
import type { ChatCompletionMessageParam, MLCEngineInterface } from "@mlc-ai/web-llm";
import { get, set } from "idb-keyval";
import { catalog } from "@/lib/catalog";
import { parseRules } from "@/lib/parse/rules";
import { parseJsonLoose, validateFilters } from "@/lib/parse/validate";
import type { Filters } from "@/lib/types";
import { PARSE_SHOTS, PARSE_SYSTEM, REASON_SYSTEM, reasonUser, type ReasonFacts } from "./prompts";

export const MODELS = {
  big: { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B", size: "~1 GB" },
  small: { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B", size: "~400 MB" },
} as const;
export type ModelSize = keyof typeof MODELS;

export type LlmStatus =
  | { state: "basic"; reason: "not-downloaded" | "no-webgpu" | "error" }
  | { state: "loading"; pct: number; text: string }
  | { state: "ready"; model: ModelSize };

const MODEL_KEY = "ai_model";

let status: LlmStatus = { state: "basic", reason: "not-downloaded" };
let engine: MLCEngineInterface | null = null;
let started = false;
const listeners = new Set<() => void>();

function setStatus(s: LlmStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export const getLlmStatus = () => status;
export function subscribeLlm(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export const hasWebGPU = () => typeof navigator !== "undefined" && "gpu" in navigator;

/** Load (or download) a model. Safe to call again; later calls are ignored while one is loading. */
export async function loadModel(size: ModelSize): Promise<void> {
  if (status.state === "loading" || (status.state === "ready" && status.model === size)) return;
  if (!hasWebGPU()) return setStatus({ state: "basic", reason: "no-webgpu" });
  setStatus({ state: "loading", pct: 0, text: "" });
  try {
    await navigator.storage?.persist?.().catch(() => false);
    await set(MODEL_KEY, size);
    const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
    const worker = new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module" });
    const next = await CreateWebWorkerMLCEngine(worker, MODELS[size].id, {
      initProgressCallback: (r) => setStatus({ state: "loading", pct: Math.round(r.progress * 100), text: r.text }),
    });
    engine?.unload().catch(() => {});
    engine = next;
    setStatus({ state: "ready", model: size });
  } catch (e) {
    console.warn("LLM load failed, staying in Basic mode", e);
    engine = null;
    setStatus({ state: "basic", reason: "error" });
  }
}

/** On app open: if a model was downloaded before, load it from cache without asking (SPEC §9). */
export async function initLlm(): Promise<void> {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!hasWebGPU()) return setStatus({ state: "basic", reason: "no-webgpu" });
  const size = await get<ModelSize>(MODEL_KEY).catch(() => undefined);
  if (!size || !MODELS[size]) return;
  const { hasModelInCache } = await import("@mlc-ai/web-llm");
  if (await hasModelInCache(MODELS[size].id).catch(() => false)) void loadModel(size);
}

// WebLLM handles one request at a time; queue calls.
let queue: Promise<unknown> = Promise.resolve();
function chat(messages: ChatCompletionMessageParam[], maxTokens: number): Promise<string | null> {
  const run = async () => {
    if (!engine) return null;
    const out = await engine.chat.completions.create({
      messages,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });
    return out.choices[0]?.message?.content ?? null;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => null);
  return p;
}

// Words the menu actually has; LLM cravings/avoids outside this set would filter out everything.
const VOCAB = new Set(
  catalog.items.flatMap((i) => [...i.tags, i.food_type, i.protein ?? "", ...i.name.toLowerCase().split(/[^a-z]+/)]).filter((w) => w.length > 2),
);
VOCAB.add("pork");

/**
 * Rule parse + LLM: rules win on what they detected (they're exact on numbers and keywords);
 * the LLM only fills what rules missed, and only with words the menu knows. Small models can't make it worse.
 */
export function mergeParses(rules: Filters, llm: Filters): Filters {
  const known = (ws: string[]) => ws.filter((w) => VOCAB.has(w));
  return {
    budget: rules.budget ?? (llm.budget && llm.budget >= 30 ? llm.budget : null),
    people: rules.people > 1 ? rules.people : llm.people,
    hunger: rules.hunger !== "normal" ? rules.hunger : llm.hunger,
    urgency: rules.urgency !== "normal" ? rules.urgency : llm.urgency,
    max_distance_km: rules.max_distance_km ?? (llm.max_distance_km && llm.max_distance_km >= 0.5 ? llm.max_distance_km : null),
    cravings: rules.cravings.length ? rules.cravings : known(llm.cravings),
    avoid: [...new Set([...rules.avoid, ...known(llm.avoid)])],
    chains: rules.chains.length ? rules.chains : llm.chains,
    time_context: rules.time_context ?? llm.time_context,
  };
}

/** Request text → Filters (SPEC §4). null when the model isn't ready or output is unusable. */
export async function llmParse(text: string): Promise<Filters | null> {
  if (!engine) return null;
  const out = await chat(
    [{ role: "system", content: PARSE_SYSTEM }, ...(PARSE_SHOTS as unknown as ChatCompletionMessageParam[]), { role: "user", content: text }],
    120,
  );
  const raw = out ? parseJsonLoose(out) : null;
  return raw && typeof raw === "object" ? mergeParses(parseRules(text), validateFilters(raw)) : null;
}

/** One batched call for the top results (SPEC §7). Returns null on any failure; caller keeps the template. */
export async function llmReasons(request: string, meals: ReasonFacts[]): Promise<(string | null)[] | null> {
  if (!engine || !meals.length) return null;
  const out = await chat(
    [
      { role: "system", content: REASON_SYSTEM },
      { role: "user", content: reasonUser(request || "kahit ano", meals) },
    ],
    60 * meals.length,
  ).catch(() => null);
  const raw = out ? (parseJsonLoose(out) as { reasons?: unknown } | null) : null;
  if (!raw || !Array.isArray(raw.reasons)) return null;
  return meals.map((_, i) => {
    const s = raw.reasons && (raw.reasons as unknown[])[i];
    if (typeof s !== "string") return null;
    const clean = s.replace(/[\p{Extended_Pictographic}]/gu, "").trim();
    return clean.length > 5 && clean.length < 160 ? clean : null;
  });
}
