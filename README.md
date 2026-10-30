# mystore

A fast, mobile-friendly online store with **728 products** in 10 categories. It is plain HTML, CSS and JavaScript, so it runs free on GitHub Pages with no server or database.

**Features:** home page, category pages, search, sorting, pagination, product pages with image gallery, cart, and Cash-on-Delivery checkout. Orders arrive on WhatsApp.

## Change store settings
Edit `config.js` to set the store name, WhatsApp number (orders go here), delivery charge and free-delivery limit.

## Update products
Prices on the site = CSV price + `PRICE_MARKUP` (Rs. 300, set in `tools/build_products.py`).

1. Replace `data/All_Products_CSV_for_Shopify.csv` with a new export (same columns).
2. Run `python3 tools/build_products.py`.
3. Commit and push. The site updates automatically.

## Add products by hand
Put product photos in `images/products/` and add one row per product to `data/extra_products.csv`:
`Title, Price, Category, Description, Images` (several images separated by `|`, e.g. `images/products/cup-1.jpg|images/products/cup-2.jpg`). Then run `python3 tools/build_products.py`. The Rs. 300 markup is added here too.

## Go live on GitHub Pages
Open **Settings → Pages**, set **Source** to *Deploy from a branch*, pick the branch and the `/ (root)` folder, then click **Save**. The site will be at `https://asadprofficial-code.github.io/mystore/`.

## Files
| Path | What it is |
|---|---|
| `index.html` | Page shell |
| `config.js` | Store settings |
| `assets/app.js` | Store logic (pages, cart, checkout) |
| `assets/style.css` | Design |
| `data/products.json` | Product catalog (generated) |
| `data/desc/*.json` | Product descriptions (generated) |
| `tools/build_products.py` | CSV to JSON converter |
