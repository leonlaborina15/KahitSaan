"""Collect Cabanatuan fast-food branch candidates from OpenStreetMap Overpass.

Output rows are candidates only. Google Maps/store-directory verification is
still required for existence and hours before setting ``label_status=verified``.

Usage:
    .venv/Scripts/python scraper/branches.py
"""

from __future__ import annotations

import csv
import re
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "scraper" / "output" / "branches_candidates.csv"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
BBOX = "15.4,120.9,15.6,121.05"

CHAIN_PATTERNS = [
    ("jollibee", "jb", re.compile(r"\bjollibee\b", re.I)),
    ("mcdonalds", "mc", re.compile(r"\bmc\s*donald'?s?\b|\bmcdo\b", re.I)),
    ("mang-inasal", "mi", re.compile(r"\bmang\s+inasal\b", re.I)),
    ("chowking", "ck", re.compile(r"\bchowking\b", re.I)),
    ("kfc", "kf", re.compile(r"\bkfc\b|kentucky fried chicken", re.I)),
    ("goldilocks", "gl", re.compile(r"\bgoldilocks\b", re.I)),
    ("greenwich", "gw", re.compile(r"\bgreenwich\b", re.I)),
    ("shakeys", "sh", re.compile(r"\bshakey'?s\b", re.I)),
]

NAME_REGEX = "Jollibee|Mc ?Donald'?s|Mcdo|Mang Inasal|Chowking|KFC|Kentucky Fried Chicken|Goldilocks|Greenwich|Shakey'?s"
QUERY = f"""[out:json][timeout:90];
(
  nwr[\"name\"~\"{NAME_REGEX}\",i]({BBOX});
  nwr[\"brand\"~\"{NAME_REGEX}\",i]({BBOX});
  nwr[\"operator\"~\"{NAME_REGEX}\",i]({BBOX});
);
out center tags;"""

COLUMNS = [
    "id", "chain", "name", "lat", "lng", "osm_id", "open_time", "close_time", "is_24h",
    "has_drive_thru", "base_wait_minutes", "exists_on_google_maps", "checked_date", "label_status",
    "source_url", "raw_opening_hours",
]


def slug(value: str) -> str:
    value = value.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")[:64] or "branch"


def match_chain(tags: dict[str, Any]) -> tuple[str, str] | None:
    text = " ".join(str(tags.get(key, "")) for key in ("brand", "name", "operator"))
    for chain, prefix, pattern in CHAIN_PATTERNS:
        if pattern.search(text):
            return chain, prefix
    return None


def coordinates(element: dict[str, Any]) -> tuple[Any, Any]:
    if element.get("type") == "node":
        return element.get("lat"), element.get("lon")
    center = element.get("center") or {}
    return center.get("lat") or element.get("lat"), center.get("lon") or element.get("lon")


def query_overpass() -> list[dict[str, Any]]:
    headers = {"User-Agent": "KahitSaan-dataset-builder/1.0"}
    errors: list[str] = []
    for endpoint in OVERPASS_URLS:
        for method in ("post", "get"):
            try:
                if method == "post":
                    response = requests.post(endpoint, data={"data": QUERY}, headers=headers, timeout=120)
                else:
                    response = requests.get(endpoint, params={"data": QUERY}, headers=headers, timeout=120)
                response.raise_for_status()
                elements = response.json().get("elements", [])
                print(f"Overpass source: {endpoint} ({method.upper()})")
                return elements
            except (requests.RequestException, ValueError) as exc:
                errors.append(f"{endpoint} {method.upper()}: {exc}")
                print(f"Overpass mirror failed: {endpoint} {method.upper()}", file=sys.stderr)
    print("FATAL: all Overpass endpoints failed:\n  " + "\n  ".join(errors), file=sys.stderr)
    raise SystemExit(1)


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# (left, top, right, bottom) — same bbox as QUERY, viewbox order for Nominatim.
VIEWBOX = "120.9,15.6,121.05,15.4"
NOMINATIM_QUERIES = {
    "jollibee": "Jollibee",
    "mcdonalds": "McDonald's",
    "mang-inasal": "Mang Inasal",
    "chowking": "Chowking",
    "kfc": "KFC",
    "goldilocks": "Goldilocks",
    "greenwich": "Greenwich",
    "shakeys": "Shakey's",
}


def query_nominatim() -> list[dict[str, Any]]:
    """Fallback collector when no Overpass mirror responds.

    Searches each chain name bounded to Cabanatuan. Returns pseudo-elements in
    Overpass shape: no OSM tags beyond the display name, so opening hours and
    drive-through stay blank for manual review. Nominatim policy: max 1 req/s.
    """
    elements: list[dict[str, Any]] = []
    for chain, term in NOMINATIM_QUERIES.items():
        response = requests.get(
            NOMINATIM_URL,
            params={
                "format": "jsonv2",
                "q": term,
                "viewbox": VIEWBOX,
                "bounded": 1,
                "limit": 50,
            },
            headers={"User-Agent": "KahitSaan-dataset-builder/1.0"},
            timeout=60,
        )
        response.raise_for_status()
        for hit in response.json():
            if hit.get("osm_type") not in ("node", "way", "relation"):
                continue
            elements.append({
                "type": hit["osm_type"],
                "id": hit["osm_id"],
                "lat": hit["lat"],
                "lon": hit["lon"],
                "tags": {"name": hit.get("name") or hit["display_name"].split(",")[0], "brand": term},
            })
        print(f"Nominatim: {len(response.json())} hits for {term}")
        time.sleep(1.1)
    print(f"Overpass source: {NOMINATIM_URL} (fallback, {len(elements)} elements)")
    return elements


def main() -> int:
    try:
        elements = query_overpass()
    except SystemExit:
        print("Falling back to Nominatim search", file=sys.stderr)
        elements = query_nominatim()

    rows: list[dict[str, str]] = []
    seen_osm: set[str] = set()
    used_ids: dict[str, int] = {}
    for element in elements:
        tags = element.get("tags") or {}
        matched = match_chain(tags)
        lat, lng = coordinates(element)
        if not matched or lat is None or lng is None:
            continue
        chain, prefix = matched
        osm_id = f"{element['type']}/{element['id']}"
        if osm_id in seen_osm:
            continue
        seen_osm.add(osm_id)
        name = str(tags.get("name") or tags.get("brand") or chain).strip()
        base = f"{prefix}-{slug(name)}"
        used_ids[base] = used_ids.get(base, 0) + 1
        candidate_id = base if used_ids[base] == 1 else f"{base}-{used_ids[base]}"
        opening_hours = str(tags.get("opening_hours") or "")
        is_24h = "true" if opening_hours.strip() == "24/7" else "false"
        drive_thru = "true" if str(tags.get("drive_through", "")).lower() == "yes" else "false"
        rows.append({
            "id": candidate_id,
            "chain": chain,
            "name": name,
            "lat": f"{float(lat):.6f}",
            "lng": f"{float(lng):.6f}",
            "osm_id": osm_id,
            "open_time": "",
            "close_time": "",
            "is_24h": is_24h,
            "has_drive_thru": drive_thru,
            "base_wait_minutes": "",
            "exists_on_google_maps": "",
            "checked_date": date.today().isoformat(),
            "label_status": "needs review",
            "source_url": f"https://www.openstreetmap.org/{osm_id}",
            "raw_opening_hours": opening_hours,
        })

    rows.sort(key=lambda row: (row["chain"], row["name"].casefold(), row["osm_id"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} branch candidates to {OUT}")
    for chain, _, _ in CHAIN_PATTERNS:
        print(f"  {chain:12} {sum(row['chain'] == chain for row in rows):3}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
