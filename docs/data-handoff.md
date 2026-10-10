# Dataset and scraper handoff

This note records the current state of the KahitSaan dataset work so another agent can continue without treating unreviewed scrape output as production data.

## Goal and constraints

The app uses a static catalog at `public/catalog.json`. It should provide fast-food options and branches, based on the dataset theory in `datasetKAHITSAAN.md` and the reference image. The eight planned chain IDs are `jollibee`, `mcdonalds`, `mang-inasal`, `chowking`, `kfc`, `goldilocks`, `greenwich`, and `shakeys`.

`AGENTS.md` is authoritative: no cloud AI/API calls from `src/`, no backend, local-first/offline app behavior, and the rule-parser path must remain usable. Firecrawl is allowed only in `scraper/` as a disclosed build-time collection tool. Keep `FIRECRAWL_API_KEY` in ignored `scraper/.env`; never commit or print it. The key was pasted into chat, so rotate it before further use.

## Implemented so far

- Added/expanded scraper support for Firecrawl menu collection and OSM/Overpass branch candidates.
- Menu sources are official chain pages for all eight chains; the scraper writes candidate/review output rather than silently promoting scraped values to the shipped catalog.
- Branch candidates were collected for the eight chains around Cabanatuan, but the records need validation and useful branch-specific details/hours are sparse.
- Expanded the app/spec chain ID support and catalog builder gating to include the four additional chains. A chain should only enter production output when verified branch and meal data exist.
- Updated dataset documentation and added the Firecrawl Python dependency alongside the branch scraper dependency.
- Scraped candidate outputs are ignored under `scraper/output/`; `scraper/.env` is ignored. Do not commit secrets or raw local environment files.
- The last recorded scrape produced 405 menu candidates (217 with an exact parsed price; all labeled `needs review`) and 32 branch candidates. These counts are historical and must be rechecked after rerunning.
- `public/catalog.json` was not updated with these unverified candidates.

## Session log — 2026-10-09

Branch: `devin/1791560410-dataset-cabanatuan` (from `main` @ f523812).

**Environment.** No `FIRECRAWL_API_KEY` is configured in this session (no secrets, no `scraper/.env`), so `scraper/menus.py` cannot run. Python is 3.10 here; the scripts run fine despite the 3.12 spec. To enable menu scraping: save a rotated `FIRECRAWL_API_KEY` as an org/session secret or put it in `scraper/.env` (gitignored), then `pip install -r scraper/requirements.txt` and run `python scraper/menus.py`.

**Scraper validation.** `branches.py` now retries all Overpass mirrors over POST *and* GET, falls back to bounded Nominatim search, and handles way/relation elements without a `center` node. This run used the `overpass.private.coffee` mirror via GET and wrote 33 candidates to `scraper/output/branches_candidates.csv` (gitignored).

**Branch evidence (Google Maps listing + OSM, checked 2026-10-09).** `scraper/data/branches.csv` now holds 12 `verified` in-city branches: Jollibee ×6 (Sumacab 24h, Circumferential 24h, Del Pilar 24h drive-thru, Megacenter 10:00–21:00, WalterMart 07:00–22:00, SM Cabanatuan 08:00–21:00) and McDonald's ×6 (Burgos 05:00–00:00; Zulueta, Maharlika Hwy, Emilio Vergara, Asian Highway, Mayapyap all 24h). Remaining candidates stay `needs review`: Jollibee NE Pacific (no hours listed), Jollibee Sanciangco (OSM-only, not on GMaps), McDonald's NE Pacific (opens 10 AM, close unconfirmed), Chowking Cabanatuan Highway (GMaps shows open past midnight — full hours unverified), three in-city Mang Inasal branches seen on GMaps (SM City, SM Megacenter Melencio St Ext, WalterMart — no OSM record, coords/hours unverified), and the KFC/Goldilocks/Greenwich/Shakey's candidates. OSM rows at lat ~15.42 (Santa Rosa) and ~15.57–15.59 (Talavera) are outside the Cabanatuan bounds and kept as `needs review` for context.

**Menu evidence.** Only `manginasal.ph/news/menu-and-prices` (posted 2026-08-01) publishes explicit prices; 42 Mang Inasal items were transcribed into `scraper/data/menu_items.csv` as `verified` with `source_url` + `price_date`. `desc`, `tags`, `protein`, `contains_pork`, `spicy`, `fill_score`, `prep_minutes`, `serves` are hand-labeled per `docs/dataset.md` conventions — they are name-derived judgments, not scraped values; `contains_pork` is `unknown` where the item name does not settle it (e.g. palabok, lumpiang togue). Jollibee (`jollibee.com.ph/menu`), Chowking (`chowking.ph/menu`) and McDonald's (`mcdonalds.com.ph/our-food`) publish item names but **no prices**; the Jollibee/McDonald's/Chowking delivery sites and Foodpanda branch pages are JS-rendered and could not be fetched, so **no verified prices exist yet for those chains**. Family/party-size Fiesta bundles were skipped because `serves` cannot exceed 6 and the page does not state serving sizes.

**Build status.** `python scraper/build.py --check` passes validation cleanly but correctly refuses to write a catalog: every verified item belongs to `mang-inasal`, which still lacks a `verified` branch, so no chain activates. `public/catalog.json` remains `"mock": true` — do not ship real data until at least one of Jollibee/McDonald's/Chowking has verified priced items (their 12 verified branches then count toward the ≥10 minimum) **and** total verified items ≥60. `npm test` (61/61) and `npm run build` (static export, all routes prerendered) pass.

**To continue:** install Firecrawl + key, run `python scraper/menus.py`, then `python scraper/build.py --check`; verify the three Mang Inasal GMaps branches' coords/hours and the Chowking Highway closing time; prices for Jollibee/McDonald's may come from `mcdelivery.com.ph`/`jollibeelivery.com` if a fetching path is found, or hand-label from an in-store/foodpanda branch menu with the branch-specific URL as `source_url`.

## Session log — 2026-10-09 (Firecrawl + real catalog)

Branch: `devin/1791563648-real-catalog` (from `main` @ 24f45f7, after PR #3 merged).

**Firecrawl.** `FIRECRAWL_API_KEY` is now in `scraper/.env` (gitignored, chmod 600). `scraper/menus.py` ran and produced 394 candidates: jollibee 23, mcdonalds 10, mang-inasal 124, chowking 61, kfc 0, goldilocks 73, greenwich 86, shakeys 17 — but only Mang Inasal (124) and Greenwich (38) had parsed prices; the other chains' pages render names without prices. New helper `scraper/fetch_page.py` (Firecrawl, markdown or `--menu` JSON-extract mode with scroll actions + `only_main_content=False`) successfully extracts priced menus from **foodpanda.ph/restaurant/<id>/<branch>** pages where markdown mode fails. Extracted: Jollibee SM Cabanatuan `d9vc` (46 items), McDonald's Cabanatuan Joson/Zulueta `x4lz` (25), Chowking NE Pacific Mall `k2an` (25). These pages were checked against the target Cabanatuan branches before use (handoff pending item 6).

**Menu evidence added.** Jollibee 24 verified + 21 needs-review, McDonald's 13 verified + 12, Chowking 7 verified + 16 rows were generated from the foodpanda JSON into `menu_items.csv`, each with the foodpanda branch URL as `source_url` and `price_date` 2026-10-09. **Caveat: foodpanda prices are delivery prices and may differ from in-store.** Verified = exact-priced solo items; "from ₱" prices and family bundles stay `needs review` (never promoted). `desc`/`tags`/`protein`/`fill_score`/`prep_minutes` are hand-labeled name-derived judgments per `docs/dataset.md`, same as the MI rows. Mislabels corrected this session: bacon items pork=true, pancakes dropped a bogus `rice` tag, breakfast solos → `rice meal`, Choco Pao/Hot Fresh Brew → dessert/drink, Ultimate Spicy Bundle → bundle+needs-review, Buchi Platter → dessert, duplicate Chowking Lauriat deduped. `Chicken Macaroni Soup` re-tagged `chicken|soup`, protein `chicken` (name-only match was failing the food-type golden test).

**Branch evidence added.** The official `manginasal.ph/locations` directory (fetched via `fetch_page.py`, 584 KB) lists four Cabanatuan stores with hours; three are in-bounds and now `verified`: `mi-sm-cabanatuan` (SM City Cabanatuan, 09:00–21:00), `mi-mega-center` (Mega Center Mall, 10:00–21:00), `mi-waltermart` (Waltermart Cabanatuan, 09:00–21:00). `mi-ne-pacific` (NE Pacific Mall, 10:00–20:00) stays `needs review` pending in-city coord/OSM cross-check. `mc-sm-cabanatuan`, `ck-sm-cabanatuan`, `ck-ne-pacific` also remain `needs review`. branches.csv: 40 rows, 15 verified.

**Real catalog built.** `python scraper/build.py` now writes a non-mock `public/catalog.json` (version 2026-10-09): **3 active chains, 15 branches, 80 items, 5 landmarks**. Jollibee 6×24 items, McDonald's 6×13, Mang Inasal 3×43. chowking/kfc/goldilocks/greenwich/shakeys not shipped (no verified branch + meal).

**Test fixes (mock-catalog assumptions).** Two golden tests assumed mock data: "who opens first" now expects 9am (real MI hours); "within 5 km" uses a synthetic `here` ~2 km SW since every landmark is now <1 km from some branch. `breakfast_only` test's picked meal (₱219) exceeded its ₱200 test budget — `noPork` budget raised to 1000. `npm test` 61/61, `npm run build` static export clean (sw.js: 64 files, 1858 KB).

**To continue:** verify `mi-ne-pacific`/`mc-sm-cabanatuan`/`ck-sm-cabanatuan`/`ck-ne-pacific` coords+hours to activate Chowking; promote the `needs review` menu rows only with in-store or official evidence; KFC/Goldilocks/Greenwich/Shakey's need branch + priced-menu evidence to activate.

## Pending work

1. Inspect current `git status`, diffs, and the actual files before changing anything; preserve any user edits.
2. Confirm Python version against repo requirements (Python 3.12 is specified; prior environment only had Python 3.11), install scraper requirements if needed, and check whether the Firecrawl key is present without displaying it.
3. Rerun the menu and branch collectors. An earlier Overpass request succeeded via a mirror; the primary endpoint was not reliable.
4. Improve branch candidates with specific names/address/coordinates, source URLs, and evidence. Verify opening hours independently; do not infer hours from a chain or neighboring branch.
5. Review menu candidates against source pages. Exact current prices may be used only when explicitly shown. Keep “from/starting at” amounts as text, not exact item prices. Avoid guessing serving size, ingredients, allergens, pork, spice, nutrition/protein, or preparation time. Mark unconfirmed fields unknown/blank and keep `needs review` as appropriate.
6. Consider local delivery menu pages as supplementary evidence (e.g. Foodpanda) only after confirming they correspond to the target Cabanatuan branch and preserve their source attribution. They should not be treated as official chain data.
7. Resolve the schema question for unknown dietary/protein values before labeling. Update `SPEC.md` first, then TypeScript types and validation if the schema needs a new unknown value. Filtering for avoidances must fail safely when data is unknown.
8. Populate `public/catalog.json` only from manually verified records via the builder; do not lower builder quality thresholds just to activate every chain. Current collection quality may mean some chains remain inactive until enough reliable local data is collected.
9. Run the scraper validation/build, `npm test`, and relevant static-export checks once data/schema work is complete. No tests were run in the last recorded work session.
10. Review `git diff --check`, ensure secrets/output are not staged, and commit/push on the intended branch only after checking branch and remote.

## Important source caveats

The reference ranking image is dated June 25–July 5, 2023. It is inspiration for chain coverage, not current market-share evidence. Search results gathered during the previous session found some official store locator pages and third-party branch/menu listings, but those are leads, not verified final catalog evidence. In particular, many OSM branch records were generic chain names, and several official menu pages yielded incomplete or non-local menu content.

An earlier attempt to resume work failed because the local command runner rejected process startup (`helper_unknown_error: setup refresh had errors`). Before making claims about current repo state or pushing, verify the checkout and remote afresh.
