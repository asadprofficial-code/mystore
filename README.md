# mystore

A fast, mobile-friendly online store with **11,000+ products** from two suppliers (YourMart and HHC) in 18 categories. It is plain HTML, CSS and JavaScript, so it runs free on GitHub Pages with no server or database.

**Features:** banner slider, categories with sub-categories, live search suggestions, price filters, product pages with image zoom and video gallery, product options (colour / size), slide-out mini cart, mobile bottom navigation, help pages, and Cash-on-Delivery checkout. Orders arrive on WhatsApp.

## Change store settings
Edit `config.js` to set the store name, WhatsApp number (orders go here), contact details, social links, delivery charge and time, the rotating announcements and the home page banner slides.

The About, Contact, FAQ, Shipping, Returns, Privacy and Terms pages are written in `infoPages()` in `assets/app.js`. Review them and adjust to match how you actually run the store.

## Update products
Prices on the site = supplier price + `PRICE_MARKUP` (Rs. 300, set in `tools/build_products.py`). Products without a price or picture are skipped, and products with the same name are shown once.

1. Replace the supplier export(s) with a new download (same columns):
   - `data/All_Products_CSV_for_Shopify.csv`: YourMart
   - `data/hhc_products_export.csv`: HHC
2. Run `python3 tools/build_products.py`.
3. Commit and push. The site updates automatically.

## Add products by hand
Put product photos in `images/products/` and add one row per product to `data/extra_products.csv`:
`Title, Price, Category, Description, Images`. Category can be `Main` or `Main > Sub`; several images are separated by `|` (e.g. `images/products/cup-1.jpg|images/products/cup-2.jpg`). Then run `python3 tools/build_products.py`. The Rs. 300 markup is added here too.

## Go live on GitHub Pages
Open **Settings → Pages**, set **Source** to *Deploy from a branch*, pick the branch and the `/ (root)` folder, then click **Save**. The site will be at `https://asadprofficial-code.github.io/mystore/`.

## Files
| Path | What it is |
|---|---|
| `index.html` | Page shell |
| `config.js` | Store settings |
| `assets/app.js` | Store logic (pages, cart, checkout) |
| `assets/style.css` | Design |
| `data/catalog.json` | All products, compact (generated) |
| `data/detail/*.json` | Images, descriptions and options, 100 products per file (generated) |
| `tools/build_products.py` | Supplier CSV to JSON converter |
