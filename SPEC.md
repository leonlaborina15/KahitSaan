# KahitSaan — Product & Technical Spec

> "₱150 lang, gutom na gutom, ayoko ng matagal, malapit lang." → best meal near you, picked by AI running on your phone.

## 1. Scope

**MVP (only these):** first-open setup · plain-language request · best meal/combo under budget · distance + speed ranking · taste memory · one-line reason.
**Not building:** accounts, live scraping, reviews, ordering, payment, multi-city coverage.

**Demo area:** Cabanatuan City, Nueva Ecija only. Catalog covers 4 chains: Jollibee, McDonald's, Mang Inasal, Chowking.
**Demo device:** laptop (Chrome, WebGPU) + 1 flagship Android (Chrome, WebGPU). Hosted as a fully static site — no server at all.

## 2. Architecture

```
[one-time, build time, cloud]
  Firecrawl (menus, JSON extract) ─┐
  OSM Overpass (branch locations) ─┼─► scraper/ (Python) + manual_fixes.csv ──► public/catalog.json
  Google Maps (manual hours check) ┘     (committed, bundled, cached by service worker)

[on device]
  request text ──► Parser ──► Filters JSON ──► Ranker (TS) ──► Combo builder (TS) ──► Best + 2 alts
                    │  LLM (WebLLM)            ▲ taste score (embeddings)                │
                    └─ fallback: regex parser  │                                        ▼
                                          IndexedDB: prefs, taste profile, picks   LLM writes 1-line reason
                                                                                    (fallback: template)
```

| Piece | Choice | Size | Notes |
|---|---|---|---|
| LLM | WebLLM `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | ~1.0 GB | Needs WebGPU. Low-end option: `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (~0.4 GB) |
| Embeddings | transformers.js `Xenova/all-MiniLM-L6-v2` (q8) | ~23 MB | Runs on WASM, works without WebGPU |
| Storage | IndexedDB via `idb-keyval` | — | prefs, taste, picks, model cache (WebLLM uses Cache API) |
| Offline | Service worker caches app shell + catalog.json | — | App works in airplane mode after first load |
| Hosting | Next.js `output: 'export'` on Vercel | — | Static files only; no API routes |
| Tests | Vitest | — | parser (tests/prompts.md) + ranker |

**Rule: no AI server, no cloud AI API. Ever.**

## 3. Data shapes

### 3.1 Catalog item (`catalog.json → items[]`)
```json
{
  "id": "jb-chickenjoy-1pc-rice",
  "chain": "jollibee",
  "name": "1-pc Chickenjoy with Rice",
  "price": 99,
  "category": "meal",
  "tags": ["chicken", "fried", "rice"],
  "protein": "chicken",
  "contains_pork": false,
  "spicy": false,
  "fill_score": 3,
  "prep_minutes": 4,
  "serves": 1,
  "desc": "Crispy fried chicken with steamed rice and gravy",
  "food_type": "chicken",
  "includes": "1 pc Chickenjoy, rice, gravy",
  "breakfast_only": false
}
```
Full field rules, tag list and the CSV source sheets: `docs/dataset.md`.
- `contains_pork`: `true | false | "unknown"`. `"unknown"` counts as pork when the user avoids pork.
- `breakfast_only`: shown only in the breakfast period (05:00–10:00).
- `tags`: only words from the tag list in `docs/dataset.md`, so parser cravings match.
- `category`: `meal | main | side | drink | dessert | bundle`
- `fill_score`: 0 (drink) – 5 (very busog) for one person. Bundles: total for the whole group (e.g. 4 people × 4 = 16). Hand-labeled.
- `prep_minutes`: estimate. Default by category: side/drink 2, meal 4, grilled/made-to-order 8. Chain base added from branch.
- `serves`: 1, or 3–6 for bucket/family bundles.

### 3.2 Branch (`catalog.json → branches[]`)
```json
{
  "id": "jb-sm-cabanatuan",
  "chain": "jollibee",
  "name": "Jollibee SM City Cabanatuan",
  "lat": 15.4900,
  "lng": 120.9700,
  "hours": { "open": "06:00", "close": "22:00" },
  "is_24h": false,
  "base_wait_minutes": 5,
  "has_drive_thru": false,
  "source": "osm:node/123456, hours checked on Google Maps 2026-10-09"
}
```
(Coordinates above are placeholders — real values come from OSM.)
Items are chain-wide (same menu at every branch of a chain). `catalog.json` = `{ "version": "2026-10-09", "currency": "PHP", "items": [], "branches": [], "landmarks": [{ "id": "sm-cabanatuan", "name": "SM City Cabanatuan", "lat": 0, "lng": 0 }] }`.

### 3.3 Preferences (IndexedDB key `prefs`)
```json
{
  "usual_budget": 150,
  "favorite_foods": ["chicken", "rice", "spaghetti"],
  "dislikes": ["seafood"],
  "avoid_pork": false,
  "appetite": "big",
  "priority": ["cheap", "filling", "fast", "near"],
  "favorite_chains": ["jollibee", "mang-inasal"],
  "created_at": "2026-10-09T08:00:00Z"
}
```
`appetite`: `light | normal | big`. `priority` is an ordered list (index 0 = most important).

### 3.4 Taste profile (IndexedDB key `taste`)
```json
{
  "vector": [0.012, -0.044, "... 384 floats"],
  "pick_count": 7,
  "tag_counts": { "chicken": 5, "rice": 6, "spicy": 1 },
  "chain_counts": { "jollibee": 4, "mang-inasal": 3 },
  "recent_picks": ["jb-chickenjoy-1pc-rice", "mi-pm1-paa"]
}
```
- Initial vector = embedding of `"likes: " + favorite_foods.join(", ")`.
- On each pick: `vector = normalize(0.8 * vector + 0.2 * embed(item.name + ". " + item.desc))`. Increment counts. Keep last 10 picks.
- On a 👎 rating (Kinain): `vector = normalize(vector - 0.1 * embed(...))`, tag/chain counts −1. Undoing the 👎 adds them back.
- Item embeddings are computed once on device on first run and cached in IndexedDB (`item_vecs`), ~100 items × 384 floats.

## 4. LLM: request → filters

### 4.1 Output contract
```json
{
  "budget": 150,
  "people": 1,
  "hunger": "high",
  "urgency": "high",
  "max_distance_km": 1,
  "cravings": ["chicken"],
  "avoid": [],
  "chains": [],
  "time_context": null
}
```
| Field | Type | Default if missing |
|---|---|---|
| `budget` | number (total ₱, whole group) or null | `prefs.usual_budget` |
| `people` | integer ≥1 | 1 |
| `hunger` | `low \| normal \| high` | from `prefs.appetite` |
| `urgency` | `low \| normal \| high` | `normal` |
| `max_distance_km` | number or null | null (no hard limit, 5 km cap) |
| `cravings` | string[] (lowercase food words) | [] |
| `avoid` | string[] (`pork`, `beef`, `seafood`, `spicy`, …) | `prefs.dislikes` (+`pork` if `avoid_pork`) |
| `chains` | string[] chain ids | [] (= any) |
| `time_context` | `late_night \| breakfast \| null` | from device clock |

### 4.2 Exact prompt (system)
```
You convert a Filipino fast-food request (English, Tagalog or Taglish) into JSON.
Output ONLY one JSON object, no other text. Keys:
budget (number in pesos or null), people (integer), hunger ("low"|"normal"|"high"),
urgency ("low"|"normal"|"high"), max_distance_km (number or null),
cravings (array of lowercase food words), avoid (array of lowercase words),
chains (array from: jollibee, mcdonalds, mang-inasal, chowking), time_context ("late_night"|"breakfast"|null).
Hints: "lang"/"budget" near a number = budget. "gutom na gutom"/"patay gutom" = hunger high.
"meryenda"/"konti lang" = hunger low. "ayoko ng matagal"/"nagmamadali"/"bilis" = urgency high.
"chill lang"/"di nagmamadali" = urgency low. "malapit lang" = max_distance_km 1.
"kaming apat"/"4 kami" = people 4. "bawal baboy"/"no pork" = avoid ["pork"].
"sweldo"/"payday" = budget may be high, hunger normal. If budget is per person, multiply by people.
```
User message: the raw request. Few-shot: 2 examples (tests/prompts.md #1 and #9) included as prior user/assistant turns.
Settings: `temperature: 0`, `max_tokens: 120`, WebLLM `response_format: { type: "json_object" }`.

### 4.3 Fallback for broken output (in this order)
1. `JSON.parse` the output. If it fails, extract the first `{...}` block with a regex and parse again.
2. Validate each field; drop invalid fields (wrong type/enum) and fill defaults from 4.1.
3. If still nothing usable, or model not loaded, or >4 s timeout → **rule parser** (`lib/parse/rules.ts`): regex for `₱?\d+`, keyword lists from the hints above. Rule parser is also "simple filter mode" while the model downloads.
4. UI always shows the parsed filters as editable chips, so the user can fix a wrong parse in one tap.

## 5. Ranking

### 5.1 Hard filters (drop candidate)
- total price > budget
- branch closed now (unless `is_24h`)
- distance > `max_distance_km` (or > 5 km)
- any item matches `avoid` (tags, protein, `contains_pork`)
- `chains` set and chain not in it

### 5.2 Score (each sub-score normalized 0–1)
Code: `explore()` in `src/lib/rank/explore.ts`.
```
cheap   = 1 - total / budget                          (leftover money)
fast    = 1 - min(eta_min, 30) / 30
          eta_min  = walk_min + wait_min
          walk_min = distance_km * 1.3 * 12             (road factor 1.3, walking ~5 km/h), min 1
          wait_min = chain avg_wait[meal period] (+ peak bump at 11:30–13:30, 18:00–20:00);
                     falls back to branch.base_wait_minutes
near    = 1 - min(distance_km, 5) / 5
filling = min(sum(fill_score) / (target_fill * people), 1)
          target_fill = low 2, normal 3, high 5
taste   = 0.7 * affinity + 0.3 * (craving match ? 1 : 0) + 0.1 favorite chain + up to 0.1 chain habit (cap 1)
          affinity = tag counts + favorite foods (v0); cosine(taste.vector, combo vector) once embeddings load

score = Σ w_k * sub_k
```
**Weights from "Unahin" (tap order):** 1st `0.40`, 2nd `0.30`, 3rd `0.20`, 4th `0.10`, 5th `0.05`, over `cheap | fast | near | filling | taste`. Unselected factors get 0, except `taste` keeps `0.05` as a tiebreak. Nothing selected → cheap/fast/near/filling `0.25` each. Default Unahin = `prefs.priority`.

**Request overrides** (applied then re-normalized to sum 1):
- `urgency high` → `fast × 2` (min 0.05 first); `urgency low` → `fast × 0.5`
- `hunger high` → `filling × 2` (min 0.05 first)
- `cravings` not empty → `taste × 1.5`

**Output:** every passing combo, one card per meal (same items) at its best-scoring branch, with a count of other branches. Sorted by score (or the user's sort: cheapest, nearest, fastest, most filling). The first card is the **best pick**. When nothing passes, the engine returns `notes` explaining why (budget too low, all closed, nothing within distance, group too big).

## 6. Combo builder
Candidates per open branch are built from that chain's items:
1. **Singles:** every `meal` or `bundle` item.
2. **Meal + 1 add-on:** each `meal`/`main` + one `side`, `drink` or `dessert`, only if total ≤ budget.
3. **Group (people > 1):** prefer `bundle` with `serves ≥ people`; else `meal × people` (same or different meals), + optional shared side. Total must be ≤ budget.
4. Rule: if `hunger = high` and a single is under 70% of budget, also try adding a `main`/`side` (e.g. extra rice, fries).
5. Cap: max 3 items per person; dedupe identical combos; keep ≤ 40 combos per branch before scoring.

No cross-chain combos (you eat at one place).

## 7. Reason line
After ranking, the LLM writes one sentence per top result (batched in one call).
```
System: Write one short, friendly Taglish sentence (max 18 words) explaining why this meal fits the request. No emojis. Use only the facts given.
User: Request: "<raw text>". Meal: <combo names>, ₱<total>, <distance> km, ~<eta> min, matches: <top 2 sub-scores>.
```
Fallback template: `"₱{total} lang, {eta} min, at {distance} km — {top_reason}."` e.g. `"₱139 lang, 9 min, 0.4 km — sakto sa gutom mo."`

## 8. Screens
1. **Setup (first open, ~30 s, tap cards):** 6 steps, one per screen, big cards, progress dots, "Skip" always visible.
   budget chips (₱100/150/200/300/custom) → favorite foods (multi) → dislikes (multi + "bawal baboy") → appetite (3 cards) → priority (drag or tap-in-order: Mura / Mabilis / Malapit / Busog) → favorite chains (logos). Model download prompt shows during step 2 (see §9).
2. **Home:** text box with placeholder example, mic not included, 4 quick-chips ("₱100 lang", "Gutom na gutom", "Bilis!", "Kaming 4"). Location status line. Model status pill ("AI ready · offline" / "Downloading 42%" / "Simple mode").
3. **Results:** editable filter chips at top, 1 big **best pick** card + 2 smaller alternatives; each shows chain logo, items, total ₱, distance, ETA, one-line reason, **"Ito na!"** button (= pick → taste memory + opens Google Maps directions link).
4. **Settings:** edit prefs, reset taste memory, model status/delete model, "Everything stays on this phone" note.

## 9. Model download
- Starts **during setup**, after step 1, in a Web Worker so UI stays smooth.
- **Ask first:** card "Download the AI brain (~1 GB, one time). Wi-Fi recommended." Buttons: *Download now* / *Use small model (~400 MB)* / *Later*. Detect `navigator.connection.saveData` or `effectiveType` 2g/3g → recommend small/later.
- Check WebGPU (`navigator.gpu`). No WebGPU → skip LLM, say "Your phone uses Simple mode" (rule parser + template reasons, embeddings still local).
- Call `navigator.storage.persist()` before download; show result in Settings.
- Progress bar from WebLLM `initProgressCallback` (text + %), shown on setup and as a pill on Home.
- **Simple filter mode** (rule parser + template reasons) is fully usable while loading; results upgrade automatically once the model is ready.
- Resume: WebLLM cache is reused; on reopen, load from cache without asking again.

## 10. Location
- `navigator.geolocation` once per search (5 s timeout). Distance = haversine.
- Denied/failed/indoors → "Nasaan ka?" tap a **Cabanatuan landmark preset**: SM City Cabanatuan, NE Pacific Mall, NEUST main campus, Cabanatuan Public Market, Robinsons Townville. Coordinates taken from OSM by DATA (task #12), stored in `catalog.json → landmarks[]`.

## 11. Catalog pipeline (build time only)
1. `scraper/branches.py` — OSM Overpass query: `brand` / `name` ~ Jollibee|McDonald's|Mang Inasal|Chowking inside Cabanatuan boundary → id, name, lat, lng, `opening_hours` if tagged. Free, no key.
2. Hand-check every branch on Google Maps (exists? hours?) → `scraper/manual_fixes.csv`. Missing branches added by hand.
3. `scraper/menus.py` — Firecrawl `scrape` with JSON extract schema (name, price, category, desc) on each chain's official menu page. Key in `scraper/.env` (`FIRECRAWL_API_KEY`), never committed. This is cloud AI **at build time only**, disclosed in README.
4. Hand-label `tags`, `protein`, `contains_pork`, `spicy`, `fill_score`, `prep_minutes`, fix prices from menu boards if sites are outdated (note price date).
5. `scraper/build.py` merges → `public/catalog.json`, validates shape, prints counts.
The app never calls Firecrawl, OSM or any API at runtime.

## 12. Decisions made
| Topic | Decision |
|---|---|
| Area | Cabanatuan City only |
| Chains | Jollibee, McDonald's, Mang Inasal, Chowking |
| LLM | Qwen2.5-1.5B (WebLLM). **Verify vs Llama-3.2-1B with tests/prompts.md in task #8**; swap if Llama wins. 0.5B as low-end option |
| No WebGPU | Simple mode (rule parser + template reason); embeddings still run via WASM. No second LLM path |
| Hosting | Static export on Vercel, no server |
| Data | Firecrawl (menus) + OSM Overpass (branches) + manual fixes |
| Directions | Optional Google Maps link on "Ito na!" (needs internet); pick saves offline regardless |
| UI language | Taglish |
| Results | 1 best + 2 alternatives |
| Distance | Straight line × 1.3 road factor; no maps API |
| Speed | Estimate (prep + base wait), shown with "~"; no live queue data |
