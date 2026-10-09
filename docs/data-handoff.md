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
