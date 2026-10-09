---
name: catalog
description: Rebuild or validate public/catalog.json from OSM branches, Firecrawl menus and manual fixes. Use when menu/branch data changes or catalog looks wrong.
---
1. Check `scraper/.env` has `FIRECRAWL_API_KEY` (never print it).
2. Run in `scraper/`: `python branches.py` → `python menus.py` → `python build.py`. Skip `menus.py` if only fixes changed (it costs Firecrawl credits).
3. Validate against SPEC.md §3: every item has id, chain, price>0, category, fill_score 1–5, prep_minutes; every branch has lat/lng in Cabanatuan (lat 15.4–15.6, lng 120.9–121.05) and hours.
4. Report counts per chain, items missing labels, branches missing hours. Don't invent prices or coordinates — list gaps for a human to fill in `manual_fixes.csv`.
