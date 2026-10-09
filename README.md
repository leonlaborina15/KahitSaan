# Busog Budget

**Best fast-food meal near you, for your budget — picked by AI running on your phone.**
AppBuildersPH Hackathon 2026 · Theme: Local AI

> Draft — finish after feature freeze (TASKS.md #22). Items marked TODO need real values.

## What it does
Type a request in English or Taglish — *"₱150 lang, gutom na gutom, ayoko ng matagal, malapit lang"* — and get the best meal or combo from nearby Jollibee, McDonald's, Mang Inasal and Chowking branches, with a one-line reason. It learns your taste from what you pick.

## Team
TODO: names + roles (Frontend, AI/Local model, Data/scraper, Pitch/demo)

## Setup
```bash
npm install
npm run dev          # http://localhost:3000
# optional: refresh catalog (needs internet, run once)
cd scraper && pip install -r requirements.txt && python scrape.py
```
Use Chrome/Edge with WebGPU for the full AI. Other browsers run in Simple mode.

## What runs locally vs what needs internet
| Runs on device (offline) | Needs internet |
|---|---|
| Request parsing (Qwen2.5 1.5B via WebLLM) | First app load |
| Reason line generation (same LLM) | One-time model download (~1 GB, or ~400 MB small) |
| Taste matching (MiniLM embeddings via transformers.js) | Opening Google Maps directions (optional) |
| Ranking, combo building, distance, ETA | Running the scraper (dev only, not the user) |
| Preferences, taste memory, history (IndexedDB) | |
| Menu + branch catalog (bundled JSON) | |

No AI server. No cloud AI API calls. No account. Your preferences never leave your phone.

## Why does this product benefit from running AI locally?
- **Works where students actually are:** weak mobile data, dead zones, no load. Once installed, it works in airplane mode.
- **Zero cost per query:** no API bill, so it can stay free for budget-conscious users.
- **Private:** your budget, eating habits and location never go to a server.
- **Fast:** no network round-trip; answers come straight from the phone.

## Known limits
- Prices and menus are a snapshot dated TODO; service speed is an estimate, not live queue data.
- Demo area only: TODO.

## Disclosures
- **Models:** Qwen2.5-1.5B-Instruct (q4f16_1, MLC build) and Qwen2.5-0.5B-Instruct — Apache 2.0; all-MiniLM-L6-v2 (Xenova ONNX port) — Apache 2.0.
- **Frameworks/libraries:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, @mlc-ai/web-llm, @huggingface/transformers, idb-keyval; scraper: Python, requests, BeautifulSoup.
- **APIs:** none for AI. Browser Geolocation, WebGPU, IndexedDB, Storage API. Google Maps links for directions only.
- **Data sources:** public websites of Jollibee, McDonald's PH, Mang Inasal, Chowking (TODO: URLs + date); branch locations verified manually on Google Maps.
- **Existing code:** create-next-app and shadcn/ui templates. TODO: anything else.
- **AI dev tools:** Claude Code (planning docs and code). TODO: others used by the team.
