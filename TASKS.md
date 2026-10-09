# TASKS.md — KahitSaan (deadline Oct 10, 10:00 AM)

**Build order:** UI first on mock data → real data → local AI → offline/deploy → cleanup → demo.
Each phase ends with a working app. Never break the main flow: *type request → see best pick*.

Roles: **FE** = Frontend · **AI** = Local model · **DATA** = Data/scraper · **PITCH** = Pitch/demo/QA.
Team strengths: React/Next ✔, WebLLM/transformers.js ✔, Python scraping ✘ (Firecrawl + OSM keep DATA simple).
Parallel rule: a phase's owner leads; people without a task in the current phase work on the **"prep"** items listed so they're ready when their phase starts.

## Timeline
| Phase | Time (Oct 9–10) | Goal | Gate (must be true to move on) |
|---|---|---|---|
| 0. Foundation | 4:00–5:30 PM | Install, types, mock catalog | `npm run dev` + types compile |
| 1. UI on mocks | 5:30–10:00 PM | All screens clickable, results from mock data | Full flow works on a phone, no AI |
| 2. Real data | 10:00 PM–12:30 AM | Cabanatuan catalog replaces mock | ≥60 items, ≥10 branches in app |
| 3. Local AI | 10:00 PM–2:30 AM | LLM parse + reason, embeddings taste | ≥13/15 prompts pass, airplane-mode search works |
| 4. Offline + deploy | 2:30–4:00 AM | PWA, Vercel | Public URL works offline on phone |
| 5. Cleanup + polish | 4:00–6:00 AM | Bugs, copy, perf | `demo-check` all ✅ |
| **FREEZE** | **6:00 AM** | No new features | |
| 6. Demo + submit | 6:00–9:30 AM | Video, README, submit | Submitted by 9:30 AM |

Phases 2 and 3 overlap on purpose: different owners, both plug into the same `Filters` / `catalog.json` contracts from Phase 0.

---

## Phase 0 — Foundation (all, 4:00–5:30 PM)
| # | Owner | Task | Done when |
|---|---|---|---|
| 0.1 | FE | Install deps: shadcn/ui, idb-keyval, vitest; `output: 'export'` in next.config | `npm run build` produces `out/` |
| 0.2 | FE | `lib/types.ts` from SPEC §3–4 (CatalogItem, Branch, Landmark, Prefs, TasteProfile, Filters, Combo, Result) | Compiles; AI + DATA reviewed it |
| 0.3 | DATA | Mock `public/catalog.json`: 4 chains × 10 items, 8 branches, 5 landmarks (approx coords OK, mark `"mock": true`) | Loads in app, matches types |
| 0.4 | PITCH | UI copy sheet in Taglish (buttons, empty states, errors) | `docs/copy.md` committed |

## Phase 1 — UI on mock data (FE leads, 5:30–10:00 PM)
Goal: whole app usable with **no AI** — rule parser + template reasons stand in.
| # | Owner | Task | Done when |
|---|---|---|---|
| 1.1 | FE | App shell: mobile layout, header with model-status pill (static "Simple mode" for now), bottom nav (Home / Settings) | Looks right at 375 px |
| 1.2 | FE | Setup flow: 6 tap-card steps (SPEC §8.1), saves `prefs` to IndexedDB, skip button | New user done in ≤30 s; reload skips setup |
| 1.3 | FE | Home: text box, 4 quick chips, location line with landmark picker fallback | Chips fill the box; landmark saves |
| 1.4 | AI | `lib/parse/rules.ts` + `validate.ts` (rule parser = Simple mode) | ≥10/15 in tests/prompts.md via `parser-test` |
| 1.5 | AI | `lib/rank/` combos + score + distance (SPEC §5–6), template reason | Vitest: "₱150, 1 person" → 3 results all ≤ ₱150 |
| 1.6 | FE | Results: editable filter chips, 1 big best card + 2 alts, "Ito na!" → save pick + Maps link | Request #1 shows results; editing a chip re-ranks |
| 1.7 | FE | Settings: edit prefs, reset taste, "data stays on this phone" note | Reset clears IndexedDB taste |
| 1.8 | FE | Taste memory v0: tag/chain counts from picks (no embeddings yet) | Picking chicken 3× moves chicken up |
| prep | DATA | Get Firecrawl key, test 1 chain page, write Overpass query | One chain's menu JSON printed |
| prep | AI | WebLLM hello-world in a Worker on laptop + flagship phone | Model loads, generates text on both |
| prep | PITCH | Demo story + 3 demo requests; QA each UI screen as it lands | Script v1 in `docs/demo.md` |

**Gate:** PITCH runs the full flow on the flagship phone with mock data, no crashes.

## Phase 2 — Real data (DATA leads, 10:00 PM–12:30 AM)
| # | Owner | Task | Done when |
|---|---|---|---|
| 2.1 | DATA | `scraper/branches.py` OSM Overpass for 4 chains in Cabanatuan + landmark coords | CSV of branches with lat/lng |
| 2.2 | DATA | Verify each branch on Google Maps, add missing, fill hours + base wait in `manual_fixes.csv` | ≥10 branches, all checked |
| 2.3 | DATA | `scraper/menus.py` Firecrawl JSON extract, 4 chains | Raw menu JSON per chain, source URL + date |
| 2.4 | DATA | Hand-label tags, protein, contains_pork, spicy, fill_score, prep_minutes | No item missing labels |
| 2.5 | DATA | `scraper/build.py` → `public/catalog.json` (remove `mock`) | `catalog` skill reports ✅; app shows real Cabanatuan results |

## Phase 3 — Local AI (AI leads, 10:00 PM–2:30 AM)
| # | Owner | Task | Done when |
|---|---|---|---|
| 3.1 | AI | `lib/ai/llm.worker.ts` + `llm.ts`: load Qwen2.5-1.5B, progress events, `generate()` | Progress % reaches UI pill |
| 3.2 | AI | Parse prompt (SPEC §4.2) + fallback chain (§4.3), 4 s timeout | ≥13/15 prompts; garbage output never crashes |
| 3.3 | AI | Compare Llama-3.2-1B on the 15 prompts; keep the winner | Result noted in SPEC §12 |
| 3.4 | AI | Reason prompt (SPEC §7), one batched call for 3 results | Reasons in <5 s on laptop; template on failure |
| 3.5 | AI | Embeddings: transformers.js MiniLM, item vectors cached in IndexedDB, taste vector update | Taste score shifts after 3 picks |
| 3.6 | FE+AI | Download UX (SPEC §9): ask card in setup, WebGPU check, `storage.persist()`, progress, Simple mode until ready, auto-upgrade | Fresh phone: searches during download, upgrades after |

## Phase 4 — Offline + deploy (FE leads, 2:30–4:00 AM)
| # | Owner | Task | Done when |
|---|---|---|---|
| 4.1 | FE | Manifest, icons, service worker caching shell + catalog | Installable on Android |
| 4.2 | FE | Deploy static export to Vercel | Public URL loads on phone |
| 4.3 | PITCH | Airplane-mode test on flagship phone | Search + AI reason work offline |

## Phase 5 — Cleanup + polish (all, 4:00–6:00 AM)
| # | Owner | Task | Done when |
|---|---|---|---|
| 5.1 | ALL | Bug bash: all 15 prompts + 4 junk inputs on 2 devices | No crash, issues fixed or cut |
| 5.2 | AI | Run `local-ai-reviewer` on `main` | "No violations." |
| 5.3 | FE | Remove create-next-app leftovers, dead code, console logs; loading/empty/error states | `npm run build` + `npm run lint` clean |
| 5.4 | PITCH | UI copy pass, chain logos/attribution | Copy matches `docs/copy.md` |
| 5.5 | ALL | `demo-check` skill | All ✅ |

## Phase 6 — Demo + submit (after FREEZE)
| # | Owner | Task | Done when |
|---|---|---|---|
| 6.1 | PITCH | Record demo video (setup → request → best pick → **airplane mode** → taste learns) | Uploaded, link in README |
| 6.2 | PITCH+AI | README: team, setup, local vs internet, why local AI, all disclosures, no `TODO` | Reviewed by all 4 |
| 6.3 | PITCH | Slides + dry run | Under time limit |
| 6.4 | ALL | Repo public, submission form | Submitted by 9:30 AM |

## Cut list (drop in this order if a gate is missed)
1. Settings screen (keep a reset button on Home)
2. Llama comparison (3.3) and small-model option
3. LLM reason line (template only; keep LLM parsing)
4. Embeddings (taste stays tag counts from 1.8)
5. Firecrawl (hand-enter menus from photos, disclose it)
