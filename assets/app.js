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
  var RECENT_KEY = "mystore_recent";
  var PRICE_RANGES = [[0, 499, "Under Rs. 500"], [500, 999, "Rs. 500 – 999"], [1000, 1999, "Rs. 1,000 – 1,999"], [2000, 4999, "Rs. 2,000 – 4,999"], [5000, 1e9, "Rs. 5,000 & above"]];
  var PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f4f6"/>' +
    '<path d="M38 40h24v20H38z M42 52l5-5 4 4 3-3 4 4" fill="none" stroke="#c4c8cf" stroke-width="2"/></svg>');

  // ---------- icons ----------
  function svg(d, size, fill) {
    return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="' + (fill ? "currentColor" : "none") +
      '" stroke="' + (fill ? "none" : "currentColor") + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }
  var I = {
    search: function (s) { return svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', s); },
    bag: function (s) { return svg('<path d="M6 7h12l-1 13H7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>', s); },
    cart: function (s) { return svg('<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>', s); },
    menu: function (s) { return svg('<path d="M4 6h16M4 12h16M4 18h16"/>', s); },
    grid: function (s) { return svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>', s); },
    home: function (s) { return svg('<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/>', s); },
    close: function (s) { return svg('<path d="M6 6l12 12M18 6 6 18"/>', s); },
    chevD: function (s) { return svg('<path d="m6 9 6 6 6-6"/>', s); },
    chevL: function (s) { return svg('<path d="m15 6-6 6 6 6"/>', s); },
    chevR: function (s) { return svg('<path d="m9 6 6 6-6 6"/>', s); },
    up: function (s) { return svg('<path d="m6 15 6-6 6 6"/>', s); },
    plus: function (s) { return svg('<path d="M12 5v14M5 12h14"/>', s); },
    truck: function (s) { return svg('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>', s); },
    cash: function (s) { return svg('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>', s); },
    shield: function (s) { return svg('<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>', s); },
    swap: function (s) { return svg('<path d="M4 8h13l-3-3M20 16H7l3 3"/>', s); },
    chat: function (s) { return svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>', s); },
    check: function (s) { return svg('<path d="m5 12 5 5 9-10"/>', s); },
    trash: function (s) { return svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', s); },
    share: function (s) { return svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>', s); },
    filter: function (s) { return svg('<path d="M4 5h16l-6 8v6l-4-2v-4z"/>', s); },
    pin: function (s) { return svg('<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>', s); },
    mail: function (s) { return svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s); },
    phone: function (s) { return svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', s); },
    play: function (s) { return svg('<path d="M8 5v14l11-7z"/>', s, true); },
    wa: function (s) {
      return svg('<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/>', s, true);
    },
    fb: function (s) { return svg('<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8z"/>', s, true); },
    ig: function (s) { return svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>', s); },
    tt: function (s) { return svg('<path d="M14 3v11a4 4 0 1 1-4-4"/><path d="M14 3c.5 3 2.5 5 5 5"/>', s); },
  };

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function money(n) { return CFG.currency + " " + Number(n).toLocaleString("en-PK"); }
  // catalog stores image URLs as "<code>:<path>" (see IMG_PREFIXES in tools/build_products.py)
  function url(u) {
    var m = /^([a-z]):(.*)$/.exec(u || "");
    return m && IMG[m[1]] ? IMG[m[1]] + m[2] : u;
  }
  function isVideo(u) { return /\.(mp4|mov|webm)(\?|$)/i.test(u); }
  function img(src, alt, cls, eager) {
    return '<img src="' + esc(url(src) || PLACEHOLDER) + '" alt="' + esc(alt) + '"' + (eager ? "" : ' loading="lazy"') +
      ' referrerpolicy="no-referrer" class="fade' + (cls ? " " + cls : "") + '" onload="this.classList.add(\'loaded\')"' +
      ' onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\';this.classList.add(\'loaded\')">';
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function setMeta(title, desc) {
    document.title = title ? title + " | " + CFG.name : CFG.name + " | Online Shopping in Pakistan";
    var m = $('meta[name="description"]');
    if (m) m.setAttribute("content", desc || "Shop " + PRODUCTS.length.toLocaleString() + "+ products with free delivery and Cash on Delivery all over Pakistan.");
  }
  function waLink(text) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text); }
  function catBySlug(slug) { return CATS.find(function (c) { return c.slug === slug; }); }
  function catByName(name) { return CATS.find(function (c) { return c.name === name; }); }
  function productLink(p) { return "#/p/" + encodeURIComponent(p.sku); }
  function subName(p) { var c = CATS[p.main]; return p.sub >= 0 ? c.subs[p.sub].name : c.name; }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key)) || [];
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return []; }
  }
  // same shuffle all day, different every day, so the home page feels fresh
  function dailyShuffle(list, salt) {
    var seed = Math.floor(Date.now() / 864e5) * 31 + (salt || 0);
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

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
  function getCart() { return store(CART_KEY).filter(function (l) { return bySku[l.k] && l.p > 0; }); }
  function saveCart(cart) { store(CART_KEY, cart); updateCartCount(); }
  function addToCart(p, option, unitPrice, qty, quiet) {
    var cart = getCart();
    var line = cart.find(function (l) { return l.k === p.sku && l.v === option; });
    if (line) { line.q += qty; line.p = unitPrice; } else cart.push({ k: p.sku, v: option, q: qty, p: unitPrice });
    saveCart(cart);
    $$(".cart-count").forEach(function (c) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); });
    if (!quiet) openCartDrawer();
  }
  function cartLines() { return getCart().map(function (l) { return { p: bySku[l.k], v: l.v, q: l.q, price: l.p }; }); }
  function updateCartCount() {
    var n = cartLines().reduce(function (s, l) { return s + l.q; }, 0);
    $$(".cart-count").forEach(function (c) { c.textContent = n; c.hidden = !n; });
  }
  function totals(lines) {
    var sub = lines.reduce(function (s, l) { return s + l.price * l.q; }, 0);
    var free = !CFG.deliveryCharge || (CFG.freeDeliveryAbove > 0 && sub >= CFG.freeDeliveryAbove);
    var ship = sub === 0 || free ? 0 : CFG.deliveryCharge;
    return { sub: sub, ship: ship, total: sub + ship };
  }
  function addRecent(p) {
    var r = store(RECENT_KEY).filter(function (s) { return s !== p.sku; });
    r.unshift(p.sku);
    store(RECENT_KEY, r.slice(0, 12));
  }
  function recent(except) {
    return store(RECENT_KEY).map(function (s) { return bySku[s]; }).filter(function (p) { return p && p !== except; });
  }

  // ---------- drawers ----------
  function openDrawer(el) {
    closeDrawers();
    el.classList.add("open");
    $("#overlay").hidden = false;
    document.body.classList.add("locked");
  }
  function closeDrawers() {
    $$(".drawer.open, .sidebar.open").forEach(function (d) { d.classList.remove("open"); });
    $("#overlay").hidden = true;
    document.body.classList.remove("locked");
  }
  function openCartDrawer() {
    var lines = cartLines();
    var t = totals(lines);
    var el = $("#cartDrawer");
    el.innerHTML = '<div class="drawer-head"><h3>Your Cart (' + lines.length + ')</h3><button class="icon-btn" data-close aria-label="Close">' + I.close() + "</button></div>" +
      '<div class="drawer-body">' + (lines.length ? lines.map(function (l) {
        return '<a class="mini-item" href="' + productLink(l.p) + '">' + img(l.p.img, l.p.title) + "<div><b>" + esc(l.p.title) + "</b>" +
          (l.v ? '<span class="opt-tag">' + esc(l.v) + "</span> " : "") + '<span class="muted">' + l.q + " × " + money(l.price) + "</span></div></a>";
      }).join("") : '<div class="empty">Your cart is empty.</div>') + "</div>" +
      (lines.length ? '<div class="drawer-foot"><div class="sum-row total" style="margin:0;border:0;padding:0"><span>Subtotal</span><span>' + money(t.sub) + "</span></div>" +
        '<a class="btn btn-brand btn-block" href="#/cart">Checkout · Cash on Delivery</a><button class="btn btn-outline btn-block" data-close>Continue shopping</button></div>' : "");
    openDrawer(el);
  }
  function renderCatDrawer() {
    $("#catDrawer").innerHTML = '<div class="drawer-head"><h3>All Categories</h3><button class="icon-btn" data-close aria-label="Close">' + I.close() + "</button></div>" +
      '<div class="drawer-body"><div class="acc"><a href="#/shop" style="display:block;padding:13px 0;font-weight:600;border-bottom:1px solid var(--line)">All Products</a></div>' +
      CATS.map(function (c) {
        return '<div class="acc"><button>' + esc(c.name) + I.chevD(18) + "</button><ul>" +
          '<li><a href="#/shop?cat=' + c.slug + '"><span>All ' + esc(c.name) + "</span><small>" + c.count.toLocaleString() + "</small></a></li>" +
          c.subs.map(function (s) { return '<li><a href="#/shop?cat=' + c.slug + "&sub=" + s.slug + '"><span>' + esc(s.name) + "</span><small>" + s.count + "</small></a></li>"; }).join("") +
          "</ul></div>";
      }).join("") + "</div>";
  }

  // ---------- chrome (header, footer, nav) ----------
  function logoHtml() {
    // "MyStore" -> My<em>Store</em>: the last capitalised word gets the brand colour
    var m = /^(.+?)([A-Z][a-z]+)$/.exec(CFG.name);
    var name = m ? esc(m[1]) + "<em>" + esc(m[2]) + "</em>" : esc(CFG.name);
    return '<span class="logo-mark">' + I.bag(20) + "</span><span>" + name + "</span>";
  }
  function renderChrome() {
    $("#logo").innerHTML = logoHtml();
    $("#menuBtn").innerHTML = I.menu(24);
    $("#searchBtn").innerHTML = I.search(20);
    $("#searchInput").placeholder = "Search " + (Math.floor(PRODUCTS.length / 1000) * 1000).toLocaleString() + "+ products...";
    $("#helpLink").href = waLink("Hi " + CFG.name + ", I need help with an order.");
    $("#helpLink").innerHTML = I.wa(26) + "<span><small>Need help?</small><b>WhatsApp us</b></span>";
    $("#cartLink").innerHTML = I.cart(26) + '<span class="cart-count" hidden>0</span><span><small>Your</small><b>Cart</b></span>';
    $("#topWa").href = waLink("Hi " + CFG.name);
    $("#topWa").innerHTML = I.wa(14) + " +" + esc(CFG.whatsapp);
    $("#waFloat").href = waLink("Hi " + CFG.name + ", I have a question.");
    $("#waFloat").innerHTML = I.wa(28);
    $("#toTop").innerHTML = I.up(20);

    var msgs = CFG.announcements && CFG.announcements.length ? CFG.announcements : ["Cash on Delivery all over Pakistan"];
    var ai = 0, an = $("#announce");
    an.textContent = msgs[0];
    if (msgs.length > 1) setInterval(function () {
      an.style.opacity = 0;
      setTimeout(function () { ai = (ai + 1) % msgs.length; an.textContent = msgs[ai]; an.style.opacity = 1; }, 300);
    }, 4000);

    $("#catnav").innerHTML = '<button class="all-cats" id="allCats">' + I.grid(18) + "All Categories</button>" +
      '<a href="#/shop" data-cat="">All Products</a>' +
      CATS.map(function (c) { return '<a href="#/shop?cat=' + c.slug + '" data-cat="' + c.slug + '">' + esc(c.name) + "</a>"; }).join("");

    $("#bottomNav").innerHTML =
      '<a href="#/" data-tab="home">' + I.home() + "Home</a>" +
      '<button id="bnCats">' + I.grid() + "Categories</button>" +
      '<button id="bnSearch">' + I.search() + "Search</button>" +
      '<a href="#/cart" data-tab="cart">' + I.cart() + '<span class="cart-count" hidden>0</span>Cart</a>' +
      '<a href="' + waLink("Hi " + CFG.name) + '" target="_blank" rel="noopener">' + I.wa() + "Help</a>";

    var socials = [["facebook", I.fb], ["instagram", I.ig], ["tiktok", I.tt]].filter(function (s) { return CFG[s[0]]; })
      .map(function (s) { return '<a href="' + esc(CFG[s[0]]) + '" target="_blank" rel="noopener" aria-label="' + s[0] + '">' + s[1](18) + "</a>"; }).join("");
    $("#footer").innerHTML = '<div class="container footer-top">' +
      '<div><a href="#/" class="logo">' + logoHtml() + "</a><p>" + esc(CFG.tagline) + ". Order online and pay cash when your parcel arrives.</p>" +
      (socials ? '<div class="socials">' + socials + "</div>" : "") + "</div>" +
      "<div><h4>Shop</h4><ul>" + CATS.slice(0, 6).map(function (c) { return '<li><a href="#/shop?cat=' + c.slug + '">' + esc(c.name) + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h4>Help</h4><ul><li><a href="#/faq">FAQs</a></li><li><a href="#/shipping">Shipping & Delivery</a></li><li><a href="#/returns">Returns & Exchange</a></li>' +
      '<li><a href="#/about">About Us</a></li><li><a href="#/contact">Contact Us</a></li></ul></div>' +
      "<div><h4>Contact</h4><ul>" +
      '<li><a href="' + waLink("Hi " + CFG.name) + '" target="_blank" rel="noopener">WhatsApp: +' + esc(CFG.whatsapp) + "</a></li>" +
      (CFG.phone ? "<li>Phone: " + esc(CFG.phone) + "</li>" : "") +
      (CFG.email ? '<li><a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + "</a></li>" : "") +
      (CFG.address ? "<li>" + esc(CFG.address) + "</li>" : "") +
      '</ul><div class="pay"><span>Cash on Delivery</span><span>Free Delivery</span></div></div></div>' +
      '<div class="container footer-bottom"><span>© ' + new Date().getFullYear() + " " + esc(CFG.name) + '. All rights reserved.</span>' +
      '<span><a href="#/privacy">Privacy Policy</a> · <a href="#/terms">Terms</a></span></div>';

    renderCatDrawer();
    bindGlobal();
  }

  function bindGlobal() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-close]") || t.id === "overlay") { closeDrawers(); return; }
      if (t.closest("#menuBtn, #allCats, #bnCats")) { openDrawer($("#catDrawer")); return; }
      if (t.closest("#bnSearch")) { window.scrollTo(0, 0); $("#searchInput").focus(); return; }
      var acc = t.closest(".acc > button");
      if (acc) { acc.parentNode.classList.toggle("open"); return; }
      var add = t.closest("[data-add]");
      if (add) { var p = bySku[add.getAttribute("data-add")]; if (p) addToCart(p, "", p.price, 1); return; }
      var rb = t.closest(".rail-btn");
      if (rb) { var rail = rb.parentNode.querySelector(".rail"); rail.scrollBy({ left: (rb.classList.contains("next") ? 1 : -1) * rail.clientWidth * .9, behavior: "smooth" }); return; }
      if (t.closest("#toTop")) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (!t.closest("#searchForm")) $("#suggest").hidden = true;
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDrawers(); $("#suggest").hidden = true; } });
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      $("#header").classList.toggle("scrolled", y > 10);
      $("#toTop").classList.toggle("show", y > 800);
    }, { passive: true });

    // search with live suggestions
    var input = $("#searchInput"), box = $("#suggest"), timer, hl = -1;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value.trim();
        hl = -1;
        if (q.length < 2) { box.hidden = true; return; }
        var res = search(PRODUCTS, q);
        box.innerHTML = res.slice(0, 6).map(function (p) {
          return '<a href="' + productLink(p) + '">' + img(p.img, p.title, "", true) + '<span class="s-title">' + esc(p.title) + '</span><span class="s-price">' + money(p.price) + "</span></a>";
        }).join("") + (res.length ? '<a class="s-all" href="#/shop?q=' + encodeURIComponent(q) + '">See all ' + res.length.toLocaleString() + " results</a>"
          : '<a class="s-all" href="#/shop">No match. Browse all products</a>');
        box.hidden = false;
      }, 120);
    });
    input.addEventListener("keydown", function (e) {
      var items = $$("#suggest a");
      if (box.hidden || !items.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
      e.preventDefault();
      hl = (hl + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach(function (a, i) { a.classList.toggle("hl", i === hl); });
    });
    $("#searchForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var items = $$("#suggest a");
      if (!box.hidden && hl >= 0 && items[hl]) { location.hash = items[hl].getAttribute("href"); }
      else {
        var q = input.value.trim();
        location.hash = "#/shop" + (q ? "?q=" + encodeURIComponent(q) : "");
      }
      box.hidden = true;
      input.blur();
    });
  }

  function search(list, q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter(function (p) { return words.every(function (w) { return p.key.indexOf(w) !== -1; }); });
  }

  function highlightNav(cat, tab) {
    $$("#catnav a").forEach(function (a) {
      a.classList.toggle("active", location.hash.indexOf("#/shop") === 0 && a.getAttribute("data-cat") === (cat || ""));
    });
    $$("#bottomNav [data-tab]").forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-tab") === tab); });
  }

  // ---------- shared pieces ----------
  function productCard(p) {
    return '<div class="card">' +
      '<a class="card-img" href="' + productLink(p) + '">' + img(p.img, p.title) + (CFG.deliveryCharge ? "" : '<span class="badge">' + I.truck(13) + "Free Delivery</span>") + "</a>" +
      '<div class="card-body">' +
      '<span class="card-cat">' + esc(subName(p)) + "</span>" +
      '<a href="' + productLink(p) + '"><h3 class="card-title">' + esc(p.title) + "</h3></a>" +
      '<div class="card-foot"><span class="price">' + (p.from ? "<small>From </small>" : "") + money(p.price) + "</span>" +
      (p.options
        ? '<a class="add-btn" href="' + productLink(p) + '" aria-label="Choose options">' + I.chevR(20) + "</a>"
        : '<button class="add-btn" data-add="' + esc(p.sku) + '" aria-label="Add to cart">' + I.plus(20) + "</button>") +
      "</div></div></div>";
  }
  function rail(title, sub, link, items, linkText) {
    if (!items.length) return "";
    return '<section class="section"><div class="section-head"><div><h2>' + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>" +
      (link ? '<a href="' + link + '">' + (linkText || "View all") + I.chevR(16) + "</a>" : "") + "</div>" +
      '<div class="rail-wrap"><button class="rail-btn prev" aria-label="Scroll left">' + I.chevL(20) + '</button><div class="rail">' + items.map(productCard).join("") +
      '</div><button class="rail-btn next" aria-label="Scroll right">' + I.chevR(20) + "</button></div></section>";
  }
  function trustStrip() {
    return '<div class="trust">' +
      [[I.truck(22), CFG.deliveryCharge ? "Nationwide Delivery" : "Free Delivery", "All over Pakistan"], [I.cash(22), "Cash on Delivery", "Pay when you receive"],
        [I.swap(22), "Easy Exchange", "If an item arrives damaged"], [I.chat(22), "WhatsApp Support", "Quick, friendly replies"]]
        .map(function (t) { return '<div><i class="t-ico">' + t[0] + "</i><p><b>" + t[1] + "</b><span>" + t[2] + "</span></p></div>"; }).join("") + "</div>";
  }

  // ---------- pages ----------
  var heroTimer;
  function pageHome() {
    setMeta("");
    var slides = (CFG.heroSlides || []).map(function (s) { return { s: s, c: catByName(s.cat) }; }).filter(function (x) { return x.c; });
    var slidesHtml = slides.map(function (x, n) {
      var ci = CATS.indexOf(x.c);
      var pics = dailyShuffle(PRODUCTS.filter(function (p) { return p.main === ci; }), n).slice(0, 3);
      var H = n === 0 ? "h1" : "h2";
      return '<div class="slide"><div><span class="eyebrow">' + esc(x.c.name) + " · " + x.c.count.toLocaleString() + " products</span><" + H + ">" + esc(x.s.title) + "</" + H + "><p>" + esc(x.s.text) +
        '</p><a class="btn btn-white" href="#/shop?cat=' + x.c.slug + '">Shop now ' + I.chevR(18) + '</a></div><div class="slide-imgs">' +
        pics.map(function (p) { return img(p.img, p.title, "", n === 0); }).join("") + "</div></div>";
    }).join("");

    var bubbles = CATS.filter(function (c) { return c.count >= 5; }).map(function (c) {
      return '<a class="cat-bubble" href="#/shop?cat=' + c.slug + '"><div class="ring">' + img(c.image, c.name) + "</div>" + esc(c.name) + "<small>" + c.count.toLocaleString() + " items</small></a>";
    }).join("");

    var deals = dailyShuffle(PRODUCTS.filter(function (p) { return p.price < 1000; }), 7).slice(0, 12);
    var catRails = CATS.slice(0, 6).map(function (c, ci) {
      var items = dailyShuffle(PRODUCTS.filter(function (p) { return p.main === ci; }), ci + 11).slice(0, 12);
      return rail(c.name, c.count.toLocaleString() + " products · free delivery", "#/shop?cat=" + c.slug, items, "View all");
    });
    var promo = '<div class="promo"><div><h2>Order in 1 minute on WhatsApp</h2><p>Send us a product screenshot or name. We confirm the price and deliver to your door, and you pay cash on delivery.</p></div>' +
      '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + waLink("Hi " + CFG.name + ", I want to place an order.") + '">' + I.wa(20) + "Chat on WhatsApp</a></div>";
    var steps = '<section class="section"><div class="section-head"><div><h2>How to order</h2><p>Simple, safe and no advance payment</p></div></div><div class="steps">' +
      [["Choose", "Browse " + PRODUCTS.length.toLocaleString() + "+ products and add what you like to your cart."],
        ["Checkout", "Enter your name, phone and address. No online payment needed."],
        ["Confirm", "We confirm your order on WhatsApp within a few hours."],
        ["Receive & pay", "Your parcel arrives in " + CFG.deliveryDays + ". Pay cash to the rider."]]
        .map(function (s, i) { return '<div class="step"><div class="n">' + (i + 1) + "</div><b>" + s[0] + "</b><p>" + s[1] + "</p></div>"; }).join("") + "</div></section>";

    app.innerHTML = '<div class="container">' +
      (slides.length ? '<section class="hero" id="hero"><div class="slides" id="slides">' + slidesHtml + '</div><div class="dots" id="dots">' +
        slides.map(function (_, i) { return '<button aria-label="Slide ' + (i + 1) + '" data-dot="' + i + '"></button>'; }).join("") +
        '</div><button class="hero-nav prev" aria-label="Previous">' + I.chevL() + '</button><button class="hero-nav next" aria-label="Next">' + I.chevR() + "</button></section>" : "") +
      trustStrip() +
      '<section class="section"><div class="section-head"><div><h2>Shop by category</h2><p>Find exactly what you need</p></div><a href="#/shop">All products' + I.chevR(16) + '</a></div><div class="cat-row">' + bubbles + "</div></section>" +
      rail("Deals under Rs. 1,000", "Top picks at small prices, refreshed daily", "#/shop?price=0-999&sort=low", deals, "See all deals") +
      catRails.slice(0, 2).join("") + promo + catRails.slice(2).join("") +
      rail("Recently viewed", "", "", recent().slice(0, 12)) +
      steps + "</div>";

    // slider
    clearInterval(heroTimer);
    if (slides.length) {
      var cur = 0, track = $("#slides"), n = slides.length;
      var go = function (i) {
        cur = (i + n) % n;
        track.style.transform = "translateX(" + (-100 * cur) + "%)";
        $$("#dots button").forEach(function (d, j) { d.classList.toggle("active", j === cur); });
      };
      var auto = function () { clearInterval(heroTimer); heroTimer = setInterval(function () { if (document.getElementById("slides")) go(cur + 1); else clearInterval(heroTimer); }, 5500); };
      go(0); auto();
      $$("#dots button").forEach(function (d) { d.onclick = function () { go(+d.getAttribute("data-dot")); auto(); }; });
      $("#hero .prev").onclick = function () { go(cur - 1); auto(); };
      $("#hero .next").onclick = function () { go(cur + 1); auto(); };
      var x0 = null;
      track.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      track.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { go(cur + (dx < 0 ? 1 : -1)); auto(); }
        x0 = null;
      });
    }
    highlightNav(null, "home");
  }

  function pageShop(params) {
    var catSlug = params.get("cat") || "";
    var subSlug = params.get("sub") || "";
    var q = (params.get("q") || "").trim();
    var sort = params.get("sort") || "";
    var priceKey = params.get("price") || "";
    var page = Math.max(1, parseInt(params.get("page"), 10) || 1);

    var cat = catBySlug(catSlug);
    var ci = CATS.indexOf(cat);
    var si = cat ? cat.subs.findIndex(function (s) { return s.slug === subSlug; }) : -1;
    var pr = /^(\d+)-(\d+)$/.exec(priceKey);
    var lo = pr ? +pr[1] : 0, hi = pr ? +pr[2] : 1e9;

    var list = PRODUCTS.filter(function (p) { return (ci < 0 || p.main === ci) && (si < 0 || p.sub === si) && p.price >= lo && p.price <= hi; });
    if (q) list = search(list, q);
    if (sort === "low") list = list.slice().sort(function (a, b) { return a.price - b.price; });
    if (sort === "high") list = list.slice().sort(function (a, b) { return b.price - a.price; });
    if (sort === "az") list = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });

    var heading = q ? 'Results for "' + esc(q) + '"' : si >= 0 ? esc(cat.subs[si].name) : cat ? esc(cat.name) : "All Products";
    setMeta(q ? "Search: " + q : si >= 0 ? cat.subs[si].name : cat ? cat.name : "All Products",
      (cat ? "Shop " + cat.name : "Shop all products") + " online in Pakistan. Free delivery and Cash on Delivery.");

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

    var catList = '<ul class="f-list"><li><a href="' + link({ cat: "", sub: "", page: "" }) + '"' + (!cat ? ' class="active"' : "") + ">All Products<small>" + PRODUCTS.length.toLocaleString() + "</small></a></li>" +
      CATS.map(function (c) {
        var on = c === cat;
        return "<li><a href=\"" + link({ cat: c.slug, sub: "", page: "" }) + '"' + (on && si < 0 ? ' class="active"' : "") + ">" + esc(c.name) + "<small>" + c.count.toLocaleString() + "</small></a>" +
          (on && c.subs.length ? '<ul class="f-list sub">' + c.subs.map(function (s, i) {
            return '<li><a href="' + link({ sub: s.slug, page: "" }) + '"' + (i === si ? ' class="active"' : "") + ">" + esc(s.name) + "<small>" + s.count + "</small></a></li>";
          }).join("") + "</ul>" : "") + "</li>";
      }).join("") + "</ul>";
    var priceList = '<ul class="f-list">' + PRICE_RANGES.map(function (r) {
      var key = r[0] + "-" + (r[1] >= 1e9 ? 999999 : r[1]);
      return '<li><a href="' + link({ price: key === priceKey ? "" : key, page: "" }) + '"' + (key === priceKey ? ' class="active"' : "") + ">" + r[2] + "</a></li>";
    }).join("") + "</ul>";

    var sortOpts = [["", "Recommended"], ["low", "Price: Low to High"], ["high", "Price: High to Low"], ["az", "Name: A to Z"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === sort ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");

    var chips = cat && cat.subs.length ? '<div class="chips"><a href="' + link({ sub: "", page: "" }) + '"' + (si < 0 ? ' class="active"' : "") + ">All</a>" +
      cat.subs.map(function (s, i) { return '<a href="' + link({ sub: s.slug, page: "" }) + '"' + (i === si ? ' class="active"' : "") + ">" + esc(s.name) + "</a>"; }).join("") + "</div>" : "";

    var active = [];
    if (q) active.push(['"' + esc(q) + '"', link({ q: "", page: "" })]);
    if (pr) { var r = PRICE_RANGES.find(function (x) { return x[0] === lo; }); active.push([r ? r[2] : esc(priceKey), link({ price: "", page: "" })]); }

    var pager = "";
    if (pages > 1) {
      var nums = [];
      for (var i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== "…") nums.push("…");
      }
      pager = '<nav class="pager">' + (page > 1 ? '<a href="' + link({ page: page - 1 }) + '" aria-label="Previous page">' + I.chevL(18) + "</a>" : "") +
        nums.map(function (n) {
          return n === "…" ? "<span>…</span>" : '<a href="' + link({ page: n > 1 ? n : "" }) + '"' + (n === page ? ' class="active"' : "") + ">" + n + "</a>";
        }).join("") +
        (page < pages ? '<a href="' + link({ page: page + 1 }) + '" aria-label="Next page">' + I.chevR(18) + "</a>" : "") + "</nav>";
    }

    app.innerHTML = '<div class="container"><div class="crumbs"><a href="#/">Home</a><span>/</span>' +
      (cat ? '<a href="#/shop">Shop</a><span>/</span>' + (si >= 0 ? '<a href="' + link({ sub: "", page: "" }) + '">' + esc(cat.name) + "</a><span>/</span>" + esc(cat.subs[si].name) : esc(cat.name)) : "Shop") + "</div>" +
      '<div class="shop-layout"><aside class="sidebar" id="sidebar"><div class="group"><h4>Categories</h4>' + catList + '</div><div class="group"><h4>Price</h4>' + priceList + "</div></aside>" +
      '<div><div class="shop-head"><div><h1>' + heading + '</h1><span class="count">' + list.length.toLocaleString() + " products</span></div>" +
      '<div class="toolbar"><button class="btn btn-outline filter-btn" id="filterBtn" style="height:42px;padding:0 14px">' + I.filter(18) + 'Filter</button>' +
      '<select class="select" id="fSort" aria-label="Sort">' + sortOpts + "</select></div></div>" + chips +
      (active.length ? '<div class="active-filters">' + active.map(function (a) { return '<a href="' + a[1] + '">' + a[0] + I.close(14) + "</a>"; }).join("") + "</div>" : "") +
      (slice.length ? '<div class="grid">' + slice.map(productCard).join("") + "</div>" + pager
        : '<div class="empty"><h2>No products found</h2><p>Try a different word or remove a filter.</p><a class="btn btn-brand" href="#/shop">See all products</a></div>') +
      "</div></div></div>";

    $("#fSort").onchange = function () { location.hash = link({ sort: this.value, page: "" }); };
    $("#filterBtn").onclick = function () { openDrawer($("#sidebar")); };
    $("#searchInput").value = q;
    highlightNav(catSlug, "");
  }

  function pageProduct(sku) {
    var p = bySku[sku];
    if (!p) {
      app.innerHTML = '<div class="container"><div class="empty"><h2>Product not found</h2><p>It may have been removed or sold out.</p><a class="btn btn-brand" href="#/shop">Back to shop</a></div></div>';
      return;
    }
    setMeta(p.title, p.title + " for " + money(p.price) + ". Free delivery and Cash on Delivery all over Pakistan.");
    addRecent(p);
    var cat = CATS[p.main];
    var sub = p.sub >= 0 ? cat.subs[p.sub] : null;
    var related = dailyShuffle(PRODUCTS.filter(function (x) { return x.main === p.main && x.sub === p.sub && x !== p; }), p.i).slice(0, 12);
    var priceHtml = (p.from ? "<small>From </small>" : "") + money(p.price);

    app.innerHTML = '<div class="container">' +
      '<div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/shop?cat=' + cat.slug + '">' + esc(cat.name) + "</a>" +
      (sub ? '<span>/</span><a href="#/shop?cat=' + cat.slug + "&sub=" + sub.slug + '">' + esc(sub.name) + "</a>" : "") + "</div>" +
      '<div class="pdp"><div><div class="gallery"><div class="gallery-main" id="gMain">' + img(p.img, p.title, "", true) + '</div><div class="thumbs" id="thumbs"></div></div></div>' +
      '<div><span class="card-cat">' + esc(sub ? sub.name : cat.name) + "</span><h1>" + esc(p.title) + '</h1><div class="price" id="pPrice">' + priceHtml + "</div>" +
      '<div class="pdp-meta"><span class="stock">In stock</span><span>Code: ' + esc(p.sku) + "</span></div>" +
      '<div id="options"></div>' +
      '<div class="buy-row main-buy"><div class="qty"><button data-q="-1" aria-label="Decrease">−</button><input id="qty" type="number" min="1" value="1" aria-label="Quantity"><button data-q="1" aria-label="Increase">+</button></div>' +
      '<button class="btn btn-brand" id="addBtn">' + I.cart(20) + "Add to Cart</button></div>" +
      '<div class="buy-row main-buy"><button class="btn btn-dark" id="buyNow">Buy Now · Cash on Delivery</button></div>' +
      '<div class="buy-row"><a class="btn btn-wa" id="waOrder" target="_blank" rel="noopener">' + I.wa(20) + "Order on WhatsApp</a></div>" +
      '<button class="share" id="shareBtn">' + I.share(16) + "Share this product</button>" +
      '<div class="delivery-note">' + I.truck(20) + "<span><b>" + (CFG.deliveryCharge ? "Delivery" : "Free delivery") + "</b> in " + esc(CFG.deliveryDays) + " anywhere in Pakistan</span></div>" +
      '<div class="assure"><div>' + I.cash(22) + "<b>Cash on Delivery</b>Pay at your door</div><div>" + I.swap(22) + "<b>Easy Exchange</b>If it arrives damaged</div><div>" +
      I.shield(22) + "<b>Checked</b>Before dispatch</div></div>" +
      "</div></div>" +
      '<section class="desc"><h2>Product details</h2><div class="desc-body" id="descBody"><div class="sk" style="height:120px"></div></div></section>' +
      '<div style="margin-top:40px">' + rail("You may also like", "", "#/shop?cat=" + cat.slug + (sub ? "&sub=" + sub.slug : ""), related) +
      rail("Recently viewed", "", "", recent(p).slice(0, 12)) + "</div></div>" +
      '<div class="sticky-buy" id="stickyBuy"><div class="price" id="sPrice">' + priceHtml + '</div><button class="btn btn-brand" id="sAdd">Add to Cart</button><button class="btn btn-dark" id="sBuy">Buy Now</button></div>';
    document.body.classList.add("has-sticky");

    var state = { option: "", price: p.price, variants: [] };
    var qtyInput = $("#qty");
    function qty() { return Math.max(1, parseInt(qtyInput.value, 10) || 1); }
    function refresh() {
      var html = p.options && !state.option && p.from ? priceHtml : money(state.price);
      $("#pPrice").innerHTML = html;
      $("#sPrice").innerHTML = html;
      $("#waOrder").href = waLink("Hi " + CFG.name + ", I want to order:\n" + p.title + (state.option ? "\nOption: " + state.option : "") +
        "\nCode: " + p.sku + "\nQty: " + qty() + "\nPrice: " + money(state.price * qty()) + "\n" + location.href);
    }
    function ready() {
      if (state.variants.length && !state.option) {
        toast("Please select an option first");
        var o = $(".options");
        if (o) { o.classList.remove("shake"); void o.offsetWidth; o.classList.add("shake"); o.scrollIntoView({ block: "center", behavior: "smooth" }); }
        return false;
      }
      return true;
    }
    function add() { if (ready()) addToCart(p, state.option, state.price, qty()); }
    function buy() { if (ready()) { addToCart(p, state.option, state.price, qty(), true); location.hash = "#/cart"; } }
    $$("[data-q]").forEach(function (b) {
      b.onclick = function () { qtyInput.value = Math.max(1, qty() + parseInt(b.getAttribute("data-q"), 10)); refresh(); };
    });
    qtyInput.oninput = refresh;
    $("#addBtn").onclick = add;
    $("#sAdd").onclick = add;
    $("#buyNow").onclick = buy;
    $("#sBuy").onclick = buy;
    $("#shareBtn").onclick = function () {
      var data = { title: p.title, text: p.title + " - " + money(p.price), url: location.href };
      if (navigator.share) navigator.share(data).catch(function () {});
      else window.open("https://wa.me/?text=" + encodeURIComponent(data.text + "\n" + data.url), "_blank");
    };
    refresh();

    // hover zoom on desktop
    var main = $("#gMain");
    main.addEventListener("mousemove", function (e) {
      var im = main.querySelector("img");
      if (!im || window.matchMedia("(hover: none)").matches) return;
      var r = main.getBoundingClientRect();
      im.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + "% " + ((e.clientY - r.top) / r.height * 100) + "%";
      main.classList.add("zoom");
    });
    main.addEventListener("mouseleave", function () { main.classList.remove("zoom"); });

    loadDetail(p).then(function (d) {
      if (bySku[sku] !== p || !document.getElementById("descBody")) return;   // user navigated away
      var body = $("#descBody");
      body.innerHTML = d.d || "<p>No description available. Message us on WhatsApp for details.</p>";
      if (body.scrollHeight > 420) {
        body.classList.add("clamped");
        body.insertAdjacentHTML("afterend", '<button class="more-btn" id="moreBtn">Read more</button>');
        $("#moreBtn").onclick = function () { body.classList.remove("clamped"); this.remove(); };
      }

      var media = (d.i || []).map(url);
      function show(i) {
        var m = media[i];
        main.innerHTML = isVideo(m) ? '<video src="' + esc(m) + '" controls playsinline preload="metadata"></video>' : img(m, p.title, "", true);
        $$("#thumbs button").forEach(function (b, j) { b.classList.toggle("active", j === i); });
      }
      if (media.length > 1) {
        $("#thumbs").innerHTML = media.map(function (m, i) {
          return '<button data-thumb="' + i + '" aria-label="Media ' + (i + 1) + '">' + (isVideo(m) ? '<span class="play">' + I.play(22) + "</span>" : img(m, p.title)) + "</button>";
        }).join("");
        $$("#thumbs button").forEach(function (b) { b.onclick = function () { show(+b.getAttribute("data-thumb")); }; });
        show(0);
      }

      state.variants = d.v || [];
      if (state.variants.length) {
        $("#options").innerHTML = '<div class="opt-label">Select option: <span id="optName"></span></div><div class="options">' +
          state.variants.map(function (v, i) { return '<button data-opt="' + i + '">' + esc(v[0]) + "</button>"; }).join("") + "</div>";
        $$("[data-opt]").forEach(function (b) {
          b.onclick = function () {
            var v = state.variants[+b.getAttribute("data-opt")];
            state.option = v[0];
            state.price = v[1];
            $("#optName").textContent = v[0];
            $$("[data-opt]").forEach(function (x) { x.classList.toggle("active", x === b); });
            refresh();
          };
        });
        if (state.variants.length === 1) $("[data-opt]").click();
      }
    });
    highlightNav(null, "");
  }

  var CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Hyderabad", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Sargodha", "Bahawalpur", "Sukkur", "Larkana", "Jamshoro", "Kotri", "Nawabshah", "Mirpur Khas", "Abbottabad", "Mardan", "Sahiwal", "Okara",
    "Rahim Yar Khan", "Dera Ghazi Khan", "Gujrat", "Jhelum", "Sheikhupura", "Kasur", "Muzaffarabad", "Gilgit"];

  function pageCart() {
    setMeta("Cart & Checkout");
    var lines = cartLines();
    if (!lines.length) {
      app.innerHTML = '<div class="container"><div class="thanks"><div class="big">' + I.cart(34) + '</div><h2>Your cart is empty</h2><p class="muted">Browse ' +
        PRODUCTS.length.toLocaleString() + '+ products and add something you like.</p><a class="btn btn-brand" href="#/shop">Start shopping</a></div>' +
        '<div style="margin-top:40px">' + rail("Recently viewed", "", "", recent().slice(0, 12)) + "</div></div>";
      highlightNav(null, "cart");
      return;
    }
    var t = totals(lines);
    var items = lines.map(function (l, i) {
      return '<div class="cart-item"><a href="' + productLink(l.p) + '">' + img(l.p.img, l.p.title) + "</a>" +
        '<div><a href="' + productLink(l.p) + '"><h3>' + esc(l.p.title) + "</h3></a>" +
        (l.v ? '<span class="opt-tag">' + esc(l.v) + "</span> " : "") + '<span class="note" style="display:inline">' + money(l.price) + " each</span>" +
        '<div class="row"><div class="qty"><button data-cq="-1" data-i="' + i + '" aria-label="Decrease">−</button><input value="' + l.q + '" readonly aria-label="Quantity">' +
        '<button data-cq="1" data-i="' + i + '" aria-label="Increase">+</button></div>' +
        '<button class="remove" data-rm="' + i + '">' + I.trash(15) + "Remove</button></div></div>" +
        '<b class="price">' + money(l.price * l.q) + "</b></div>";
    }).join("");

    app.innerHTML = '<div class="container"><div class="steps-bar"><span class="on">1. Cart</span><i></i><span class="on">2. Delivery details</span><i></i><span>3. Confirm on WhatsApp</span></div>' +
      '<div class="cart-layout"><div class="panel"><h2>Your Cart <span class="muted" style="font-size:15px;font-weight:500">(' + lines.length + (lines.length === 1 ? " item" : " items") + ")</span></h2>" + items + "</div>" +
      '<div class="panel"><h3>Order Summary</h3>' +
      '<div class="sum-row"><span>Subtotal</span><span>' + money(t.sub) + "</span></div>" +
      '<div class="sum-row"><span>Delivery</span>' + (t.ship ? "<span>" + money(t.ship) + "</span>" : '<span class="free">FREE</span>') + "</div>" +
      '<div class="sum-row"><span>Payment</span><span>Cash on Delivery</span></div>' +
      '<div class="sum-row total"><span>Total</span><span>' + money(t.total) + "</span></div>" +
      '<form class="form" id="orderForm"><h3 style="margin:10px 0 0">Delivery details</h3>' +
      '<label>Full name *<input name="name" required autocomplete="name" placeholder="e.g. Ali Khan"></label>' +
      '<div class="two"><label>Phone number *<input name="phone" required inputmode="tel" pattern="[0-9+\\-\\s]{10,15}" autocomplete="tel" placeholder="03xx xxxxxxx"></label>' +
      '<label>City *<input name="city" required list="cities" autocomplete="address-level2" placeholder="e.g. Karachi"></label></div>' +
      '<datalist id="cities">' + CITIES.map(function (c) { return '<option value="' + c + '">'; }).join("") + "</datalist>" +
      '<label>Complete address *<textarea name="address" required autocomplete="street-address" placeholder="House no., street, area, nearby landmark"></textarea></label>' +
      '<label>Order notes (optional)<textarea name="notes" placeholder="Anything we should know?"></textarea></label>' +
      '<button class="btn btn-wa btn-block" type="submit">' + I.wa(20) + "Place Order · " + money(t.total) + "</button>" +
      '<p class="secure">' + I.shield(16) + "No advance payment. Pay cash when you receive.</p></form></div></div></div>";

    function update(fn) { var cart = getCart(); fn(cart); saveCart(cart); pageCart(); }
    $$("[data-cq]").forEach(function (b) {
      b.onclick = function () {
        update(function (cart) { var l = cart[+b.getAttribute("data-i")]; if (l) l.q = Math.max(1, l.q + parseInt(b.getAttribute("data-cq"), 10)); });
      };
    });
    $$("[data-rm]").forEach(function (b) { b.onclick = function () { update(function (cart) { cart.splice(+b.getAttribute("data-rm"), 1); }); }; });
    $("#orderForm").onsubmit = function (e) {
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
      window.scrollTo(0, 0);
      app.innerHTML = '<div class="container"><div class="thanks"><div class="big">' + I.check(36) + "</div><h2>Thank you, " + esc(f.get("name")) + "!</h2>" +
        '<p class="muted">Your order has opened in WhatsApp. Please press <b>Send</b> so we receive it. We will confirm your order shortly.</p>' +
        '<p class="muted">WhatsApp didn\'t open? <a class="link" href="' + esc(waLink(msg)) + '" target="_blank" rel="noopener">Tap here to send your order</a></p>' +
        '<a class="btn btn-brand" href="#/shop">Continue shopping</a></div></div>';
    };
    highlightNav(null, "cart");
  }

  // ---------- info pages ----------
  function infoPages() {
    var n = esc(CFG.name), days = esc(CFG.deliveryDays), wa = "+" + esc(CFG.whatsapp);
    var waA = '<a class="link" href="' + waLink("Hi " + CFG.name) + '" target="_blank" rel="noopener">WhatsApp (' + wa + ")</a>";
    return {
      about: ["About Us", "<p>" + n + " is an online store that brings " + PRODUCTS.length.toLocaleString() + "+ everyday products to customers across Pakistan, " +
        "from home décor and kitchen essentials to beauty, gadgets and fashion.</p><h2>Why shop with us</h2><ul>" +
        "<li><b>Free delivery</b> to every city in Pakistan.</li><li><b>Cash on Delivery:</b> no advance payment, pay when your parcel arrives.</li>" +
        "<li><b>Real support:</b> talk to a real person on " + waA + ".</li><li><b>Fair prices</b> on thousands of products.</li></ul>"],
      contact: ["Contact Us", "<p>Have a question about a product or an order? We are happy to help.</p><div class=\"contact-grid\">" +
        '<a href="' + waLink("Hi " + CFG.name) + '" target="_blank" rel="noopener">' + I.wa(26) + "<span><b>WhatsApp</b>" + wa + "</span></a>" +
        (CFG.phone ? "<div>" + I.phone(24) + "<span><b>Phone</b>" + esc(CFG.phone) + "</span></div>" : "") +
        (CFG.email ? '<a href="mailto:' + esc(CFG.email) + '">' + I.mail(24) + "<span><b>Email</b>" + esc(CFG.email) + "</span></a>" : "") +
        (CFG.address ? "<div>" + I.pin(24) + "<span><b>Location</b>" + esc(CFG.address) + "</span></div>" : "") + "</div>"],
      faq: ["Frequently Asked Questions", '<div class="faq">' + [
        ["How do I place an order?", "Add products to your cart, open the cart, fill in your name, phone and address and press <b>Place Order</b>. Your order opens in WhatsApp. Press Send and we will confirm it."],
        ["Do I need to pay in advance?", "No. All orders are Cash on Delivery. You pay the rider when your parcel arrives."],
        ["How much is delivery?", CFG.deliveryCharge ? "Delivery is " + money(CFG.deliveryCharge) + " per order." : "Delivery is <b>free</b> on every order, all over Pakistan."],
        ["How long does delivery take?", "Orders usually arrive in " + days + " after confirmation. Remote areas can take a little longer."],
        ["Can I exchange a product?", "Yes. If an item arrives damaged or is not what you ordered, contact us within 48 hours of delivery. See our <a class=\"link\" href=\"#/returns\">Returns & Exchange</a> page."],
        ["How can I track my order?", "Message us on " + waA + " with your name and phone number and we will share your parcel status."],
      ].map(function (f) { return "<details><summary>" + f[0] + "</summary><p>" + f[1] + "</p></details>"; }).join("") + "</div>"],
      shipping: ["Shipping & Delivery", "<h2>Delivery charges</h2><p>" + (CFG.deliveryCharge ? "Delivery is " + money(CFG.deliveryCharge) + " per order." : "Delivery is free on all orders, anywhere in Pakistan.") + "</p>" +
        "<h2>Delivery time</h2><p>Orders are delivered in " + days + " after we confirm them on WhatsApp. Orders placed on Sundays or public holidays are processed on the next working day.</p>" +
        "<h2>Order confirmation</h2><p>We confirm every order by WhatsApp or phone before dispatch. Please keep your phone on so our team and the rider can reach you.</p>" +
        "<h2>Payment</h2><p>Cash on Delivery only. Please check the parcel before paying the rider.</p>"],
      returns: ["Returns & Exchange", "<p>We want you to be happy with your order.</p><h2>When can I exchange?</h2><ul><li>The item arrived damaged or broken.</li><li>You received a different item from what you ordered.</li></ul>" +
        "<h2>How to request an exchange</h2><ol><li>Contact us on " + waA + " within <b>48 hours</b> of delivery.</li><li>Send your order details and clear photos or an unboxing video of the item.</li>" +
        "<li>Our team will review it and arrange a replacement.</li></ol><h2>Not eligible</h2><ul><li>Items that were used, washed or damaged after delivery.</li><li>Change-of-mind requests on hygiene or personal-care products.</li></ul>"],
      privacy: ["Privacy Policy", "<p>We respect your privacy. This page explains what information we collect and how we use it.</p><h2>What we collect</h2><p>Only what you enter at checkout: your name, phone number, city and address.</p>" +
        "<h2>How we use it</h2><p>Only to confirm, deliver and support your order. We never sell your information.</p><h2>Your cart</h2><p>Your cart and recently viewed products are saved only in your own browser.</p>" +
        "<h2>Questions</h2><p>Contact us on " + waA + ".</p>"],
      terms: ["Terms & Conditions", "<p>By placing an order on " + n + " you agree to these terms.</p><h2>Orders</h2><p>All orders are confirmed by WhatsApp or phone before dispatch. We may cancel an order we cannot confirm or deliver.</p>" +
        "<h2>Prices</h2><p>Prices are in Pakistani Rupees and can change without notice. The price confirmed with you is the price you pay.</p><h2>Product images</h2><p>Colours can look slightly different on different screens.</p>" +
        "<h2>Exchanges</h2><p>See our <a class=\"link\" href=\"#/returns\">Returns & Exchange</a> policy.</p>"],
    };
  }
  function pageInfo(key) {
    var pg = infoPages()[key];
    setMeta(pg[0]);
    app.innerHTML = '<div class="container"><div class="crumbs"><a href="#/">Home</a><span>/</span>' + pg[0] + '</div><article class="page"><h1>' + pg[0] + "</h1>" + pg[1] + "</article></div>";
    highlightNav(null, "");
  }

  // ---------- router ----------
  function route() {
    var hash = location.hash.slice(1) || "/";
    var qi = hash.indexOf("?");
    var path = qi === -1 ? hash : hash.slice(0, qi);
    var params = new URLSearchParams(qi === -1 ? "" : hash.slice(qi + 1));

    closeDrawers();
    $("#suggest").hidden = true;
    document.body.classList.remove("has-sticky");
    if (path.indexOf("/p/") === 0) pageProduct(decodeURIComponent(path.slice(3)));
    else if (path === "/shop") pageShop(params);
    else if (path === "/cart") pageCart();
    else if (infoPages()[path.slice(1)]) pageInfo(path.slice(1));
    else pageHome();

    if (path !== "/shop") $("#searchInput").value = "";
    window.scrollTo(0, 0);
  }

  // skeleton while the catalog loads
  $("#boot").innerHTML = new Array(8).join('<div class="sk sk-card"></div>');

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
        p.key = (p.title + " " + c.name + " " + (p.sub >= 0 ? c.subs[p.sub].name : "") + " " + p.sku).toLowerCase();
        bySku[p.sku] = p;
        return p;
      });
      renderChrome();
      updateCartCount();
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(function () {
      app.innerHTML = '<div class="container"><div class="empty"><h2>Could not load products</h2><p>Please check your internet and refresh the page.</p></div></div>';
    });
})();
