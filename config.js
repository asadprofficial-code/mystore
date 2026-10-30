// ===== Store settings: change these values to customise your store =====
window.STORE_CONFIG = {
  name: "MyStore",
  tagline: "Smart gadgets, beauty & home essentials, delivered across Pakistan",

  // WhatsApp number that receives orders: country code + number, no "+" or spaces
  whatsapp: "923243634761",
  email: "",
  phone: "",
  address: "Kotri, Sindh, Pakistan",

  // Social links: leave "" to hide an icon
  facebook: "",
  instagram: "",
  tiktok: "",

  currency: "Rs.",
  deliveryCharge: 0,         // flat delivery charge per order (0 = free delivery)
  freeDeliveryAbove: 0,      // free delivery above this subtotal (0 = off)
  deliveryDays: "3–5 working days",

  productsPerPage: 24,

  // Messages that rotate in the bar at the top of every page
  announcements: [
    "🚚 Free delivery all over Pakistan",
    "💵 Cash on Delivery: pay when your parcel arrives",
    "💬 Order on WhatsApp in 1 minute",
  ],

  // Home page banner slides: "cat" is the category name the button opens
  heroSlides: [
    { cat: "Home & Living", title: "Make your home beautiful", text: "Decor, kitchen and storage essentials at honest prices." },
    { cat: "Health & Beauty", title: "Glow every day", text: "Skincare, beauty tools and personal care, delivered to your door." },
    { cat: "Electronics & Appliances", title: "Smart gadgets, smart prices", text: "Earbuds, watches, chargers and home appliances." },
    { cat: "Fashion & Apparel", title: "Style for everyone", text: "Bags, jewellery and clothing for women, men and kids." },
  ],
};
