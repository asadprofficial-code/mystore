(function () {
  "use strict";

  var CFG = window.STORE_CONFIG;
  var app = document.getElementById("app");
  var DATA = null;
  var byHandle = {};
  var descCache = {};
  var CART_KEY = "mystore_cart";
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
  function img(src, alt, cls) {
    return '<img src="' + esc(src || PLACEHOLDER) + '" alt="' + esc(alt) + '" loading="lazy" referrerpolicy="no-referrer"' +
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

  // ---------- cart (stored in this browser only) ----------
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
    updateCartCount();
  }
  function addToCart(handle, qty) {
    var cart = getCart();
    var line = cart.find(function (l) { return l.h === handle; });
    if (line) line.q += qty; else cart.push({ h: handle, q: qty });
    saveCart(cart);
    toast("Added to cart ✓");
  }
  function cartLines() {
    return getCart().map(function (l) { return { p: byHandle[l.h], q: l.q }; }).filter(function (l) { return l.p; });
  }
  function updateCartCount() {
    var n = cartLines().reduce(function (s, l) { return s + l.q; }, 0);
    document.getElementById("cartCount").textContent = n;
  }
  function totals(lines) {
    var sub = lines.reduce(function (s, l) { return s + l.p.price * l.q; }, 0);
    var free = CFG.freeDeliveryAbove > 0 && sub >= CFG.freeDeliveryAbove;
    var ship = sub === 0 || free ? 0 : CFG.deliveryCharge;
    return { sub: sub, ship: ship, total: sub + ship };
  }

  // ---------- shared pieces ----------
  function productCard(p) {
    return '<div class="card">' +
      '<a class="card-img" href="#/p/' + p.handle + '">' + img(p.images[0], p.title) + "</a>" +
      '<div class="card-body">' +
      '<span class="card-cat">' + esc(p.cat) + "</span>" +
      '<a href="#/p/' + p.handle + '"><h3 class="card-title">' + esc(p.title) + "</h3></a>" +
      '<div class="card-foot"><span class="price">' + money(p.price) + "</span>" +
      '<button class="add-btn" data-add="' + p.handle + '">Add to cart</button></div>' +
      "</div></div>";
  }

  function renderChrome() {
    document.getElementById("logo").textContent = CFG.name;
    var freeTxt = !CFG.deliveryCharge ? "Free Delivery · "
      : CFG.freeDeliveryAbove > 0 ? "Free delivery on orders above " + money(CFG.freeDeliveryAbove) + " · " : "";
    document.getElementById("topbar").textContent = freeTxt + "Cash on Delivery all over Pakistan";
    document.getElementById("waFloat").href = waLink("Hi " + CFG.name + ", I have a question.");

    var nav = '<div class="catnav-inner"><a href="#/shop" data-cat="">All Products</a>';
    DATA.categories.forEach(function (c) { nav += '<a href="#/shop?cat=' + c.slug + '" data-cat="' + c.slug + '">' + esc(c.name) + "</a>"; });
    document.getElementById("catnav").innerHTML = nav + "</div>";

    var cats = DATA.categories.slice(0, 6).map(function (c) {
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
    var P = DATA.products;
    var heroImgs = [P[0], P[2], P[5]].map(function (p) { return img(p.images[0], p.title); }).join("");
    var cats = DATA.categories.map(function (c) {
      return '<a class="cat-card" href="#/shop?cat=' + c.slug + '">' + img(c.image, c.name) +
        "<b>" + esc(c.name) + "</b><span>" + c.count + " products</span></a>";
    }).join("");

    var sections = DATA.categories.slice(0, 4).map(function (c) {
      var items = P.filter(function (p) { return p.catSlug === c.slug; }).slice(0, 8);
      return '<section class="section"><div class="section-head"><h2>' + esc(c.name) + '</h2><a href="#/shop?cat=' + c.slug +
        '">View all →</a></div><div class="grid">' + items.map(productCard).join("") + "</div></section>";
    }).join("");

    app.innerHTML =
      '<section class="hero"><div><h1>Everything you love, delivered to your door</h1><p>' + esc(CFG.tagline) +
      '. Cash on Delivery available.</p><a class="btn btn-white" href="#/shop">Shop Now →</a></div><div class="hero-imgs">' + heroImgs + "</div></section>" +
      '<div class="trust"><div><b>🚚 Fast Delivery</b>All over Pakistan</div><div><b>💵 Cash on Delivery</b>Pay when you receive</div>' +
      "<div><b>✅ Quality Checked</b>Before dispatch</div><div><b>💬 WhatsApp Support</b>Quick replies</div></div>" +
      '<section class="section"><div class="section-head"><h2>Shop by Category</h2></div><div class="cat-grid">' + cats + "</div></section>" +
      sections;
  }

  function pageShop(params) {
    var cat = params.get("cat") || "";
    var q = (params.get("q") || "").trim();
    var sort = params.get("sort") || "";
    var page = Math.max(1, parseInt(params.get("page"), 10) || 1);

    var list = DATA.products.filter(function (p) { return !cat || p.catSlug === cat; });
    if (q) {
      var words = q.toLowerCase().split(/\s+/);
      list = list.filter(function (p) {
        var t = (p.title + " " + p.cat).toLowerCase();
        return words.every(function (w) { return t.indexOf(w) !== -1; });
      });
    }
    if (sort === "low") list = list.slice().sort(function (a, b) { return a.price - b.price; });
    if (sort === "high") list = list.slice().sort(function (a, b) { return b.price - a.price; });
    if (sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });

    var catObj = DATA.categories.find(function (c) { return c.slug === cat; });
    var heading = q ? 'Search: "' + esc(q) + '"' : catObj ? esc(catObj.name) : "All Products";
    setTitle(q ? "Search: " + q : catObj ? catObj.name : "All Products");

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

    var catOpts = '<option value="">All categories</option>' + DATA.categories.map(function (c) {
      return '<option value="' + c.slug + '"' + (c.slug === cat ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
    var sortOpts = [["", "Featured"], ["low", "Price: Low to High"], ["high", "Price: High to Low"], ["az", "Name: A to Z"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === sort ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");

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
      '<div class="shop-head"><h1>' + heading + "<small>" + list.length + ' products</small></h1><div class="filters">' +
      '<select id="fCat" aria-label="Category">' + catOpts + '</select><select id="fSort" aria-label="Sort">' + sortOpts + "</select></div></div>" +
      (slice.length ? '<div class="grid">' + slice.map(productCard).join("") + "</div>" + pager
        : '<div class="empty">No products found. <a href="#/shop" style="color:var(--brand)">See all products</a></div>');

    document.getElementById("fCat").onchange = function () { location.hash = link({ cat: this.value, page: "" }); };
    document.getElementById("fSort").onchange = function () { location.hash = link({ sort: this.value, page: "" }); };
    document.getElementById("searchInput").value = q;
    highlightNav(cat);
  }

  function pageProduct(handle) {
    var p = byHandle[handle];
    if (!p) { app.innerHTML = '<div class="empty">Product not found. <a href="#/shop" style="color:var(--brand)">Back to shop</a></div>'; return; }
    setTitle(p.title);

    var thumbs = p.images.map(function (src, i) {
      return '<button data-thumb="' + i + '"' + (i === 0 ? ' class="active"' : "") + ' aria-label="Image ' + (i + 1) + '">' + img(src, p.title) + "</button>";
    }).join("");
    var related = DATA.products.filter(function (x) { return x.catSlug === p.catSlug && x.handle !== p.handle; }).slice(0, 8);

    app.innerHTML =
      '<div class="crumbs"><a href="#/">Home</a> / <a href="#/shop?cat=' + p.catSlug + '">' + esc(p.cat) + "</a> / " + esc(p.title) + "</div>" +
      '<div class="pdp"><div><div class="gallery-main">' + img(p.images[0], p.title, "main-img") + "</div>" +
      (p.images.length > 1 ? '<div class="thumbs">' + thumbs + "</div>" : "") + "</div>" +
      '<div><span class="card-cat">' + esc(p.cat) + "</span><h1>" + esc(p.title) + '</h1><div class="price">' + money(p.price) + "</div>" +
      '<div class="stock">● In stock, ready to ship</div>' +
      '<div class="buy-row"><div class="qty"><button data-q="-1" aria-label="Decrease">−</button><input id="qty" type="number" min="1" value="1" aria-label="Quantity"><button data-q="1" aria-label="Increase">+</button></div>' +
      '<button class="btn btn-brand" id="addBtn">Add to Cart</button></div>' +
      '<div class="buy-row"><button class="btn btn-outline" id="buyNow">Buy Now</button><a class="btn btn-wa" id="waOrder" target="_blank" rel="noopener">Order on WhatsApp</a></div>' +
      '<ul class="perks"><li>💵 Cash on Delivery available</li><li>🚚 Delivery in 3–5 working days all over Pakistan</li><li>🔁 Easy exchange if the item arrives damaged</li></ul>' +
      "</div></div>" +
      '<section class="desc"><h2>Product Description</h2><div class="desc-body" id="descBody">Loading...</div></section>' +
      (related.length ? '<section class="section" style="margin-top:36px"><div class="section-head"><h2>You may also like</h2><a href="#/shop?cat=' + p.catSlug +
        '">View all →</a></div><div class="grid">' + related.map(productCard).join("") + "</div></section>" : "");

    var qtyInput = document.getElementById("qty");
    function qty() { return Math.max(1, parseInt(qtyInput.value, 10) || 1); }
    function refreshWa() {
      document.getElementById("waOrder").href = waLink("Hi " + CFG.name + ", I want to order:\n" + p.title + "\nQty: " + qty() +
        "\nPrice: " + money(p.price * qty()) + "\n" + location.href);
    }
    app.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { qtyInput.value = Math.max(1, qty() + parseInt(b.getAttribute("data-q"), 10)); refreshWa(); };
    });
    qtyInput.oninput = refreshWa;
    refreshWa();
    document.getElementById("addBtn").onclick = function () { addToCart(p.handle, qty()); };
    document.getElementById("buyNow").onclick = function () { addToCart(p.handle, qty()); location.hash = "#/cart"; };

    var mainImg = app.querySelector(".main-img");
    app.querySelectorAll("[data-thumb]").forEach(function (b) {
      b.onclick = function () {
        mainImg.onerror = function () { mainImg.onerror = null; mainImg.src = PLACEHOLDER; };
        mainImg.src = p.images[+b.getAttribute("data-thumb")];
        app.querySelectorAll("[data-thumb]").forEach(function (x) { x.classList.toggle("active", x === b); });
      };
    });

    loadDesc(p.id).then(function (html) {
      var el = document.getElementById("descBody");
      if (el) el.innerHTML = html || "<p>No description available.</p>";
    });
  }

  function loadDesc(id) {
    var chunk = Math.floor(id / DATA.descChunk);
    if (!descCache[chunk]) {
      descCache[chunk] = fetch("data/desc/" + chunk + ".json").then(function (r) { return r.json(); });
    }
    // descriptions are sanitised at build time (tools/build_products.py)
    return descCache[chunk].then(function (d) { return d[id]; }).catch(function () { return ""; });
  }

  function pageCart() {
    setTitle("Cart");
    var lines = cartLines();
    if (!lines.length) {
      app.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p>Browse our products and add something you like.</p><a class="btn btn-brand" href="#/shop">Start Shopping</a></div>';
      return;
    }
    var t = totals(lines);
    var items = lines.map(function (l) {
      return '<div class="cart-item"><a href="#/p/' + l.p.handle + '">' + img(l.p.images[0], l.p.title) + "</a>" +
        '<div><a href="#/p/' + l.p.handle + '"><h3>' + esc(l.p.title) + "</h3></a>" +
        '<div class="qty"><button data-cq="-1" data-h="' + l.p.handle + '" aria-label="Decrease">−</button><input value="' + l.q + '" readonly aria-label="Quantity">' +
        '<button data-cq="1" data-h="' + l.p.handle + '" aria-label="Increase">+</button></div> ' +
        '<button class="remove" data-rm="' + l.p.handle + '">Remove</button></div>' +
        '<b class="price">' + money(l.p.price * l.q) + "</b></div>";
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

    app.querySelectorAll("[data-cq]").forEach(function (b) {
      b.onclick = function () {
        var cart = getCart(), h = b.getAttribute("data-h");
        var line = cart.find(function (l) { return l.h === h; });
        if (line) line.q = Math.max(1, line.q + parseInt(b.getAttribute("data-cq"), 10));
        saveCart(cart); pageCart();
      };
    });
    app.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () {
        saveCart(getCart().filter(function (l) { return l.h !== b.getAttribute("data-rm"); })); pageCart();
      };
    });
    document.getElementById("orderForm").onsubmit = function (e) {
      e.preventDefault();
      var f = new FormData(this);
      var msg = "🛒 *New Order: " + CFG.name + "*\n\n" +
        lines.map(function (l, i) { return (i + 1) + ". " + l.p.title + "\n   Qty: " + l.q + " × " + money(l.p.price) + " = " + money(l.p.price * l.q); }).join("\n") +
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

  // add-to-cart buttons on product cards
  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]");
    if (b) addToCart(b.getAttribute("data-add"), 1);
  });
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = document.getElementById("searchInput").value.trim();
    location.hash = "#/shop" + (q ? "?q=" + encodeURIComponent(q) : "");
  });

  fetch("data/products.json")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      DATA = d;
      d.products.forEach(function (p) { byHandle[p.handle] = p; });
      renderChrome();
      updateCartCount();
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(function () {
      app.innerHTML = '<div class="empty">Could not load products. Please refresh the page.</div>';
    });
})();
