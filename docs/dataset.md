# KahitSaan Dataset

## Purpose

How the catalog is organized, where each field comes from, and why the app needs it.
DATA fills four CSV sheets by hand + scraper output. `scraper/build.py` checks them and writes `public/catalog.json`.
The app ships that file and does all ranking, matching and explaining on the phone. It never calls a server.

```
scraper/data/chains.csv       ┐
scraper/data/branches.csv     ├─► scraper/build.py ─► public/catalog.json  (only rows that pass checks)
scraper/data/menu_items.csv   │        └─ prints counts + every dropped row and why
scraper/data/landmarks.csv    ┘
```

Field names below match `src/lib/types.ts` and SPEC.md §3. Change SPEC.md first, then the type, then this doc.

---

## Conventions

- **Scraped** = from the chain's official site (Firecrawl), OpenStreetMap, or Google Maps.
- **Hand-labeled** = added by the team because the source doesn't have it.
- **Hand-estimated** = a best guess. The app shows it with `~` and the word "tantya".
- **Don't guess.** If you can't find a value, leave it blank and set `label_status = needs review`. Blank is fine in the sheet, but the row **won't go into the app** until it's filled.
- Prices: whole pesos, > 0. Distances: km. Times: minutes. Hours: `HH:MM` 24-hour.
- Coordinates must be inside Cabanatuan: `lat 15.4–15.6`, `lng 120.9–121.05`.
- Lists inside a cell (tags) are separated by `|`, e.g. `chicken|fried|rice`.
- True/false cells: `true` / `false` (lowercase).

### IDs never change
History, Saved and taste memory store item and branch ids on the phone. If an id changes, users lose that memory.
- Set the id once when the row is created. Never regenerate it, even if the name or price changes.
- Format: `<chain-prefix>-<slug-of-name>`, lowercase, words joined by `-`.
- Chain prefixes: `jb` (jollibee), `mcd` (mcdonalds), `mi` (mang-inasal), `ck` (chowking).
- Examples: `jb-1-pc-chickenjoy-with-rice`, `mi-pm1-paa-large`, `jb-sm-cabanatuan` (branch), `sm-cabanatuan` (landmark).

---

## 1. `chains.csv`

One row per chain. Exactly 4 rows. Average wait is stored per meal period here (one column each); the build turns it into `chains[].avg_wait`.

| Column | Type | Source | Required | Why |
|---|---|---|---|---|
| `id` | `jollibee` / `mcdonalds` / `mang-inasal` / `chowking` | Hand-entered | Yes | Chain filter. Every order stays at one chain. |
| `name` | text | Hand-entered | Yes | Display name ("McDonald's"). |
| `color` | hex, e.g. `#D62300` | Hand-entered | Yes | Display only. |
| `wait_breakfast` | whole minutes | Hand-estimated | Yes | Speed estimate changes by time of day. Shown as `~`. |
| `wait_lunch` | whole minutes | Hand-estimated | Yes | Lunch rush is slowest. |
| `wait_merienda` | whole minutes | Hand-estimated | Yes | |
| `wait_dinner` | whole minutes | Hand-estimated | Yes | |
| `wait_late` | whole minutes | Hand-estimated | Yes | Late night is usually fastest. |

Meal periods (same as `mealPeriod()` in `src/lib/rank/explore.ts`): breakfast 05:00–10:00, lunch 10:00–14:00, merienda 14:00–17:00, dinner 17:00–21:00, late 21:00–05:00.

---

## 2. `branches.csv`

One row per physical store. Target: **at least 10**.

| Column | Type | Source | Required | Why |
|---|---|---|---|---|
| `id` | `<chain-prefix>-<slug>` | Hand-set once | Yes | Stable id (see "IDs never change"). |
| `chain` | chain id | Scraped (OSM brand) | Yes | Chain filter. |
| `name` | text | OSM, fixed by hand if unclear | Yes | Shown so the user knows which branch. |
| `lat` | decimal, 15.4–15.6 | OSM | Yes | Distance. |
| `lng` | decimal, 120.9–121.05 | OSM | Yes | Distance. |
| `osm_id` | `node/123` or `way/123`, blank if added by hand | OSM | No | Proof of where the location came from. |
| `open_time` | `HH:MM` | OSM `opening_hours` or Google Maps | Yes, unless `is_24h` | Hide closed branches. Closing after midnight is fine (`22:00`–`02:00`). |
| `close_time` | `HH:MM` | Same | Yes, unless `is_24h` | |
| `is_24h` | true / false | Google Maps | Yes | Exception to the closed rule. |
| `has_drive_thru` | true / false | Google Maps | No (default false) | Display only. |
| `base_wait_minutes` | whole minutes | Hand-estimated | Yes | Fallback wait if the chain has no estimate. Shown as `~`. |
| `exists_on_google_maps` | true / false | Hand-checked | Yes | `false` = branch is dropped. Never send someone to a closed-down store. |
| `checked_date` | `YYYY-MM-DD` | Hand-checked | Yes | When someone last confirmed the branch and hours. |
| `label_status` | `verified` / `needs review` | Hand-set | Yes | Only `verified` rows go into the app. |

---

## 3. `menu_items.csv`

One row per item per chain. Items are chain-wide (same menu at every branch). Target: **at least 60** total, at least 12 per chain.

| Column | Type | Source | Required | Why |
|---|---|---|---|---|
| `id` | `<chain-prefix>-<slug>` | Hand-set once | Yes | Stable id. History and taste memory point to it. |
| `chain` | chain id | Scraped | Yes | Chain filter. |
| `name` | text | Scraped | Yes | Shown to the user; used for taste matching. |
| `price` | whole pesos, > 0 | Scraped, checked against a menu board / delivery app | Yes | Budget filter. |
| `category` | `meal` / `main` / `side` / `drink` / `dessert` / `bundle` | Scraped section, mapped by hand | Yes | Combo builder rules (see below). |
| `desc` | text, one short sentence | Scraped | Yes | Taste matching and the reason line. |
| `includes` | text | Scraped | No | What's in the box/bundle ("2 pcs chicken, rice, drink"). Blank for simple items. |
| `serves` | whole number; `1`, or `3`–`6` for bundles | Scraped if stated, else hand-labeled | Yes | Group orders. |
| `tags` | `|`-separated, **only words from the tag list below** | Hand-labeled | Yes | Cravings and avoid filters. |
| `protein` | `chicken` / `beef` / `pork` / `fish` / `seafood` / `mixed` / `none` | Hand-labeled | Yes | Avoid filter ("bawal baka"). |
| `contains_pork` | `true` / `false` / `unknown` | Hand-labeled | Yes | Pork filter. `unknown` is treated as pork when the user avoids pork, so nothing slips through. |
| `spicy` | true / false | Hand-labeled | Yes | "Ayoko ng maanghang". |
| `fill_score` | 1–5 (rubric below) | Hand-labeled | Yes | "Gutom na gutom" ranking. |
| `prep_minutes` | whole minutes (defaults below) | Hand-labeled | Yes | Speed estimate, added to branch wait. |
| `food_type` | `chicken` / `burger` / `pasta` / `rice meal` / `noodles` / `sisig` / `snack` / `dessert` / `drink` | Hand-labeled | Yes | Display grouping and the food-type filter. |
| `breakfast_only` | true / false | Hand-labeled | Yes | Shown only in the breakfast period (05:00–10:00). Stops "breakfast at 9 PM" picks. |
| `source_url` | link | Scraped | Yes | Proof of where the item and price came from. |
| `price_date` | `YYYY-MM-DD` | When the price was checked | Yes | Price freshness. |
| `label_status` | `verified` / `needs review` | Hand-set | Yes | Only `verified` rows go into the app. |

### Category guide
| Category | Means | Example |
|---|---|---|
| `meal` | Complete solo meal, usually with rice or fries | 1-pc Chickenjoy with Rice |
| `main` | Main dish without rice/sides | Burger, Spaghetti solo |
| `side` | Add-on | Fries, extra rice, siomai |
| `drink` | Drink | Coke, iced tea |
| `dessert` | Sweet | Sundae, halo-halo, peach mango pie |
| `bundle` | For 3+ people | 6-pc Chickenjoy bucket, family meal |

### `fill_score` rubric
| Score | Means | Example |
|---|---|---|
| 1 | Snack, not a meal | Drink, sundae, pie |
| 2 | Light | Fries, siomai, burger solo |
| 3 | Normal solo meal | 1-pc chicken + rice |
| 4 | Big solo meal | 2-pc chicken + rice, PM with unli-rice |
| 5 | Very busog | Super meal, 2 mains + rice |

Bundles: score per person (bundle `fill_score` = how full **one** person gets).

### `prep_minutes` defaults
Use these unless you know better: side/drink/dessert **2**, meal/main **4**, grilled or made-to-order (inasal, sizzling) **8**, bundle **6**.

### Tag list (use only these)
Tags must be words the parser understands, or cravings never match. The build rejects any tag not on this list. To add a word, add it here **and** in `src/lib/parse/rules.ts` in the same PR.

**Craving tags** — parser keywords. Tag every item that fits:
`chicken` · `beef` · `fish` · `burger` · `fries` · `spaghetti` · `palabok` · `noodles` · `sisig` · `bbq` · `siopao` · `siomai` · `fried rice` · `halo-halo` · `ice cream` · `dessert`

**Detail tags** — optional, help taste matching:
`rice` · `unli-rice` · `fried` · `grilled` · `sizzling` · `soup` · `sweet` · `pasta` · `pork` · `shrimp` · `cheese` · `hotdog` · `gravy` · `pie` · `bun` · `dumpling` · `drink` · `soda` · `iced tea` · `coffee` · `breakfast` · `bucket` · `inasal` · `burger steak` · `sweet and sour` · `lauriat` · `mami`

---

## 4. `landmarks.csv`

Location presets for when GPS fails ("Nasaan ka?"), and for repeatable demos. Exactly these 5.

| Column | Type | Source | Required | Why |
|---|---|---|---|---|
| `id` | slug | Fixed | Yes | Saved on the phone as the user's place. |
| `name` | text | SPEC §10 | Yes | Display name. |
| `lat` | decimal | OSM | Yes | Distance baseline. |
| `lng` | decimal | OSM | Yes | Distance baseline. |

Rows: `sm-cabanatuan` SM City Cabanatuan · `ne-pacific` NE Pacific Mall · `neust` NEUST main campus · `public-market` Cabanatuan Public Market · `robinsons-townville` Robinsons Townville.

---

## 5. What goes into `catalog.json`

The phone only gets what it needs. Audit columns stay in the CSVs.

| Kept in the app | CSV only (audit) |
|---|---|
| All item fields above except the audit columns | `source_url`, `price_date`, `label_status` |
| Branch: id, chain, name, lat, lng, `hours {open, close}`, is_24h, has_drive_thru, base_wait_minutes, `source` (e.g. `"osm:node/123, checked 2026-10-09"`) | `osm_id`, `exists_on_google_maps`, `checked_date`, `label_status` |
| Chains with `avg_wait` per meal period | |
| Landmarks | |
| `version` = newest `price_date` / `checked_date` | |

Protein `none` becomes `null`. Tags become a JSON array.

---

## 6. Build checks

`build.py` runs these. **Errors** drop the row and print why. **Fatal** stops the build (no `catalog.json` written).

| Check | Rule | Result |
|---|---|---|
| Status | `label_status = verified` | Error |
| Branch exists | `exists_on_google_maps = true` | Error |
| Required fields | No blanks in required columns | Error |
| Price | Whole number > 0 | Error |
| Enums | `chain`, `category`, `protein`, `contains_pork`, `food_type` are valid values | Error |
| Fill | `fill_score` 1–5 | Error |
| Serves | `1`, or 3–6 when `category = bundle` | Error |
| Tags | Every tag is on the tag list | Error |
| Coordinates | Inside Cabanatuan bounds | Error |
| Hours | `open_time` and `close_time` set, unless `is_24h` | Error |
| Unique ids | No duplicate item, branch or landmark id | Fatal |
| ID kept | An id in the previous `catalog.json` that's missing now is listed as a warning (item removed or renamed?) | Warning |
| Minimum size | ≥ 60 items, ≥ 10 branches, 4 chains, 5 landmarks; every chain has ≥ 1 branch and ≥ 1 `meal` | Fatal |

After the build, `npm test` (catalog + ranking tests) must pass before the catalog is committed.

---

## 7. Decisions

| Question | Decision |
|---|---|
| Budget per person or whole group? | **Whole group total** (SPEC §4.1). "₱100 each, 4 kami" → ₱400. Bundle `fill_score` is per person. |
| Allow `contains_pork = unknown`? | **Yes.** Treated as pork when the user avoids pork. |
| How to label estimated wait? | Always `~` before the minutes, plus "tantya" on the card (SPEC §12). |
| How often to re-check prices and hours? | **Once**, dated 2026-10-09, for the hackathon. The catalog `version` date shows in the app and README. |

---

## 8. Why these fields

The app answers one question: **"What's the best meal I can get for my money, near me, right now?"**

- **Budget:** `price`, `serves`, `category`
- **Distance:** branch `lat`/`lng`, landmarks
- **Speed:** `prep_minutes`, `base_wait_minutes`, chain waits per meal period
- **Open now:** `open_time`, `close_time`, `is_24h`, `breakfast_only`
- **Taste:** `name`, `desc`, `tags`, `protein`, `food_type`
- **Avoid:** `contains_pork`, `protein`, `spicy`, `tags`
- **Busog:** `fill_score`
- **Groups:** `serves`, `bundle`
- **Trust:** `source_url`, `price_date`, `label_status`, `exists_on_google_maps`, `checked_date`
- **One chain per order:** `chain` on items and branches
