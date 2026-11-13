/* Available Food page logic.
   It does not use script.js, so nothing on your homepage is affected. */

/* ---- 1. Settings ------------------------------------------------------ */
// Address of your Flask backend. Change it after you host Flask online,
// for example "https://rescue-plate-api.onrender.com".
const API_BASE = "http://127.0.0.1:5000";

const CATEGORIES = ["All", "Vegetarian", "Non-Vegetarian", "Bakery", "Fruits", "Vegetables", "Others"];

// Your three original sample cards. They stay on the page after real donations.
const DEMO = [
  { name: "Fresh meal packs", category: "Vegetarian", emoji: "🥗", location: "Indiranagar, Bengaluru", quantity: "25 packs",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80" },
  { name: "Fresh bakery items", category: "Bakery", emoji: "🥖", location: "Jayanagar, Bengaluru", quantity: "40 items",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80" },
  { name: "Event surplus meals", category: "Others", emoji: "🍱", location: "Whitefield, Bengaluru", quantity: "30 portions",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80" }
].map(d => ({ ...d, demo: true, status: "Example listing" }));

const EMOJI = { "Vegetarian": "🥗", "Non-Vegetarian": "🍗", "Bakery": "🥖", "Fruits": "🍎", "Vegetables": "🥕", "Others": "🍱" };

/* ---- 2. State and page elements --------------------------------------- */
let allItems = [];
let activeCategory = "All";
let searchText = "";

const grid = document.getElementById("foodGrid");
const statusEl = document.getElementById("afStatus");
const emptyEl = document.getElementById("afEmpty");
const chipsEl = document.getElementById("afChips");
const modal = document.getElementById("detailModal");

/* ---- 3. Small helpers -------------------------------------------------- */
// Build elements with textContent so donor-typed text can never run as HTML.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(value) {
  const d = new Date(value);
  return value && !isNaN(d) ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
}

function imageUrl(path) {
  if (!path) return "";
  return /^https?:\/\//.test(path) ? path : API_BASE + "/" + path.replace(/^\/+/, "");
}

// Convert one database record from the Flask API into the shape used by this page.
function fromApi(d) {
  return {
    demo: false,
    id: d.donation_id,
    name: d.food_name,
    category: d.food_category,
    emoji: EMOJI[d.food_category] || "🍽️",
    image: imageUrl(d.image_path),
    location: [d.locality, d.city].filter(Boolean).join(", "),
    quantity: d.quantity,
    servings: d.servings,
    expiry: d.expiry_at,
    status: d.status || "Available",
    description: d.food_description,
    prepared: d.prepared_at,
    storage: d.storage_conditions,
    foodType: d.food_type,
    address: d.pickup_address,
    pincode: d.pincode,
    pickup: d.pickup_time,
    notes: d.pickup_instructions
  };
}

/* ---- 4. Load donations ------------------------------------------------- */
async function loadDonations() {
  let real = [];
  try {
    const res = await fetch(API_BASE + "/api/donations");
    if (!res.ok) throw new Error("Server returned " + res.status);
    const data = await res.json();
    real = (Array.isArray(data) ? data : data.donations || []).map(fromApi);
    statusEl.textContent = real.length
      ? real.length + " live donation" + (real.length > 1 ? "s" : "") + " available. Example listings are shown after them."
      : "No live donations yet. Example listings are shown below.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not reach the donation server, so only example listings are shown.";
  }
  allItems = real.concat(DEMO);
  render();
}

/* ---- 5. Render cards (same markup as your existing food cards) -------- */
function buildCard(item) {
  const card = el("article", "food-card");

  const photo = el("div", "food-photo");
  if (item.image) {
    const img = el("img");
    img.src = item.image;
    img.alt = item.name;
    img.loading = "lazy";
    photo.appendChild(img);
  }
  photo.append(el("span", "food-status", item.status), el("span", "food-emoji", item.emoji));

  const info = el("div", "food-info");
  const meta = el("div", "food-meta");
  meta.append(el("span", "", item.category.toUpperCase()), el("span", "", "↗"));

  const bottom = el("div", "food-bottom");
  const qty = el("span", "", "Quantity: ");
  qty.appendChild(el("strong", "", item.quantity));
  bottom.append(qty, el("span", "food-dot"));

  info.append(meta, el("h3", "", item.name), el("p", "", item.location), bottom);

  // Servings and expiry only exist for real donations
  const extra = [];
  if (item.servings) extra.push("Serves " + item.servings);
  if (item.expiry) extra.push("Best before " + formatDate(item.expiry));
  if (extra.length) info.appendChild(el("p", "af-card-extra", extra.join(" · ")));

  const btn = el("button", "button button-small button-outline", "View Details ↗");
  btn.type = "button";
  btn.addEventListener("click", () => openDetails(item));
  info.appendChild(el("div", "af-card-actions")).appendChild(btn);

  card.append(photo, info);
  return card;
}

function render() {
  const q = searchText.trim().toLowerCase();
  const shown = allItems.filter(i => {
    const matchesCategory = activeCategory === "All" || i.category === activeCategory;
    const haystack = (i.name + " " + i.location + " " + i.category).toLowerCase();
    return matchesCategory && (!q || haystack.includes(q));
  });
  grid.replaceChildren(...shown.map(buildCard));
  emptyEl.hidden = shown.length > 0;
}

/* ---- 6. Category filter buttons --------------------------------------- */
function renderChips() {
  chipsEl.replaceChildren(...CATEGORIES.map(cat => {
    const b = el("button", "button button-small" + (cat === activeCategory ? "" : " button-outline"), cat);
    b.type = "button";
    b.setAttribute("aria-pressed", cat === activeCategory);
    b.addEventListener("click", () => { activeCategory = cat; renderChips(); render(); });
    return b;
  }));
}

document.getElementById("afSearchForm").addEventListener("submit", e => {
  e.preventDefault();
  searchText = document.getElementById("afSearch").value;
  render();
});
document.getElementById("afSearch").addEventListener("input", e => { searchText = e.target.value; render(); });

/* ---- 7. View Details popup -------------------------------------------- */
function openDetails(item) {
  document.getElementById("detailTitle").textContent = item.name;
  document.getElementById("detailDesc").textContent = item.description || "Example listing for layout preview.";

  const img = document.getElementById("detailImg");
  img.hidden = !item.image;
  if (item.image) { img.src = item.image; img.alt = item.name; }

  const rows = [
    ["Category", item.category], ["Status", item.status], ["Quantity", item.quantity],
    ["Serves", item.servings ? item.servings + " people" : ""],
    ["Food type", item.foodType], ["Storage", item.storage],
    ["Prepared", formatDate(item.prepared)], ["Best before", formatDate(item.expiry)],
    ["Pickup area", item.location],
    ["Pickup address", [item.address, item.pincode].filter(Boolean).join(" - ")],
    ["Pickup time", formatDate(item.pickup)], ["Instructions", item.notes]
  ].filter(r => r[1]);

  const list = document.getElementById("detailList");
  list.replaceChildren();
  rows.forEach(([label, value]) => list.append(el("dt", "", label), el("dd", "", value)));

  modal.hidden = false;
  document.getElementById("detailClose").focus();
}

function closeDetails() { modal.hidden = true; }
document.getElementById("detailClose").addEventListener("click", closeDetails);
modal.addEventListener("click", e => { if (e.target === modal) closeDetails(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeDetails(); });

/* ---- 8. Header menu and footer year ----------------------------------- */
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("af-open");
  menuToggle.setAttribute("aria-expanded", open);
});
document.getElementById("year").textContent = new Date().getFullYear();

/* ---- 9. Start ---------------------------------------------------------- */
renderChips();
loadDonations();
