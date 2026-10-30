"""Convert supplier product exports into the JSON files used by the website.

Usage: python3 tools/build_products.py

Reads
  data/All_Products_CSV_for_Shopify.csv  YourMart export (Shopify format)
  data/hhc_products_export.csv           HHC export (WooCommerce format, with variations)
  data/extra_products.csv                products added by hand:
                                         Title, Price, Category, Description, Images
Writes
  data/catalog.json        compact list of every product (used for listing and search)
  data/detail/<n>.json     images, description and variants, CHUNK products per file

Rules
  - Every price (and variant price) gets PRICE_MARKUP added.
  - Products without a price or without a picture are skipped.
  - Products with the same name are listed once: the hand-added / YourMart one wins,
    otherwise the cheapest HHC listing.
"""
import csv
import html
import json
import os
import re
from collections import Counter, defaultdict
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
YOURMART_CSV = os.path.join(DATA, "All_Products_CSV_for_Shopify.csv")
HHC_CSV = os.path.join(DATA, "hhc_products_export.csv")
EXTRA_CSV = os.path.join(DATA, "extra_products.csv")
DETAIL_DIR = os.path.join(DATA, "detail")
CHUNK = 100

# Profit added to every supplier price (in Rs.)
PRICE_MARKUP = 300

# Image URL prefixes stored as short codes to keep catalog.json small (expanded in app.js)
IMG_PREFIXES = {
    "y": "https://admin.yourmart.pk/storage/uploads/inventory/products/media/",
    "h": "https://hhcnewapp.blr1.cdn.digitaloceanspaces.com/uploads/",
}

# YourMart category -> (main category, sub category)
YOURMART_CATEGORIES = {
    "Personal Care & Beauty": ("Health & Beauty", "Personal Care & Beauty"),
    "Home, Kitchen & Lifestyle": ("Home & Living", "Kitchen & Lifestyle"),
    "Smart Gadgets": ("Electronics & Appliances", "Smart Gadgets"),
    "Video, Lighting & Content Studio": ("Electronics & Appliances", "Video, Lighting & Studio"),
    "Bags & Handbags": ("Fashion & Apparel", "Bags & Handbags"),
    "Apparel & Clothing": ("Fashion & Apparel", "Apparel & Clothing"),
    "Kids & Gaming": ("Toys & Games", "Kids & Gaming"),
    "Airpods & Headsets": ("Electronics & Appliances", "Airpods & Headsets"),
    "Smart Watches": ("Electronics & Appliances", "Smart Watches"),
    "Perfume & Fragrances": ("Health & Beauty", "Perfume & Fragrances"),
}

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
        self.out.append(escape(data))


def escape(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def sanitize(markup):
    s = Sanitizer()
    s.feed(markup)
    s.close()
    return re.sub(r"<p>\s*</p>", "", "".join(s.out)).strip()


def text_to_html(text):
    """Plain-text description (HHC, hand-added) -> paragraphs."""
    lines = [escape(unescape(line).strip()) for line in text.splitlines()]
    blocks = re.split(r"(?:\n\s*){2,}", "\n".join(lines))
    return "".join("<p>" + b.strip().replace("\n", "<br>") + "</p>" for b in blocks if b.strip())


def unescape(text):
    """Supplier text is sometimes HTML-escaped twice ("&amp;amp;")."""
    for _ in range(3):
        decoded = html.unescape(text)
        if decoded == text:
            break
        text = decoded
    return text


def clean_title(text):
    return re.sub(r"\s+", " ", unescape(text)).strip().rstrip("-").strip()


def name_key(text):
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def price(value):
    try:
        return round(float(value))
    except ValueError:
        return 0


def is_video(url):
    return url.lower().split("?")[0].endswith((".mp4", ".mov", ".webm"))


def short_img(url):
    for code, prefix in IMG_PREFIXES.items():
        if url.startswith(prefix):
            return code + ":" + url[len(prefix):]
    return url


def read_csv(path):
    csv.field_size_limit(1 << 30)
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def product(sku, title, base_price, main, sub, media, desc_html, variants=None):
    """Return a product dict, or None when it can't be sold (no price / no picture)."""
    images = [m for m in media if not is_video(m)]
    if base_price <= 0 or not images:
        return None
    videos = [m for m in media if is_video(m)]
    variants = [(label, p + PRICE_MARKUP) for label, p in (variants or []) if p > 0]
    prices = [p for _, p in variants] or [base_price + PRICE_MARKUP]
    return {
        "sku": sku,
        "title": title,
        "price": min(prices),
        "from": len(set(prices)) > 1,
        "main": main or "Other",
        "sub": sub or "",
        "images": images + videos,
        "desc": desc_html,
        "variants": variants,
    }


def load_yourmart():
    rows, out = read_csv(YOURMART_CSV), []
    current = None
    for row in rows:
        if row["Title"].strip():
            main, sub = YOURMART_CATEGORIES.get(row["Tags"].strip(), ("Other", row["Tags"].strip()))
            current = {
                "sku": "ym-" + (row["SKU"].strip() or row["URL handle"].strip()),
                "title": clean_title(row["Title"]),
                "price": price(row["Price"]),
                "main": main,
                "sub": sub,
                "media": [],
                "desc": sanitize(row["Description"]),
            }
            out.append(current)
        img = row["Image Src"].strip()
        if current and img and img not in current["media"]:
            current["media"].append(img)
    return [p for p in (product(c["sku"], c["title"], c["price"], c["main"], c["sub"], c["media"], c["desc"]) for c in out) if p]


def hhc_categories(rows):
    """HHC categories look like 'A, A > B, B > C'. Work out each name's parent so every product gets a root."""
    parents = defaultdict(Counter)
    for row in rows:
        for seg in row["Categories"].split(","):
            if ">" in seg:
                parent, child = [s.strip() for s in seg.split(">", 1)]
                if parent != child:
                    parents[child][parent] += 1

    def root(name):
        seen = set()
        while name in parents and name not in seen:
            seen.add(name)
            name = parents[name].most_common(1)[0][0]
        return name

    def classify(categories):
        segs = [s.strip() for s in categories.split(",") if s.strip()]
        if not segs:
            return "Other", ""
        first = segs[0].split(">")[0].strip()
        main = root(first)
        for seg in segs:
            parts = [s.strip() for s in seg.split(">")]
            if len(parts) == 2 and parts[0] == main:
                return main, parts[1]
        return main, first if first != main else ""

    return classify


def load_hhc():
    if not os.path.exists(HHC_CSV):
        return []
    rows = read_csv(HHC_CSV)
    variations = defaultdict(list)
    for row in rows:
        if row["Type"] == "variation":
            label = row["Variation Attributes"].strip() or "Option"
            variations["hhc-" + row["Parent ID"].strip()].append((label, price(row["Regular price"])))
    parents = [r for r in rows if r["Type"] != "variation"]
    classify = hhc_categories(parents)
    out = []
    for row in parents:
        main, sub = classify(row["Categories"])
        media = list(dict.fromkeys(u.strip() for u in row["Images"].split(",") if u.strip()))
        desc = row["Description"].strip() or row["Short description"].strip()
        sku = row["SKU"].strip()
        p = product(sku, clean_title(row["Name"]), price(row["Regular price"]), main, sub, media,
                    text_to_html(desc), variations.get(sku))
        if p:
            out.append(p)
    return out


def load_extra():
    if not os.path.exists(EXTRA_CSV):
        return []
    out = []
    for i, row in enumerate(read_csv(EXTRA_CSV)):
        title = clean_title(row["Title"])
        if not title:
            continue
        main, _, sub = (row["Category"] or "Other").partition(">")
        media = [m.strip() for m in row["Images"].split("|") if m.strip()]
        p = product(f"my-{i + 1}", title, price(row["Price"]), main.strip(), sub.strip(), media,
                    text_to_html(row["Description"]))
        if p:
            out.append(p)
    return out


def main():
    sources = [("hand-added", load_extra()), ("YourMart", load_yourmart()), ("HHC", load_hhc())]

    # one listing per product name; earlier sources win, then the cheapest
    chosen = {}
    for rank, (_, items) in enumerate(sources):
        for p in items:
            key = name_key(p["title"])
            old = chosen.get(key)
            if old is None or (old[0] == rank and p["price"] < old[1]["price"]):
                chosen[key] = (rank, p)
    products = [p for _, p in sorted(chosen.values(), key=lambda rp: rp[0])]
    # keep original order inside each source
    order = {id(p): i for i, p in enumerate(p for _, items in sources for p in items)}
    products.sort(key=lambda p: order[id(p)])

    # categories: main -> subs, ordered by size
    main_count = Counter(p["main"] for p in products)
    mains = [m for m, _ in main_count.most_common() if m != "Other"] + (["Other"] if "Other" in main_count else [])
    subs = {m: [s for s, _ in Counter(p["sub"] for p in products if p["main"] == m and p["sub"]).most_common()] for m in mains}

    cats = []
    for m in mains:
        first = next(p for p in products if p["main"] == m)
        sub_counts = Counter(p["sub"] for p in products if p["main"] == m and p["sub"])
        cats.append({
            "name": m,
            "slug": slugify(m),
            "count": main_count[m],
            "image": short_img(first["images"][0]),
            "subs": [{"name": s, "slug": slugify(s), "count": sub_counts[s]} for s in subs[m]],
        })
    main_idx = {m: i for i, m in enumerate(mains)}
    sub_idx = {m: {s: i for i, s in enumerate(subs[m])} for m in mains}

    os.makedirs(DETAIL_DIR, exist_ok=True)
    for old in os.listdir(DETAIL_DIR):
        os.remove(os.path.join(DETAIL_DIR, old))
    for start in range(0, len(products), CHUNK):
        chunk = {}
        for i, p in enumerate(products[start:start + CHUNK], start):
            d = {"i": [short_img(u) for u in p["images"]], "d": p["desc"]}
            if p["variants"]:
                d["v"] = p["variants"]
            chunk[i] = d
        with open(os.path.join(DETAIL_DIR, f"{start // CHUNK}.json"), "w", encoding="utf-8") as f:
            json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))

    # p: [sku, title, price, main index, sub index (-1 = none), first image, flags]
    # flags: 1 = price varies by option ("from"), 2 = has options
    catalog = {
        "img": IMG_PREFIXES,
        "chunk": CHUNK,
        "cats": cats,
        "p": [[p["sku"], p["title"], p["price"], main_idx[p["main"]], sub_idx[p["main"]].get(p["sub"], -1),
               short_img(p["images"][0]), (1 if p["from"] else 0) | (2 if p["variants"] else 0)] for p in products],
    }
    with open(os.path.join(DATA, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))

    for name, items in sources:
        print(f"{name}: {len(items)} sellable")
    print(f"{len(products)} products after removing duplicate names, {len(cats)} categories")


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


if __name__ == "__main__":
    main()
