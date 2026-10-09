# TASKS.md — Busog Budget (deadline Oct 10, 10:00 AM)

Roles: **FE** = Frontend · **AI** = Local model · **DATA** = Data/scraper · **PITCH** = Pitch/demo.
Rule: the end-to-end flow (type request → see a result) must work with mock data and the rule parser **before** anything fancy.

## Timeline (Oct 9 → Oct 10)
| Time | Milestone |
|---|---|
| 3:00 PM | Kickoff, read SPEC.md, repo set up |
| 7:00 PM | **M1 — E2E with mocks:** request → rule parser → ranking → 3 cards |
| 12:00 AM | **M2 — Local AI in:** LLM parse + reason, embeddings taste, real catalog |
| 4:00 AM | **M3 — Polish:** setup flow, offline/PWA, deployed on Vercel |
| **6:00 AM** | **FEATURE FREEZE.** Only bug fixes, demo video, README |
| 8:30 AM | Demo video uploaded, repo public, README final |
| 9:30 AM | Submit (30 min buffer) |

## Phase 1 — Core flow (by M1)
| # | Owner | Task | Done when |
|---|---|---|---|
| 1 | FE | Next.js + Tailwind + shadcn scaffold, `lib/types.ts` from SPEC §3–4 | `npm run dev` shows home; types compile |
| 2 | DATA | Mock `public/catalog.json`: 4 chains × ~10 items, 8 branches near venue | Validates against types; FE loads it |
| 3 | AI | `lib/parse/rules.ts` rule parser + `validate.ts` | ≥10 of 15 cases in tests/prompts.md pass |
| 4 | FE | `lib/rank/combos.ts` + `score.ts` + `distance.ts` (SPEC §5–6) | Unit test: "₱150, 1 person" returns 3 combos all ≤ ₱150 |
| 5 | FE | Home (text box + chips) → Results (3 cards, filter chips, template reason) | Typing request #1 shows 3 cards on phone |
| 6 | PITCH | Write the demo story + pick 3 demo requests; find demo location | Script v1 in `docs/demo.md` |

## Phase 2 — Local AI + real data (by M2)
| # | Owner | Task | Done when |
|---|---|---|---|
| 7 | AI | WebLLM in a Web Worker: load, progress callback, `generate()` | Qwen 1.5B loads on a laptop + one Android phone; progress logged |
| 8 | AI | Parse prompt (SPEC §4.2) + fallback chain (§4.3), 4 s timeout | ≥13 of 15 test cases pass with LLM; broken output never crashes |
| 9 | AI | Reason prompt (SPEC §7), batched for top 3 | 3 reasons in < 5 s on laptop, template fallback works |
| 10 | AI | transformers.js MiniLM embeddings, cache item vectors in IndexedDB | Taste score changes after picking 3 chicken meals |
| 11 | DATA | Scraper for 4 chains → `catalog.json` (+ `manual_fixes.csv` for prices/tags/fill_score) | ≥60 real items, prices dated, source URL per chain |
| 12 | DATA | Branches: coords + hours for demo area (verify on Google Maps manually) | ≥10 branches, spot-checked 3 |
| 13 | FE | IndexedDB store: prefs, taste, picks; "Ito na!" updates taste + opens Maps | Reload keeps prefs and taste |

## Phase 3 — Polish (by M3)
| # | Owner | Task | Done when |
|---|---|---|---|
| 14 | FE | Setup flow: 6 tap-card steps (SPEC §8.1) | New user finishes in ≤ 30 s |
| 15 | AI+FE | Download UX (SPEC §9): ask, WebGPU check, persist(), progress, simple mode | Fresh phone: can search before model finishes |
| 16 | FE | PWA: manifest, icons, service worker caching shell + catalog | Airplane mode: app opens and returns results |
| 17 | FE | Settings screen + model status pill | Can reset taste, see storage persisted |
| 18 | FE | Deploy to Vercel | Public URL works on phone |
| 19 | PITCH | Slides (problem, why local, live demo, architecture, disclosures) | Dry run under time limit |

## After freeze (6 AM →)
| # | Owner | Task | Done when |
|---|---|---|---|
| 20 | ALL | Bug bash on 2 phones using tests/prompts.md | No crash on any of 15 requests |
| 21 | PITCH | Record demo video, **include airplane-mode moment** | Uploaded, link in README |
| 22 | PITCH+AI | README.md: setup, local vs internet, why local AI, full disclosures | Every model/lib/data source/AI tool listed |
| 23 | ALL | Repo public, submission form filled | Submitted before 9:30 AM |

## Cut list (drop in this order if behind)
1. Settings screen (keep only "reset" button on home)
2. Small-model option (ship one model)
3. LLM reason line (template only — keep LLM parsing)
4. Embeddings (taste = tag counts only)
5. Real scraper (hand-entered catalog from menu photos — disclose it)
