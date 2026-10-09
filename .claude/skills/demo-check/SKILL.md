---
name: demo-check
description: Pre-demo / pre-submission checklist for KahitSaan. Use before recording the demo video, before deploys, and before submission.
---
Check and report each as ✅/❌:
1. `npm run build` succeeds (static export, no API routes in `src/app/api`).
2. `npm test` passes.
3. `grep -rniE "openai|anthropic|gemini|generativeai|firecrawl|api\.(openai|anthropic)" src/` returns nothing.
4. `public/catalog.json` loads, ≥60 items, ≥10 Cabanatuan branches.
5. Manual (ask the user to confirm): fresh profile setup ≤30 s; model progress bar shows; search works in Simple mode during download; **airplane mode** returns results; "Ito na!" updates taste.
6. README.md has no remaining `TODO` and lists all disclosures (models, libs, Firecrawl, OSM, AI dev tools).
