# KahitSaan

**Best fast-food meal near you, for your budget — picked by AI running on your phone.**
AppBuildersPH Hackathon 2026 · Theme: Local AI

## What it does
Type a request in English or Taglish — *"₱150 lang, gutom na gutom, ayoko ng matagal, malapit lang"* — and get the best meal or combo from nearby fast-food branches in Cabanatuan City, with a one-line reason. It learns your taste from what you pick. No account, no server, works offline.

## Team
Leon Laborina · Kharie Joi B. Ladignon · Lorenz Costales Labaupa · Emmanuel Ray De Guzman

## Run it (for judges)
Requirements: Node.js 20+, Chrome or Edge (desktop or Android) for the full AI.
```bash
npm install
npm run dev          # open http://localhost:3000
```
Production build (static site, same as deployed):
```bash
npm run build        # outputs out/
npx serve out        # open the printed URL
```
Tests: `npm test`

## How to use
1. **Setup (~30 s):** pick your usual budget, favorite foods, foods to avoid, appetite, priorities and favorite chains. "Skip" works too.
2. **Location:** allow GPS, or tap a Cabanatuan landmark (SM City Cabanatuan, NE Pacific Mall, …).
3. **Search on Home:** type what you want, or tap a quick chip ("₱100 lang", "Gutom na gutom", "Bilis!", "Kaming 4").
4. **Results:** the top card is the best pick; below are alternatives. Tap the chips, budget slider or "Unahin" to re-rank instantly. Swipe a card away for "Ayoko nito".
5. **"Ito na!"** saves your pick (taste memory) and opens Google Maps directions.
6. **Kahit Saan** (center button): can't decide? It picks for you.
7. **Turn on the local AI:** go to **Ako → AI sa phone mo → Download** (~1 GB) or **Small model** (~400 MB). The pill on top shows progress, then "AI handa · offline". You can keep searching while it downloads (Basic mode).
8. **Offline test:** after the model is ready, turn on airplane mode and search again.

Try these: `₱150 lang, gutom na gutom, malapit lang` · `4 kami, tig-150 each, gusto ng spaghetti` · `bawal baboy, 150, gutom` · `2am na, gutom, 150`

## Local AI
- **WebLLM** runs **Qwen2.5-1.5B-Instruct** (q4f16_1, MLC) — or **Qwen2.5-0.5B-Instruct** for lighter devices — in the browser on **WebGPU**, inside a Web Worker so the UI never freezes.
- It turns the Taglish request into filters (budget, people, hunger, urgency, cravings, avoid, chains) and writes the one-line reason for the top picks.
- After the one-time download the model is cached on the device and runs fully offline.
- **Basic mode:** without WebGPU, before the download, or if the model fails, a rule-based Taglish parser and template reasons take over. The app always works.
- Ranking, combos, distance, ETA and taste memory are plain TypeScript on the device.

| Runs on device (offline) | Needs internet |
|---|---|
| Request parsing + reason lines (Qwen2.5 via WebLLM) | First app load |
| Ranking, combos, distance, ETA | One-time model download (~1 GB, or ~400 MB small) |
| Preferences, taste memory, history (IndexedDB) | Google Maps directions (optional) |
| Menu + branch catalog (bundled JSON) | Running the scraper (developers only) |

No AI server. No cloud AI API calls. No account. Your preferences never leave your phone.

## Why run the AI locally?
- **Works where students actually are:** weak mobile data, dead zones, no load. Once loaded, it works in airplane mode.
- **Zero cost per query:** no API bill, so it can stay free.
- **Private:** your budget, eating habits and location never go to a server.
- **Fast:** no network round-trip.

## Data
Menus, prices and branch locations were scraped from public sources on the internet (online menu listings; branch locations from OpenStreetMap), then cleaned and checked by hand. Snapshot dated 2026-10-09: 80 menu items, 15 branches (Jollibee, McDonald's, Mang Inasal) in Cabanatuan City. The scraper lives in `scraper/` and runs at build time only; the app makes no live data calls.

## Known limits
- Prices and menus are a snapshot; wait times are estimates, not live queue data.
- Covers Cabanatuan City only.
- Full AI needs a WebGPU browser (Chrome/Edge); others use Basic mode.

## Disclosures
- **Models:** Qwen2.5-1.5B-Instruct and Qwen2.5-0.5B-Instruct (MLC builds) — Apache 2.0.
- **Libraries:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, framer-motion, @mlc-ai/web-llm, idb-keyval, Vitest. Scraper: Python, requests, firecrawl-py.
- **APIs:** none at runtime for AI. Build time only: web scraping for menus, OpenStreetMap Overpass API for branches. Browser Geolocation, WebGPU, IndexedDB. Google Maps links for directions only.
- **Data sources:** public online menu listings; branch locations © OpenStreetMap contributors (ODbL), verified manually.
- **Existing code:** create-next-app and shadcn/ui templates.
- **AI dev tools:** Devin and Claude (Claude Code) were used to help plan and write code. They are not part of the running app.
