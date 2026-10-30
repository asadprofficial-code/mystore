(function () {
  "use strict";

  var CFG = window.STORE_CONFIG;
  var app = document.getElementById("app");
  var CATS = [];          // [{name, slug, count, image, subs:[{name, slug, count}]}]
  var PRODUCTS = [];      // [{i, sku, title, price, from, options, main, sub, img, key}]
  var bySku = {};
  var IMG = {};
  var CHUNK = 100;
  var detailCache = {};
  var CART_KEY = "mystore_cart_v2";
  var PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f4f6"/>' +
    '<text x="50" y="56" font-size="12" text-anchor="middle" fill="#9ca3af" font-family="sans-serif">No image</text></svg>');

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return CFG.currency + " " + Number(n).toLocaleString("en-PK"); }
  // catalog stores image URLs as "<code>:<path>" (see IMG_PREFIXES in tools/build_products.py)
  function url(u) {
    var m = /^([a-z]):(.*)$/.exec(u || "");
    return m && IMG[m[1]] ? IMG[m[1]] + m[2] : u;
  }
  function isVideo(u) { return /\.(mp4|mov|webm)(\?|$)/i.test(u); }
  function img(src, alt, cls) {
    return '<img src="' + esc(url(src) || PLACEHOLDER) + '" alt="' + esc(alt) + '" loading="lazy" referrerpolicy="no-referrer"' +
      (cls ? ' class="' + cls + '"' : "") + ' onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">';
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function setTitle(t) { document.title = t ? t + " | " + CFG.name : CFG.name + " | Online Shopping in Pakistan"; }
  function waLink(text) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text); }
  function catBySlug(slug) { return CATS.find(function (c) { return c.slug === slug; }); }
  function productLink(p) { return "#/p/" + encodeURIComponent(p.sku); }

  function loadDetail(p) {
    var chunk = Math.floor(p.i / CHUNK);
    if (!detailCache[chunk]) {
      detailCache[chunk] = fetch("data/detail/" + chunk + ".json").then(function (r) { return r.json(); })
        .catch(function () { delete detailCache[chunk]; return {}; });
    }
    // descriptions are sanitised at build time (tools/build_products.py)
    return detailCache[chunk].then(function (d) { return d[p.i] || { i: [p.img], d: "" }; });
  }

  // ---------- cart (stored in this browser only) ----------
  // line: {k: sku, v: option label or "", q: quantity, p: unit price}
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
    updateCartCount();
  }
  function addToCart(p, option, unitPrice, qty) {
    var cart = getCart();
    var line = cart.find(function (l) { return l.k === p.sku && l.v === option; });
    if (line) { line.q += qty; line.p = unitPrice; } else cart.push({ k: p.sku, v: option, q: qty, p: unitPrice });
    saveCart(cart);
    toast("Added to cart ✓");
  }
  function cartLines() {
    return getCart().map(function (l) { return { p: bySku[l.k], v: l.v, q: l.q, price: l.p }; })
      .filter(function (l) { return l.p && l.price > 0; });
  }
  function updateCartCount() {
    var n = cartLines().reduce(function (s, l) { return s + l.q; }, 0);
    document.getElementById("cartCount").textContent = n;
  }
  function totals(lines) {
    var sub = lines.reduce(function (s, l) { return s + l.price * l.q; }, 0);
    var free = !CFG.deliveryCharge || (CFG.freeDeliveryAbove > 0 && sub >= CFG.freeDeliveryAbove);
    var ship = sub === 0 || free ? 0 : CFG.deliveryCharge;
    return { sub: sub, ship: ship, total: sub + ship };
  }

  // ---------- shared pieces ----------
  function productCard(p) {
    var cat = CATS[p.main];
    var label = p.sub >= 0 ? cat.subs[p.sub].name : cat.name;
    return '<div class="card">' +
      '<a class="card-img" href="' + productLink(p) + '">' + img(p.img, p.title) + "</a>" +
      '<div class="card-body">' +
      '<span class="card-cat">' + esc(label) + "</span>" +
      '<a href="' + productLink(p) + '"><h3 class="card-title">' + esc(p.title) + "</h3></a>" +
      '<div class="card-foot"><span class="price">' + (p.from ? "<small>From</small> " : "") + money(p.price) + "</span>" +
      (p.options
        ? '<a class="add-btn" href="' + productLink(p) + '">Select options</a>'
        : '<button class="add-btn" data-add="' + esc(p.sku) + '">Add to cart</button>') +
      "</div></div></div>";
  }

  function renderChrome() {
    document.getElementById("logo").textContent = CFG.name;
    var freeTxt = !CFG.deliveryCharge ? "Free Delivery · "
      : CFG.freeDeliveryAbove > 0 ? "Free delivery on orders above " + money(CFG.freeDeliveryAbove) + " · " : "";
    document.getElementById("topbar").textContent = freeTxt + "Cash on Delivery all over Pakistan";
    document.getElementById("waFloat").href = waLink("Hi " + CFG.name + ", I have a question.");

    var nav = '<div class="catnav-inner"><a href="#/shop" data-cat="">All Products</a>';
    CATS.forEach(function (c) { nav += '<a href="#/shop?cat=' + c.slug + '" data-cat="' + c.slug + '">' + esc(c.name) + "</a>"; });
    document.getElementById("catnav").innerHTML = nav + "</div>";

    var cats = CATS.slice(0, 6).map(function (c) {
      return '<li><a href="#/shop?cat=' + c.slug + '">' + esc(c.name) + "</a></li>";
    }).join("");
    var contact = '<li><a href="' + waLink("Hi " + CFG.name) + '" target="_blank" rel="noopener">WhatsApp: +' + esc(CFG.whatsapp) + "</a></li>" +
      (CFG.phone ? "<li>Phone: " + esc(CFG.phone) + "</li>" : "") +
      (CFG.email ? '<li><a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + "</a></li>" : "");
    document.getElementById("footer").innerHTML =
      "<div><h4>" + esc(CFG.name) + "</h4><p>" + esc(CFG.tagline) + ". Order online and pay cash when your parcel arrives.</p></div>" +
      "<div><h4>Shop</h4><ul>" + cats + "</ul></div>" +
      "<div><h4>Contact</h4><ul>" + contact + "</ul></div>" +
      '<div class="copy">© ' + new Date().getFullYear() + " " + esc(CFG.name) + ". All rights reserved.</div>";
  }

  function highlightNav(cat) {
    document.querySelectorAll("#catnav a").forEach(function (a) {
      a.classList.toggle("active", location.hash.indexOf("#/shop") === 0 && a.getAttribute("data-cat") === (cat || ""));
    });
  }

  // ---------- pages ----------
  function pageHome() {
    setTitle("");
    var heroImgs = [0, 2, 5].map(function (i) { return img(PRODUCTS[i].img, PRODUCTS[i].title); }).join("");
    var cats = CATS.map(function (c) {
      return '<a class="cat-card" href="#/shop?cat=' + c.slug + '">' + img(c.image, c.name) +
        "<b>" + esc(c.name) + "</b><span>" + c.count.toLocaleString() + " products</span></a>";
    }).join("");

    var sections = CATS.slice(0, 6).map(function (c, ci) {
      var items = PRODUCTS.filter(function (p) { return p.main === ci; }).slice(0, 8);
      return '<section class="section"><div class="section-head"><h2>' + esc(c.name) + '</h2><a href="#/shop?cat=' + c.slug +
        '">View all ' + c.count.toLocaleString() + ' →</a></div><div class="grid">' + items.map(productCard).join("") + "</div></section>";
    }).join("");

    app.innerHTML =
      '<section class="hero"><div><h1>Everything you love, delivered to your door</h1><p>' + esc(CFG.tagline) +
      ". " + PRODUCTS.length.toLocaleString() + '+ products with free delivery and Cash on Delivery.</p><a class="btn btn-white" href="#/shop">Shop Now →</a></div><div class="hero-imgs">' + heroImgs + "</div></section>" +
      '<div class="trust"><div><b>🚚 Free Delivery</b>All over Pakistan</div><div><b>💵 Cash on Delivery</b>Pay when you receive</div>' +
      "<div><b>✅ Quality Checked</b>Before dispatch</div><div><b>💬 WhatsApp Support</b>Quick replies</div></div>" +
      '<section class="section"><div class="section-head"><h2>Shop by Category</h2></div><div class="cat-grid">' + cats + "</div></section>" +
      sections;
  }

  function pageShop(params) {
    var catSlug = params.get("cat") || "";
    var subSlug = params.get("sub") || "";
    var q = (params.get("q") || "").trim();
    var sort = params.get("sort") || "";
    var page = Math.max(1, parseInt(params.get("page"), 10) || 1);

    var cat = catBySlug(catSlug);
    var ci = CATS.indexOf(cat);
    var si = cat ? cat.subs.findIndex(function (s) { return s.slug === subSlug; }) : -1;

    var list = PRODUCTS.filter(function (p) { return (ci < 0 || p.main === ci) && (si < 0 || p.sub === si); });
    if (q) {
      var words = q.toLowerCase().split(/\s+/);
      list = list.filter(function (p) { return words.every(function (w) { return p.key.indexOf(w) !== -1; }); });
    }
    if (sort === "low") list = list.slice().sort(function (a, b) { return a.price - b.price; });
    if (sort === "high") list = list.slice().sort(function (a, b) { return b.price - a.price; });
    if (sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });

    var heading = q ? 'Search: "' + esc(q) + '"' : si >= 0 ? esc(cat.subs[si].name) : cat ? esc(cat.name) : "All Products";
    setTitle(q ? "Search: " + q : si >= 0 ? cat.subs[si].name : cat ? cat.name : "All Products");

    var per = CFG.productsPerPage;
    var pages = Math.max(1, Math.ceil(list.length / per));
    page = Math.min(page, pages);
    var slice = list.slice((page - 1) * per, page * per);

    function link(over) {
      var p = new URLSearchParams(params);
      Object.keys(over).forEach(function (k) { if (over[k]) p.set(k, over[k]); else p.delete(k); });
      var s = p.toString();
      return "#/shop" + (s ? "?" + s : "");
    }

    var catOpts = '<option value="">All categories</option>' + CATS.map(function (c) {
      return '<option value="' + c.slug + '"' + (c === cat ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
    var sortOpts = [["", "Featured"], ["low", "Price: Low to High"], ["high", "Price: High to Low"], ["az", "Name: A to Z"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === sort ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");

    var chips = cat && cat.subs.length ? '<div class="chips"><a href="' + link({ sub: "", page: "" }) + '"' + (si < 0 ? ' class="active"' : "") + ">All " + esc(cat.name) + "</a>" +
      cat.subs.map(function (s, i) {
        return '<a href="' + link({ sub: s.slug, page: "" }) + '"' + (i === si ? ' class="active"' : "") + ">" + esc(s.name) + " <small>" + s.count + "</small></a>";
      }).join("") + "</div>" : "";

    var pager = "";
    if (pages > 1) {
      var nums = [];
      for (var i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
        else if (nums[nums.length - 1] !== "…") nums.push("…");
      }
      pager = '<nav class="pager">' + (page > 1 ? '<a href="' + link({ page: page - 1 }) + '">‹</a>' : "") +
        nums.map(function (n) {
          return n === "…" ? "<span>…</span>" : '<a href="' + link({ page: n > 1 ? n : "" }) + '"' + (n === page ? ' class="active"' : "") + ">" + n + "</a>";
        }).join("") +
        (page < pages ? '<a href="' + link({ page: page + 1 }) + '">›</a>' : "") + "</nav>";
    }

    app.innerHTML =
      '<div class="shop-head"><h1>' + heading + "<small>" + list.length.toLocaleString() + ' products</small></h1><div class="filters">' +
      '<select id="fCat" aria-label="Category">' + catOpts + '</select><select id="fSort" aria-label="Sort">' + sortOpts + "</select></div></div>" + chips +
      (slice.length ? '<div class="grid">' + slice.map(productCard).join("") + "</div>" + pager
        : '<div class="empty">No products found. <a href="#/shop" style="color:var(--brand)">See all products</a></div>');

    document.getElementById("fCat").onchange = function () { location.hash = link({ cat: this.value, sub: "", page: "" }); };
    document.getElementById("fSort").onchange = function () { location.hash = link({ sort: this.value, page: "" }); };
    document.getElementById("searchInput").value = q;
    highlightNav(catSlug);
  }

  function pageProduct(sku) {
    var p = bySku[sku];
    if (!p) { app.innerHTML = '<div class="empty">Product not found. <a href="#/shop" style="color:var(--brand)">Back to shop</a></div>'; return; }
    setTitle(p.title);
    var cat = CATS[p.main];
    var sub = p.sub >= 0 ? cat.subs[p.sub] : null;
    var related = PRODUCTS.filter(function (x) { return x.main === p.main && x.sub === p.sub && x !== p; }).slice(0, 8);

    app.innerHTML =
      '<div class="crumbs"><a href="#/">Home</a> / <a href="#/shop?cat=' + cat.slug + '">' + esc(cat.name) + "</a>" +
      (sub ? ' / <a href="#/shop?cat=' + cat.slug + "&sub=" + sub.slug + '">' + esc(sub.name) + "</a>" : "") + "</div>" +
      '<div class="pdp"><div><div class="gallery-main" id="gMain">' + img(p.img, p.title) + '</div><div class="thumbs" id="thumbs"></div></div>' +
      '<div><span class="card-cat">' + esc(sub ? sub.name : cat.name) + "</span><h1>" + esc(p.title) + '</h1><div class="price" id="pPrice">' +
      (p.from ? "<small>From</small> " : "") + money(p.price) + "</div>" +
      '<div class="stock">● In stock, ready to ship</div><div id="options"></div>' +
      '<div class="buy-row"><div class="qty"><button data-q="-1" aria-label="Decrease">−</button><input id="qty" type="number" min="1" value="1" aria-label="Quantity"><button data-q="1" aria-label="Increase">+</button></div>' +
      '<button class="btn btn-brand" id="addBtn">Add to Cart</button></div>' +
      '<div class="buy-row"><button class="btn btn-outline" id="buyNow">Buy Now</button><a class="btn btn-wa" id="waOrder" target="_blank" rel="noopener">Order on WhatsApp</a></div>' +
      '<ul class="perks"><li>🚚 Free delivery all over Pakistan</li><li>💵 Cash on Delivery available</li><li>🔁 Easy exchange if the item arrives damaged</li></ul>' +
      "</div></div>" +
      '<section class="desc"><h2>Product Description</h2><div class="desc-body" id="descBody">Loading...</div></section>' +
      (related.length ? '<section class="section" style="margin-top:36px"><div class="section-head"><h2>You may also like</h2><a href="#/shop?cat=' + cat.slug +
        (sub ? "&sub=" + sub.slug : "") + '">View all →</a></div><div class="grid">' + related.map(productCard).join("") + "</div></section>" : "");

    var state = { option: "", price: p.price, variants: [] };
    var qtyInput = document.getElementById("qty");
    function qty() { return Math.max(1, parseInt(qtyInput.value, 10) || 1); }
    function refresh() {
      document.getElementById("pPrice").innerHTML = p.options && !state.option && p.from ? "<small>From</small> " + money(p.price) : money(state.price);
      document.getElementById("waOrder").href = waLink("Hi " + CFG.name + ", I want to order:\n" + p.title +
        (state.option ? "\nOption: " + state.option : "") + "\nQty: " + qty() + "\nPrice: " + money(state.price * qty()) + "\n" + location.href);
    }
    function ready() {
      if (state.variants.length && !state.option) { toast("Please select an option"); return false; }
      return true;
    }
    app.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { qtyInput.value = Math.max(1, qty() + parseInt(b.getAttribute("data-q"), 10)); refresh(); };
    });
    qtyInput.oninput = refresh;
    document.getElementById("addBtn").onclick = function () { if (ready()) addToCart(p, state.option, state.price, qty()); };
    document.getElementById("buyNow").onclick = function () {
      if (ready()) { addToCart(p, state.option, state.price, qty()); location.hash = "#/cart"; }
    };
    refresh();

    loadDetail(p).then(function (d) {
      if (bySku[sku] !== p || !document.getElementById("descBody")) return;   // user navigated away
      document.getElementById("descBody").innerHTML = d.d || "<p>No description available.</p>";

      var media = (d.i || []).map(url);
      var main = document.getElementById("gMain");
      function show(i) {
        var m = media[i];
        main.innerHTML = isVideo(m)
          ? '<video src="' + esc(m) + '" controls playsinline preload="metadata"></video>'
          : img(m, p.title);
        document.querySelectorAll("#thumbs button").forEach(function (b, j) { b.classList.toggle("active", j === i); });
      }
      if (media.length > 1) {
        document.getElementById("thumbs").innerHTML = media.map(function (m, i) {
          return '<button data-thumb="' + i + '" aria-label="Media ' + (i + 1) + '">' +
            (isVideo(m) ? '<span class="play">▶</span>' : img(m, p.title)) + "</button>";
        }).join("");
        document.querySelectorAll("#thumbs button").forEach(function (b) { b.onclick = function () { show(+b.getAttribute("data-thumb")); }; });
        show(0);
      }

      state.variants = d.v || [];
      if (state.variants.length) {
        document.getElementById("options").innerHTML = '<div class="opt-label">Select option:</div><div class="options">' +
          state.variants.map(function (v, i) { return '<button data-opt="' + i + '">' + esc(v[0]) + "</button>"; }).join("") + "</div>";
        document.querySelectorAll("[data-opt]").forEach(function (b) {
          b.onclick = function () {
            var v = state.variants[+b.getAttribute("data-opt")];
            state.option = v[0];
            state.price = v[1];
            document.querySelectorAll("[data-opt]").forEach(function (x) { x.classList.toggle("active", x === b); });
            refresh();
          };
        });
        if (state.variants.length === 1) document.querySelector("[data-opt]").click();
      }
    });
  }

  function pageCart() {
    setTitle("Cart");
    var lines = cartLines();
    if (!lines.length) {
      app.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p>Browse our products and add something you like.</p><a class="btn btn-brand" href="#/shop">Start Shopping</a></div>';
      return;
    }
    var t = totals(lines);
    var items = lines.map(function (l, i) {
      return '<div class="cart-item"><a href="' + productLink(l.p) + '">' + img(l.p.img, l.p.title) + "</a>" +
        '<div><a href="' + productLink(l.p) + '"><h3>' + esc(l.p.title) + "</h3></a>" +
        (l.v ? '<div class="note">Option: ' + esc(l.v) + "</div>" : "") +
        '<div class="qty"><button data-cq="-1" data-i="' + i + '" aria-label="Decrease">−</button><input value="' + l.q + '" readonly aria-label="Quantity">' +
        '<button data-cq="1" data-i="' + i + '" aria-label="Increase">+</button></div> ' +
        '<button class="remove" data-rm="' + i + '">Remove</button></div>' +
        '<b class="price">' + money(l.price * l.q) + "</b></div>";
    }).join("");

    var freeMsg = CFG.freeDeliveryAbove > 0 && t.ship > 0
      ? '<p class="note">Add ' + money(CFG.freeDeliveryAbove - t.sub) + " more for free delivery.</p>" : "";

    app.innerHTML =
      '<h1 style="margin-top:0">Your Cart</h1><div class="cart-layout"><div class="panel">' + items + "</div>" +
      '<div class="panel"><h3 style="margin-top:0">Order Summary</h3>' +
      '<div class="sum-row"><span>Subtotal</span><span>' + money(t.sub) + "</span></div>" +
      '<div class="sum-row"><span>Delivery</span><span>' + (t.ship ? money(t.ship) : "FREE") + "</span></div>" +
      '<div class="sum-row total"><span>Total</span><span>' + money(t.total) + "</span></div>" + freeMsg +
      '<form class="form" id="orderForm"><h3 style="margin:8px 0 0">Delivery Details</h3>' +
      '<input name="name" placeholder="Full name *" required autocomplete="name">' +
      '<input name="phone" placeholder="Phone number * (03xx xxxxxxx)" required inputmode="tel" pattern="[0-9+\\-\\s]{10,15}" autocomplete="tel">' +
      '<input name="city" placeholder="City *" required autocomplete="address-level2">' +
      '<textarea name="address" placeholder="Complete address *" required autocomplete="street-address"></textarea>' +
      '<textarea name="notes" placeholder="Order notes (optional)"></textarea>' +
      '<button class="btn btn-wa btn-block" type="submit">Place Order via WhatsApp (COD)</button>' +
      '<p class="note">Your order details will open in WhatsApp. Send the message and our team will confirm your order.</p></form></div></div>';

    // cart indexes here match cartLines() order because unknown products are dropped first
    function validCart() {
      return getCart().filter(function (l) { return bySku[l.k] && l.p > 0; });
    }
    app.querySelectorAll("[data-cq]").forEach(function (b) {
      b.onclick = function () {
        var cart = validCart(), line = cart[+b.getAttribute("data-i")];
        if (line) line.q = Math.max(1, line.q + parseInt(b.getAttribute("data-cq"), 10));
        saveCart(cart); pageCart();
      };
    });
    app.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () {
        var cart = validCart();
        cart.splice(+b.getAttribute("data-rm"), 1);
        saveCart(cart); pageCart();
      };
    });
    document.getElementById("orderForm").onsubmit = function (e) {
      e.preventDefault();
      var f = new FormData(this);
      var msg = "🛒 *New Order: " + CFG.name + "*\n\n" +
        lines.map(function (l, i) {
          return (i + 1) + ". " + l.p.title + (l.v ? " (" + l.v + ")" : "") + "\n   Code: " + l.p.sku +
            "\n   Qty: " + l.q + " × " + money(l.price) + " = " + money(l.price * l.q);
        }).join("\n") +
        "\n\nSubtotal: " + money(t.sub) + "\nDelivery: " + (t.ship ? money(t.ship) : "FREE") + "\n*Total: " + money(t.total) + "*\nPayment: Cash on Delivery" +
        "\n\n*Customer*\nName: " + f.get("name") + "\nPhone: " + f.get("phone") + "\nCity: " + f.get("city") + "\nAddress: " + f.get("address") +
        (f.get("notes") ? "\nNotes: " + f.get("notes") : "");
      window.open(waLink(msg), "_blank");
      saveCart([]);
      app.innerHTML = '<div class="empty"><h2>Thank you, ' + esc(f.get("name")) + '! 🎉</h2><p>Your order has opened in WhatsApp. Please press <b>Send</b> so we receive it.<br>' +
        'If WhatsApp did not open, <a style="color:var(--brand)" href="' + esc(waLink(msg)) + '" target="_blank" rel="noopener">click here</a>.</p>' +
        '<a class="btn btn-brand" href="#/shop">Continue Shopping</a></div>';
    };
  }

  // ---------- router ----------
  function route() {
    var hash = location.hash.slice(1) || "/";
    var qi = hash.indexOf("?");
    var path = qi === -1 ? hash : hash.slice(0, qi);
    var params = new URLSearchParams(qi === -1 ? "" : hash.slice(qi + 1));

    if (path.indexOf("/p/") === 0) pageProduct(decodeURIComponent(path.slice(3)));
    else if (path === "/shop") pageShop(params);
    else if (path === "/cart") pageCart();
    else pageHome();

    if (path !== "/shop") { document.getElementById("searchInput").value = ""; highlightNav(null); }
    window.scrollTo(0, 0);
  }

  // add-to-cart buttons on product cards (only products without options)
  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (b) { var p = bySku[b.getAttribute("data-add")]; if (p) addToCart(p, "", p.price, 1); }
  });
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = document.getElementById("searchInput").value.trim();
    location.hash = "#/shop" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  fetch("data/catalog.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      IMG = d.img;
      CHUNK = d.chunk;
      CATS = d.cats;
      PRODUCTS = d.p.map(function (r, i) {
        // r: [sku, title, price, main index, sub index, first image, flags]
        var p = { i: i, sku: r[0], title: r[1], price: r[2], main: r[3], sub: r[4], img: r[5], from: !!(r[6] & 1), options: !!(r[6] & 2) };
        var c = CATS[p.main];
        p.key = (p.title + " " + c.name + " " + (p.sub >= 0 ? c.subs[p.sub].name : "")).toLowerCase();
        bySku[p.sku] = p;
        return p;
      });
      renderChrome();
      updateCartCount();
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(function () {
      app.innerHTML = '<div class="empty">Could not load products. Please refresh the page.</div>';
    });
})();
