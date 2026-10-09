# KahitSaan Architecture

Everything runs on the phone. No server, no cloud AI, no login (AGENTS.md rules 1–3).
"Backend" here means the engine in `src/lib/`: pure TypeScript that parses, ranks, explains and remembers.

Status keys: ✅ exists · ✏️ change · 🆕 build · 🗑 remove

---

## 1. Features

### MVP (the demo flow)
| Feature | Screen | Engine | Status |
|---|---|---|---|
| First-open setup (budget, gusto, iwasan, appetite, unahin, chains) | `components/setup.tsx` | `savePrefs` | ✅ |
| Type a request in Taglish, or tap a quick chip | Home `app/page.tsx` | `search()` | ✅ UI · 🆕 `search()` |
| Parsed filters as editable chips | Results, `filter-chips.tsx` | `filtersFromRequest` | ✅ |
| Best pick + alternatives, each with ₱, km, ~min, reason | Results `app/results/page.tsx` | `explore`, `templateReason` | ✅ |
| Location: GPS (5 s), else a Cabanatuan landmark | `location.tsx` | `distanceKm` | ✅ |
| Hide closed branches, breakfast-only items after 10:00, avoided food | — | `isOpen`, `isAvailable`, `isAvoided` | ✅ |
| "Ito na!" → remembers the pick, opens Google Maps | Confirm sheet | `recordPick`, `addHistory`, `mapsUrl` | ✅ |
| Taste memory: next search leans to what you pick | — | `tasteScore` | ✅ v0 (tags) · 🆕 embeddings |
| Explain empty/thin results ("₱20 kulang", "sarado lahat") | Results | `notesFor` | 🆕 |
| Works in airplane mode | all | service worker | 🆕 |
| AI status pill: "AI handa" / "Downloading 42%" / "Basic mode" | `ai-status.tsx` | `aiStatus` | ✅ static · 🆕 live |

### Built extras (keep, don't extend)
| Feature | Screen | Engine |
|---|---|---|
| Kahit Saan: one random good pick, "Iba naman", "Ayoko nito" (hide 7 days) | `app/kahit-saan` | `pickWeighted`, `addNope` |
| Kinain: history + 👍/👎 rating | `app/kinain`, Home rating card | `addHistory`, `updateHistory` |
| Saved meals and chains | `app/saved` | `toggleSavedItem`, `toggleSavedChain` |
| Ako: edit defaults, reset taste, erase everything | `app/ako` | `savePrefs`, `resetTaste`, `clearAll` |

### Local AI (after real data)
| Feature | Replaces | Fallback |
|---|---|---|
| LLM request parsing | rule parser | rule parser (always) |
| LLM one-line reason | template reason | template (always) |
| Embedding taste match | tag-count affinity | tag counts |
| Model download screen (ask, WebGPU check, progress, persist) | — | Basic mode |

### Not building
Accounts, cloud sync/storage, ordering, payment, reviews, live scraping, other cities.

---

## 2. Layers

```
┌─ UI (React, src/app + src/components) ──────────────────────────────────────┐
│  Home · Results · Kahit Saan · Kinain · Saved · Ako · Setup                  │
│  useApp() context (app-data.tsx): state + IndexedDB, no ranking logic        │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ parseRequest · runSearch     upgradeReasons(...)
┌───────────────▼─ ENGINE (pure TS, src/lib, no React, testable) ─────────────┐
│  engine.ts   parseRequest → resolve → runSearch (explore + notes) → reasons │
│  parse/      rules.ts · validate.ts · filters.ts                             │
│  rank/       combos.ts · explore.ts · taste.ts · distance.ts · reason.ts     │
│  ai/         llm.ts · embed.ts · prompts.ts   (talk to workers)              │
│  store/      db.ts · history.ts   (IndexedDB via idb-keyval)                 │
└───────┬───────────────────────────────┬──────────────────────────────────────┘
        │ postMessage                   │ postMessage
┌───────▼────────────────┐   ┌──────────▼──────────────┐
│ llm.worker.ts          │   │ embed.worker.ts         │
│ WebLLM, WebGPU         │   │ transformers.js, WASM   │
│ Qwen2.5-1.5B / 0.5B    │   │ MiniLM-L6-v2 (q8)       │
└────────────────────────┘   └─────────────────────────┘
        ▲ weights: Cache API (WebLLM)     ▲ weights: Cache API (transformers.js)

public/catalog.json ── bundled into the JS (import) + cached by sw.js ── read-only
```

**Rules**
- The UI calls the engine; it never ranks or parses itself.
- The engine never imports React and never touches `window` except in `ai/` and `store/`.
- Heavy AI only in workers. The main thread never waits on a model to show results.
- Every AI step has a non-AI fallback that gives a complete answer by itself.

---

## 3. Function list

### `lib/engine.ts` 🆕 — single entry point
| Function | What it does |
|---|---|
| `parseRequest(text, prefs, opts) → Promise<Parsed>` 🆕 | Text → filters. Uses `opts.llm` if given (4 s timeout), else / on failure the rule parser. Returns `{ filters, fromSetup, parser: "llm" \| "rules" }`. |
| `runSearch(filters, ctx) → { results, notes }` 🆕 | Sync. Runs `explore` and `notesFor`. Called again on every chip edit, no parsing. `ctx` = catalog, prefs, taste, here, now, sort, exclude. |
| `search(text, ctx) → Promise<Parsed & { results, notes }>` 🆕 | Both in one call (Kahit Saan, tests). |
| `upgradeReasons(request, results) → Promise<string[] \| null>` 🆕 (AI phase) | After results are on screen, asks the LLM for better reasons in one call. `null` = keep templates. UI swaps text in place. |
| `notesFor(filters, results, ctx) → Note[]` 🆕 | Why results are empty or thin: budget too low (cheapest option + how much more), all closed ("bukas ng 6:00 AM"), nothing within the distance limit, group bigger than any bundle. |

### `lib/parse/` — request → filters
| Function | What it does | Status |
|---|---|---|
| `parseRules(text) → Filters` | Regex + keyword parser (budget, people, hunger, urgency, distance, cravings, avoid, chains, time). Basic mode. 15/15 on `tests/prompts.md`. | ✅ |
| `parseJsonLoose(text) → unknown` | `JSON.parse`, else first `{…}` block. For LLM output. | ✅ |
| `validateFilters(raw) → Filters` | Keeps valid fields only, defaults the rest (SPEC §4.1). Garbage in → safe filters out. | ✅ |
| `resolveFilters(f, prefs, now) → ResolvedFilters` | Fills nulls from setup: budget, hunger from appetite, avoid from dislikes + pork, time of day. | ✅ |
| `filtersFromRequest(text, prefs, now)` | Request + setup → `ExploreFilters` + which chips came from setup. | ✏️ move out of `app-data.tsx` into `parse/filters.ts`; take parsed `Filters` as input so LLM and rules share it |

### `lib/rank/` — filters → ranked meals
| Function | What it does | Status |
|---|---|---|
| `distanceKm(a, b)` | Haversine, straight line in km. | ✅ |
| `travelMinutes(km)` | km × 1.3 road factor × 12 min/km (walking). | ✅ |
| `isOpen(branch, now)` | Open now; handles 24h and past-midnight closing. | ✅ |
| `mealPeriod(now)` | breakfast / lunch / merienda / dinner / late. | ✅ |
| `isAvailable(item, now)` | Hides `breakfast_only` outside 05:00–10:00. | ✅ |
| `isAvoided(item, avoid)` | Pork (incl. `unknown`), beef, seafood, spicy, any tag. | ✅ |
| `buildCombos(menu, filters)` | One chain's menu → up to 40 combos under budget: singles, meal + add-on, hungry extras, group bundles / meal × people. | ✅ |
| `isPeak(now)`, `speedOf(wait)` | Lunch/dinner rush; fast / ok / slow label. | ✅ |
| `openStatus(branch, now)` | "Bukas 24 oras" / "Bukas hanggang 10 PM" / "Magsasara na in 20 min" / "Sarado, bukas ng 6 AM". | ✅ |
| `branchOption(catalog, branch, here, now)` | Distance, walk min, wait min (chain wait by meal period), speed, open status for one branch. | ✅ |
| `branchesFor(catalog, chain, here, now)` | All branches of a chain, nearest first (Saved, confirm sheet). | ✅ |
| `unahinWeights(filters)` | Weights from Unahin tap order (0.40/0.30/0.20/0.10/0.05) + request boosts, normalized. | ✅ (SPEC §5.2 ✏️ to match) |
| `explore(input) → ItemResult[]` | Main ranker: hard filters → combos → sub-scores (cheap, fast, near, filling, taste) → score → one card per meal at its best branch → sort. | ✅ |
| `comboKey(items)` | Stable key for a combo (sorted item ids). | ✅ |
| `pickWeighted(list, rand)` | Random pick weighted by score (Kahit Saan). | ✅ |
| `templateReason(r, w, f)` | "₱139 lang, ~9 min, 0.4 km — sakto sa gutom mo." Non-AI reason. | ✅ |
| `tasteScore(items, prefs, taste, f, vecs?)` | 0–1 taste match. v0: tag counts + favorites + cravings + chain habit. v1: + cosine(taste vector, combo vector) when vectors exist. | ✏️ move to `rank/taste.ts`, add optional `vecs` |
| `rank()`, `weights()` in `score.ts` | Older ranker with SPEC §5.2 weights; screens don't use it. | 🗑 (port its tests to `explore`) |

### `lib/store/` — IndexedDB (all on the phone)
| Function | What it does | Status |
|---|---|---|
| `loadPrefs` / `savePrefs` / `clearPrefs` | Setup answers. | ✅ |
| `loadTaste` / `resetTaste` | Taste profile. | ✅ |
| `recordPick(items)` | 👍 signal: +1 tag/chain counts, recent picks. | ✅ |
| `recordVote(items, -1)` | 👎 rating counts against those tags/chain. | 🆕 |
| `updateTasteVector(items, vecs)` | `normalize(0.8·v + 0.2·embed(item))` on pick (SPEC §3.4). | 🆕 (AI phase) |
| `loadPlace` / `savePlace` | Last GPS or landmark. | ✅ |
| `loadHistory` / `addHistory` / `updateHistory` / `recentlyEaten` | Kinain list (last 200) + ratings. | ✅ |
| `loadSaved` / `toggleSavedItem` / `toggleSavedChain` | Saved meals and chains. | ✅ |
| `addNope` / `loadNope` | "Ayoko nito" for 7 days. | ✅ |
| `loadAIChoice` / `saveAIChoice` | `"full" \| "small" \| "later" \| "none"` from the download card. | 🆕 |
| `loadItemVecs` / `saveItemVecs` | Item embeddings, keyed by catalog `version`. | 🆕 |
| `persistStorage()` | `navigator.storage.persist()`, result shown in Ako. | 🆕 |
| `clearAll()` | "Burahin lahat" (also clears AI choice + vectors). | ✏️ |

### `lib/ai/` — local AI 🆕 (details in §4)
| Function | What it does |
|---|---|
| `detectAI() → { webgpu, saveData, slowNet, recommended }` | WebGPU check + connection hints → recommends full / small / later / none. |
| `loadLLM(model, onProgress)` | Starts `llm.worker.ts`, loads weights (download first time, cache after). Progress 0–100 + text. |
| `llmStatus()` / `onLLMStatus(cb)` | `unsupported \| idle \| downloading \| loading \| ready \| error` for the pill. |
| `generate(messages, opts, timeoutMs)` | One chat completion in the worker. Rejects on timeout; interrupts the worker. |
| `deleteModel()` | Removes cached weights (Ako → "Burahin ang AI"). |
| `llmParse(text) → Filters \| null` | SPEC §4.2 prompt + few-shot, `temperature 0`, JSON mode, 4 s timeout → `parseJsonLoose` → `validateFilters`. `null` = use rules. |
| `llmReasons(request, results) → string[] \| null` | SPEC §7 prompt, 3 results in one call, one line each. Each line checked (≤ 18 words, only ₱/km/min from the facts); bad line → template for that card. |
| `loadEmbedder()` / `embed(texts)` | Starts `embed.worker.ts` (MiniLM, WASM), returns 384-d normalized vectors. |
| `ensureItemVecs(catalog)` | Embeds all items once per catalog version, saves to IndexedDB. Runs idle in the background. |
| `cosine(a, b)` | Dot product of normalized vectors. |
| `prompts.ts`: `PARSE_SYSTEM`, `PARSE_FEWSHOT`, `REASON_SYSTEM`, `parseMessages`, `reasonMessages` | Exact prompt text from SPEC §4.2 and §7. |

### `public/sw.js` + `app/manifest.ts` 🆕 — offline
| Piece | What it does |
|---|---|
| `sw.js` install | Precaches app shell, routes, `catalog.json`, icons. |
| `sw.js` fetch | Cache-first for app files; network-first for page HTML with cache fallback. Never caches model files (WebLLM / transformers.js manage their own cache). |
| `manifest.ts` | Name, icons, colors, `display: standalone` → installable on Android. |

---

## 4. Local AI architecture

### 4.1 Two models, two workers
| | LLM | Embeddings |
|---|---|---|
| Job | Parse request → JSON; write reasons | Taste similarity |
| Library | `@mlc-ai/web-llm` | `@huggingface/transformers` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (~1 GB); small: `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (~0.4 GB) | `Xenova/all-MiniLM-L6-v2` q8 (~23 MB) |
| Runs on | WebGPU only | WASM (every phone) |
| Worker | `llm.worker.ts` (WebLLM `WebWorkerMLCEngineHandler`) | `embed.worker.ts` (feature-extraction pipeline, mean pool, normalize) |
| Weight cache | Cache API, managed by WebLLM | Cache API, managed by transformers.js |
| No WebGPU | Not used → Basic mode | Still runs |

Separate workers so embeddings work on phones without WebGPU, and a stuck LLM never blocks taste scoring.
Weights download once from the model hosts (Hugging Face / MLC). That's a file download, not inference. Disclose it in the README. After that, no network.

### 4.2 Status (shown in the pill)
```
              no WebGPU
  start ─────────────────────────────► unsupported  ("Basic mode")
    │
    ├─ ai_choice = later/none ───────► idle         ("Basic mode" + "I-download" in Ako)
    │
    ├─ first time ─► ask card ─► downloading (%) ─► loading ─► ready ("AI handa · offline")
    │                                   │              │
    └─ cached ──────────────────────────┴──────────────┘
                                        └─ error ─► idle (Basic mode, retry in Ako)
```
- Ask once in setup (after step 1): *Download now* / *Small model* / *Later*. Save the answer; never ask again on reopen.
- `saveData` or 2g/3g → recommend small or later.
- `navigator.storage.persist()` before downloading.
- On reopen with weights cached: load in the background, no prompt.

### 4.3 Search flow with AI
```
user taps Hanapin
  │
  ├─ LLM ready? ── yes ─► llmParse (≤ 4 s) ── ok ─► filters
  │                         └─ timeout / bad JSON ─► parseRules ─► filters
  └─ no ──────────────────────────────────────────► parseRules ─► filters
  │
  resolveFilters + chip overrides ─► explore() (sync, ~ms) ─► notesFor()
  │
  show results now, with template reasons
  │
  └─ LLM ready? ─► upgradeReasons (one call, 3 lines) ─► swap reason text in place
                     └─ fail / timeout ─► keep templates
```
- Results never wait for the reason line.
- A new search interrupts any running generation (`interruptGenerate`).
- Chip edits re-run `explore()` only; no LLM call.

### 4.4 Taste with embeddings
1. First run after the embedder loads: `ensureItemVecs` embeds `name + ". " + desc` for every item, saved under the catalog version. ~100 items, a few seconds, in the background.
2. Taste vector starts as `embed("likes: " + favorite_foods)`.
3. On "Ito na!": `v = normalize(0.8·v + 0.2·mean(item vecs))`. On 👎: `v = normalize(v − 0.1·mean(item vecs))`.
4. `tasteScore` uses cosine when vectors exist, else tag counts. Ranking stays synchronous because vectors are looked up from a map, not computed during the search.

### 4.5 Guardrails
- LLM output is never trusted: `validateFilters` drops anything off-contract; reasons are checked against the facts.
- `temperature: 0`, `max_tokens: 120`, JSON mode for parsing.
- One generation at a time; queue of 1 (newest wins).
- Main thread only sends messages and receives results.
- No `fetch` to any AI API anywhere in `src/` (enforced by the repo hook).

### 4.6 Test plan
| Test | How |
|---|---|
| Rule parser 15/15 | `tests/parse.test.ts` (exists) |
| LLM parser ≥ 13/15 | `parser-test` skill with LLM output pasted in; Qwen vs Llama-3.2-1B (TASKS 3.3) |
| Garbage LLM output never crashes | Unit tests on `parseJsonLoose` + `validateFilters` with junk strings |
| Reason checker | Unit tests: too long / wrong price → template |
| Engine golden scenarios | ~10 request → expected result tests on `search()` with rules parser |
| Offline | Load once → airplane mode → reload → search + reason work |

---

## 5. Build order
B1 commit dataset work → D1 CSV templates (DATA starts) → B2 drop old ranker, SPEC §5.2 → B3 `engine.ts` + move `filtersFromRequest` → B4 `notesFor` → B5 👎 votes → B6 golden scenarios → B7 offline (sw + manifest) → D2 `build.py` → D3 real data → AI: workers → `llmParse` → download UX → `llmReasons` → embeddings.
