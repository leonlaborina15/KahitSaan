"""Scrape official menu pages into reviewable candidate files.

Firecrawl is used only here at build time. The app never receives the API key or
calls Firecrawl. Output is deliberately marked ``needs review`` and is not
written to ``scraper/data/menu_items.csv``.

Usage:
    .venv/Scripts/python scraper/menus.py
    .venv/Scripts/python scraper/menus.py --chain kfc --chain greenwich
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from firecrawl.v2 import FirecrawlClient

ROOT = Path(__file__).resolve().parent.parent
SCRAPER = ROOT / "scraper"
OUT = SCRAPER / "output" / "menus"

SOURCES = {
    "jollibee": "https://www.jollibee.com.ph/menu/",
    "mcdonalds": "https://www.mcdonalds.com.ph/our-food",
    "mang-inasal": "https://www.manginasal.ph/news/menu-and-prices",
    "chowking": "https://www.chowking.ph/menu",
    "kfc": "https://www.kfc.com.ph/menu",
    "goldilocks": "https://www.goldilocks.com.ph/products/foodshop",
    "greenwich": "https://order.greenwich.com.ph/menu/best-sellers",
    "shakeys": "https://www.shakeyspizza.ph/catalog/3401",
}

PREFIX = {
    "jollibee": "jb",
    "mcdonalds": "mc",
    "mang-inasal": "mi",
    "chowking": "ck",
    "kfc": "kf",
    "goldilocks": "gl",
    "greenwich": "gw",
    "shakeys": "sh",
}

COLUMNS = [
    "id", "chain", "name", "price", "category", "desc", "includes", "serves", "tags", "protein",
    "contains_pork", "spicy", "fill_score", "prep_minutes", "food_type", "breakfast_only", "source_url",
    "price_date", "label_status", "scraped_category", "scraped_price_text", "scraped_at",
]

ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "price": {"type": ["number", "null"]},
                    "price_text": {"type": ["string", "null"]},
                    "description": {"type": ["string", "null"]},
                    "category": {"type": ["string", "null"]},
                    "includes": {"type": ["string", "null"]},
                    "serves": {"type": ["integer", "null"]},
                },
                "required": ["name"],
            },
        }
    },
    "required": ["items"],
}

EXTRACT_PROMPT = """Extract the restaurant menu products shown on this official page.
Return each actual purchasable food or drink once. Preserve the displayed product name.
Use price only when the page explicitly shows a Philippine peso price for that exact product;
otherwise return null. Preserve qualifiers such as 'starts at' in price_text. Do not invent
ingredients, serving counts, descriptions, categories, or prices. Exclude navigation labels,
store names, advertisements without a specific product, and legal text."""


def slug(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:70] or "item"


def as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return {}


def candidate_rows(chain: str, source_url: str, payload: dict[str, Any], scraped_at: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_names: set[str] = set()
    used_ids: dict[str, int] = {}
    for raw in payload.get("items", []):
        item = as_dict(raw)
        name = str(item.get("name") or "").strip()
        name_key = re.sub(r"\s+", " ", name).casefold()
        if not name or name_key in seen_names:
            continue
        seen_names.add(name_key)
        base = f"{PREFIX[chain]}-{slug(name)}"
        used_ids[base] = used_ids.get(base, 0) + 1
        item_id = base if used_ids[base] == 1 else f"{base}-{used_ids[base]}"
        raw_price = item.get("price")
        price_text = str(item.get("price_text") or "").strip()
        qualified_price = bool(re.search(r"\b(starts?|from|as low as)\b", price_text, re.I))
        price = str(round(raw_price)) if isinstance(raw_price, (int, float)) and raw_price > 0 and not qualified_price else ""
        serves = item.get("serves")
        rows.append({
            "id": item_id,
            "chain": chain,
            "name": name,
            "price": price,
            "category": "",
            "desc": str(item.get("description") or "").strip(),
            "includes": str(item.get("includes") or "").strip(),
            "serves": str(serves) if isinstance(serves, int) and serves > 0 else "",
            "tags": "",
            "protein": "",
            "contains_pork": "unknown",
            "spicy": "",
            "fill_score": "",
            "prep_minutes": "",
            "food_type": "",
            "breakfast_only": "",
            "source_url": source_url,
            "price_date": date.today().isoformat() if price else "",
            "label_status": "needs review",
            "scraped_category": str(item.get("category") or "").strip(),
            "scraped_price_text": price_text,
            "scraped_at": scraped_at,
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chain", action="append", choices=sorted(SOURCES), help="scrape only this chain; repeatable")
    args = parser.parse_args()
    selected = args.chain or list(SOURCES)

    load_dotenv(SCRAPER / ".env")
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("FATAL: set FIRECRAWL_API_KEY in scraper/.env", file=sys.stderr)
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    client = FirecrawlClient(api_key=api_key, timeout=180)
    all_rows: list[dict[str, Any]] = []
    manifest: list[dict[str, Any]] = []
    if args.chain:
        candidate_path = OUT / "menu_candidates.csv"
        manifest_path = OUT / "manifest.json"
        if candidate_path.exists():
            with candidate_path.open(encoding="utf-8-sig", newline="") as handle:
                all_rows = [row for row in csv.DictReader(handle) if row.get("chain") not in selected]
        if manifest_path.exists():
            manifest = [row for row in json.loads(manifest_path.read_text(encoding="utf-8")) if row.get("chain") not in selected]

    for chain in selected:
        url = SOURCES[chain]
        print(f"Scraping {chain}: {url}")
        scraped_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        try:
            document = client.scrape(
                url,
                formats=["markdown", {"type": "json", "prompt": EXTRACT_PROMPT, "schema": ITEM_SCHEMA}],
                only_main_content=True,
                timeout=120000,
                wait_for=10000 if chain == "greenwich" else 0,
                actions=[{"type": "wait", "milliseconds": 10000}] if chain == "greenwich" else None,
                location={"country": "PH", "languages": ["en", "tl"]},
                remove_base64_images=True,
                check_prompt_injection=True,
            )
            markdown = document.markdown or ""
            extracted = as_dict(document.json)
            rows = candidate_rows(chain, url, extracted, scraped_at)
            (OUT / f"{chain}.md").write_text(markdown, encoding="utf-8")
            (OUT / f"{chain}.json").write_text(
                json.dumps(extracted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            all_rows.extend(rows)
            manifest.append({"chain": chain, "url": url, "scraped_at": scraped_at, "items": len(rows), "ok": True})
            print(f"  saved {len(rows)} candidates")
        except Exception as exc:  # keep other chains usable when one official site fails
            manifest.append({"chain": chain, "url": url, "scraped_at": scraped_at, "items": 0, "ok": False, "error": str(exc)})
            print(f"  ERROR: {exc}", file=sys.stderr)

    with (OUT / "menu_candidates.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(all_rows)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failures = sum(not row["ok"] for row in manifest)
    print(f"Wrote {len(all_rows)} candidates from {len(manifest) - failures}/{len(manifest)} sources to {OUT}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
