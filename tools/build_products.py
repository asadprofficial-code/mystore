"""Convert the Shopify product CSV into JSON files used by the website.

Usage: python3 tools/build_products.py
Reads  data/All_Products_CSV_for_Shopify.csv
Writes data/products.json (catalog) and data/desc/<n>.json (descriptions, 100 per file)
"""
import csv
import json
import os
import re
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT, "data", "All_Products_CSV_for_Shopify.csv")
OUT_DIR = os.path.join(ROOT, "data")
DESC_DIR = os.path.join(OUT_DIR, "desc")
CHUNK = 100

ALLOWED = {"p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h3", "h4"}


class Sanitizer(HTMLParser):
    """Keep a small set of formatting tags, drop every attribute and other tag."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag in ALLOWED:
            self.out.append("<br>" if tag == "br" else f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in ALLOWED and tag != "br":
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def sanitize(html):
    s = Sanitizer()
    s.feed(html)
    s.close()
    text = "".join(s.out)
    text = re.sub(r"<p>\s*</p>", "", text)
    return text.strip()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    products, by_handle = [], {}
    for row in rows:
        handle = row["URL handle"].strip()
        if not handle:
            continue
        if handle not in by_handle:
            title = re.sub(r"\s+", " ", row["Title"]).strip()
            category = row["Tags"].strip() or "Other"  # each product has one category tag
            p = {
                "id": len(products),
                "handle": handle,
                "title": title,
                "price": round(float(row["Price"] or 0)),
                "cat": category,
                "catSlug": slugify(category),
                "images": [],
                "_desc": sanitize(row["Description"]),
            }
            by_handle[handle] = p
            products.append(p)
        img = row["Image Src"].strip()
        if img and img not in by_handle[handle]["images"]:
            by_handle[handle]["images"].append(img)

    os.makedirs(DESC_DIR, exist_ok=True)
    for old in os.listdir(DESC_DIR):
        os.remove(os.path.join(DESC_DIR, old))
    for start in range(0, len(products), CHUNK):
        chunk = {p["id"]: p["_desc"] for p in products[start:start + CHUNK]}
        with open(os.path.join(DESC_DIR, f"{start // CHUNK}.json"), "w", encoding="utf-8") as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))

    categories = {}
    for p in products:
        del p["_desc"]
        c = categories.setdefault(p["catSlug"], {"slug": p["catSlug"], "name": p["cat"], "count": 0, "image": p["images"][0] if p["images"] else ""})
        c["count"] += 1

    data = {
        "descChunk": CHUNK,
        "categories": sorted(categories.values(), key=lambda c: -c["count"]),
        "products": products,
    }
    with open(os.path.join(OUT_DIR, "products.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(products)} products, {len(categories)} categories")


if __name__ == "__main__":
    main()
