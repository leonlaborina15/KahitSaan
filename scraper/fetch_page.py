"""Fetch a single page with Firecrawl and dump markdown to stdout/file.

Utility for reviewing delivery-menu pages (e.g. foodpanda branch pages) that the
official-site collector in menus.py does not cover. Firecrawl is used only here
at build time; nothing under src/ calls it.

Usage:
    python scraper/fetch_page.py <url> [out.md]
    python scraper/fetch_page.py --menu <url> <out.json>   # extract priced menu items
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from firecrawl.v2 import FirecrawlClient

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: fetch_page.py <url> [out.md] | --menu <url> <out.json>", file=sys.stderr)
        return 2
    menu_mode = sys.argv[1] == "--menu"
    url = sys.argv[2] if menu_mode else sys.argv[1]
    out = Path(sys.argv[3]) if menu_mode else (Path(sys.argv[2]) if len(sys.argv) > 2 else None)
    load_dotenv(ROOT / "scraper" / ".env")
    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key:
        print("FATAL: set FIRECRAWL_API_KEY in scraper/.env", file=sys.stderr)
        return 2
    client = FirecrawlClient(api_key=api_key, timeout=180)
    # Scroll repeatedly so lazy-rendered menu sections load before extraction.
    actions = [{"type": "wait", "milliseconds": 8000}]
    actions += [{"type": "scroll", "direction": "down"}, {"type": "wait", "milliseconds": 1500}] * 15
    formats: list = ["markdown"]
    if menu_mode:
        schema = {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "price": {"type": "string"},
                            "category": {"type": "string"},
                            "description": {"type": "string"},
                        },
                        "required": ["name"],
                    },
                }
            },
        }
        formats = [
            {"type": "json", "prompt": "List every menu item sold by this restaurant "
             "with its peso price and menu category.", "schema": schema}
        ]
    document = client.scrape(
        url,
        formats=formats,
        only_main_content=not menu_mode,
        timeout=180000,
        wait_for=0,
        actions=actions,
        location={"country": "PH", "languages": ["en", "tl"]},
        remove_base64_images=True,
        check_prompt_injection=True,
    )
    if menu_mode:
        import json

        data = document.json if isinstance(document.json, dict) else {}
        items = data.get("items") or []
        text = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
        if out:
            out.write_text(text, encoding="utf-8")
        print(f"{len(items)} items")
        return 0
    markdown = document.markdown or ""
    if out:
        out.write_text(markdown, encoding="utf-8")
        print(f"wrote {len(markdown)} chars to {out}")
    else:
        print(markdown)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
