"""Merge scraper/data/*.csv into public/catalog.json (docs/dataset.md §5-6).

Usage:
    python scraper/build.py               # check + write public/catalog.json
    python scraper/build.py --check       # check only, write nothing
    python scraper/build.py --allow-small # skip the 60 items / 10 branches minimum (testing)

Rows that fail a check are dropped and printed with the reason. Fatal problems
(duplicate ids, too little data) stop the build and nothing is written.
Standard library only.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "scraper" / "data"
OUT = ROOT / "public" / "catalog.json"

CHAINS = ["jollibee", "mcdonalds", "mang-inasal", "chowking", "kfc", "goldilocks", "greenwich", "shakeys"]
PREFIX = {"jollibee": "jb", "mcdonalds": "mc", "mang-inasal": "mi", "chowking": "ck", "kfc": "kf", "goldilocks": "gl", "greenwich": "gw", "shakeys": "sh"}
CATEGORIES = ["meal", "main", "side", "drink", "dessert", "bundle"]
PROTEINS = ["chicken", "beef", "pork", "fish", "seafood", "mixed", "none"]
FOOD_TYPES = ["chicken", "burger", "pasta", "rice meal", "noodles", "sisig", "snack", "dessert", "drink"]
PERIODS = ["breakfast", "lunch", "merienda", "dinner", "late"]

# Keep in sync with docs/dataset.md "Tag list" and src/lib/parse/rules.ts.
CRAVING_TAGS = {
    "chicken", "beef", "fish", "burger", "fries", "spaghetti", "palabok", "noodles", "sisig",
    "bbq", "siopao", "siomai", "fried rice", "halo-halo", "ice cream", "dessert",
}
DETAIL_TAGS = {
    "rice", "unli-rice", "fried", "grilled", "sizzling", "soup", "sweet", "pasta", "pork", "shrimp",
    "cheese", "hotdog", "gravy", "pie", "bun", "dumpling", "drink", "soda", "iced tea", "coffee",
    "breakfast", "bucket", "inasal", "burger steak", "sweet and sour", "lauriat", "mami", "fillet", "bangus",
}
TAGS = CRAVING_TAGS | DETAIL_TAGS

LAT = (15.4, 15.6)
LNG = (120.9, 121.05)
MIN_ITEMS, MIN_BRANCHES = 60, 10

ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class RowError(Exception):
    pass


def read(data: Path, name: str) -> list[dict[str, str]]:
    path = data / name
    if not path.exists():
        sys.exit(f"FATAL: missing {path}")
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [{k.strip(): (v or "").strip() for k, v in row.items() if k} for row in csv.DictReader(f)]


def need(row: dict[str, str], *cols: str) -> None:
    blank = [c for c in cols if not row.get(c)]
    if blank:
        raise RowError(f"blank required: {', '.join(blank)}")


def one_of(value: str, allowed: list[str], col: str) -> str:
    if value not in allowed:
        raise RowError(f"{col}={value!r} not in {allowed}")
    return value


def to_int(value: str, col: str, lo: int | None = None, hi: int | None = None) -> int:
    try:
        n = int(value)
    except ValueError:
        raise RowError(f"{col}={value!r} is not a whole number") from None
    if (lo is not None and n < lo) or (hi is not None and n > hi):
        raise RowError(f"{col}={n} outside {lo}-{hi}")
    return n


def to_bool(value: str, col: str) -> bool:
    if value not in ("true", "false"):
        raise RowError(f"{col}={value!r} must be true/false")
    return value == "true"


def to_coord(value: str, col: str, bounds: tuple[float, float]) -> float:
    try:
        x = float(value)
    except ValueError:
        raise RowError(f"{col}={value!r} is not a number") from None
    if not bounds[0] <= x <= bounds[1]:
        raise RowError(f"{col}={x} outside Cabanatuan {bounds[0]}-{bounds[1]}")
    return round(x, 6)


def check_id(value: str, chain: str | None = None) -> str:
    if not ID_RE.match(value):
        raise RowError(f"id={value!r} must be lowercase words joined by '-'")
    if chain and not value.startswith(PREFIX[chain] + "-"):
        raise RowError(f"id={value!r} must start with '{PREFIX[chain]}-'")
    return value


def verified(row: dict[str, str]) -> None:
    status = row.get("label_status", "")
    if status != "verified":
        raise RowError(f"label_status={status or 'blank'} (only 'verified' ships)")


def build_chain(row: dict[str, str]) -> dict:
    need(row, "id", "name", "color", *(f"wait_{p}" for p in PERIODS))
    one_of(row["id"], CHAINS, "id")
    if not re.match(r"^#[0-9A-Fa-f]{6}$", row["color"]):
        raise RowError(f"color={row['color']!r} must be #RRGGBB")
    return {
        "id": row["id"],
        "name": row["name"],
        "color": row["color"],
        "avg_wait": {p: to_int(row[f"wait_{p}"], f"wait_{p}", 0, 60) for p in PERIODS},
    }


def build_branch(row: dict[str, str]) -> tuple[dict, str]:
    verified(row)
    need(row, "id", "chain", "name", "lat", "lng", "is_24h", "base_wait_minutes", "exists_on_google_maps", "checked_date")
    chain = one_of(row["chain"], CHAINS, "chain")
    if not to_bool(row["exists_on_google_maps"], "exists_on_google_maps"):
        raise RowError("exists_on_google_maps=false")
    if not DATE_RE.match(row["checked_date"]):
        raise RowError(f"checked_date={row['checked_date']!r} must be YYYY-MM-DD")
    is_24h = to_bool(row["is_24h"], "is_24h")
    if is_24h:
        hours = {"open": "00:00", "close": "23:59"}
    else:
        need(row, "open_time", "close_time")
        for col in ("open_time", "close_time"):
            if not TIME_RE.match(row[col]):
                raise RowError(f"{col}={row[col]!r} must be HH:MM (24h)")
        hours = {"open": row["open_time"], "close": row["close_time"]}
    source = f"osm:{row['osm_id']}" if row.get("osm_id") else "added by hand"
    branch = {
        "id": check_id(row["id"], chain),
        "chain": chain,
        "name": row["name"],
        "lat": to_coord(row["lat"], "lat", LAT),
        "lng": to_coord(row["lng"], "lng", LNG),
        "hours": hours,
        "is_24h": is_24h,
        "base_wait_minutes": to_int(row["base_wait_minutes"], "base_wait_minutes", 0, 60),
        "has_drive_thru": to_bool(row.get("has_drive_thru") or "false", "has_drive_thru"),
        "source": f"{source}, checked {row['checked_date']}",
    }
    return branch, row["checked_date"]


def build_item(row: dict[str, str]) -> tuple[dict, str]:
    verified(row)
    need(
        row, "id", "chain", "name", "price", "category", "desc", "serves", "tags", "protein", "contains_pork",
        "spicy", "fill_score", "prep_minutes", "food_type", "breakfast_only", "source_url", "price_date",
    )
    chain = one_of(row["chain"], CHAINS, "chain")
    category = one_of(row["category"], CATEGORIES, "category")
    serves = to_int(row["serves"], "serves", 1, 6)
    if category == "bundle" and serves < 3:
        raise RowError(f"bundle serves={serves}, must be 3-6")
    if category != "bundle" and serves != 1:
        raise RowError(f"serves={serves} but only bundles serve more than 1")
    tags = [t.strip().lower() for t in row["tags"].split("|") if t.strip()]
    unknown = [t for t in tags if t not in TAGS]
    if unknown:
        raise RowError(f"tags not on the tag list: {unknown} (docs/dataset.md)")
    protein = one_of(row["protein"], PROTEINS, "protein")
    pork = one_of(row["contains_pork"], ["true", "false", "unknown"], "contains_pork")
    if not DATE_RE.match(row["price_date"]):
        raise RowError(f"price_date={row['price_date']!r} must be YYYY-MM-DD")
    item = {
        "id": check_id(row["id"], chain),
        "chain": chain,
        "name": row["name"],
        "price": to_int(row["price"], "price", 1),
        "category": category,
        "tags": tags,
        "protein": None if protein == "none" else protein,
        "contains_pork": "unknown" if pork == "unknown" else pork == "true",
        "spicy": to_bool(row["spicy"], "spicy"),
        "fill_score": to_int(row["fill_score"], "fill_score", *((1, 30) if category == "bundle" else (0, 5))),
        "prep_minutes": to_int(row["prep_minutes"], "prep_minutes", 1, 30),
        "serves": serves,
        "desc": row["desc"],
        "food_type": one_of(row["food_type"], FOOD_TYPES, "food_type"),
        "includes": row.get("includes", ""),
        "breakfast_only": to_bool(row["breakfast_only"], "breakfast_only"),
    }
    return item, row["price_date"]


def build_landmark(row: dict[str, str]) -> dict:
    need(row, "id", "name", "lat", "lng")
    return {
        "id": check_id(row["id"]),
        "name": row["name"],
        "lat": to_coord(row["lat"], "lat", LAT),
        "lng": to_coord(row["lng"], "lng", LNG),
    }


def collect(rows, builder, label, dropped):
    out = []
    for n, row in enumerate(rows, start=2):  # row 1 is the header
        try:
            out.append(builder(row))
        except RowError as e:
            dropped.append(f"{label}.csv line {n} ({row.get('id') or row.get('name') or '?'}): {e}")
    return out


def fatal_dupes(rows: list[dict], label: str, fatal: list[str]) -> None:
    seen: set[str] = set()
    for r in rows:
        if r["id"] in seen:
            fatal.append(f"duplicate {label} id: {r['id']}")
        seen.add(r["id"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="check only, don't write")
    ap.add_argument("--allow-small", action="store_true", help="skip minimum size (testing only)")
    ap.add_argument("--data", type=Path, default=DATA, help=argparse.SUPPRESS)
    ap.add_argument("--out", type=Path, default=OUT, help=argparse.SUPPRESS)
    args = ap.parse_args()

    dropped: list[str] = []
    fatal: list[str] = []
    chains = collect(read(args.data, "chains.csv"), build_chain, "chains", dropped)
    branch_rows = collect(read(args.data, "branches.csv"), build_branch, "branches", dropped)
    item_rows = collect(read(args.data, "menu_items.csv"), build_item, "menu_items", dropped)
    landmarks = collect(read(args.data, "landmarks.csv"), build_landmark, "landmarks", dropped)
    candidate_branches = [b for b, _ in branch_rows]
    candidate_items = [i for i, _ in item_rows]
    active_chain_ids = {
        chain for chain in CHAINS
        if any(b["chain"] == chain for b in candidate_branches)
        and any(i["chain"] == chain and i["category"] == "meal" for i in candidate_items)
    }
    active_chains = [c for c in chains if c["id"] in active_chain_ids]
    active_branch_rows = [(b, checked) for b, checked in branch_rows if b["chain"] in active_chain_ids]
    active_item_rows = [(i, checked) for i, checked in item_rows if i["chain"] in active_chain_ids]
    branches = [b for b, _ in active_branch_rows]
    items = [i for i, _ in active_item_rows]

    for rows, label in ((chains, "chain"), (candidate_branches, "branch"), (candidate_items, "item"), (landmarks, "landmark")):
        fatal_dupes(rows, label, fatal)

    if sorted(c["id"] for c in chains) != sorted(CHAINS):
        fatal.append(f"chains.csv must have exactly {CHAINS}")
    if len(landmarks) != 5:
        fatal.append(f"need 5 landmarks, have {len(landmarks)}")
    if not active_chains:
        fatal.append("need at least 1 chain with a verified branch and verified meal")
    if not args.allow_small:
        if len(items) < MIN_ITEMS:
            fatal.append(f"need >= {MIN_ITEMS} items, have {len(items)}")
        if len(branches) < MIN_BRANCHES:
            fatal.append(f"need >= {MIN_BRANCHES} branches, have {len(branches)}")

    # Ids users may have saved on their phones (history, saved, taste).
    warnings: list[str] = []
    if args.out.exists():
        old = json.loads(args.out.read_text(encoding="utf-8"))
        if not old.get("mock"):
            for key, new in (("items", items), ("branches", branches)):
                gone = {r["id"] for r in old.get(key, [])} - {r["id"] for r in new}
                warnings += [f"{key} id gone since last build (removed or renamed?): {i}" for i in sorted(gone)]

    print(f"active chains {len(active_chains)} | branches {len(branches)} | items {len(items)} | landmarks {len(landmarks)}")
    for chain in CHAINS:
        n_items = sum(i["chain"] == chain for i in items)
        n_branches = sum(b["chain"] == chain for b in branches)
        state = "active" if chain in active_chain_ids else "not shipped (needs verified branch + meal)"
        print(f"  {chain:12} {n_branches:3} branches {n_items:4} items — {state}")
    for line in dropped:
        print(f"DROPPED  {line}")
    for line in warnings:
        print(f"WARNING  {line}")
    for line in fatal:
        print(f"FATAL    {line}")
    if fatal:
        print("Not written. Fix the FATAL lines above.")
        return 1

    version = max([d for _, d in active_branch_rows] + [d for _, d in active_item_rows])
    catalog = {
        "version": version,
        "currency": "PHP",
        "items": items,
        "branches": branches,
        "landmarks": landmarks,
        "chains": active_chains,
    }
    if args.check:
        print("Check OK (nothing written).")
        return 0
    args.out.write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {args.out.relative_to(ROOT) if args.out.is_relative_to(ROOT) else args.out} (version {version}). Now run: npm test")
    return 0


if __name__ == "__main__":
    sys.exit(main())
