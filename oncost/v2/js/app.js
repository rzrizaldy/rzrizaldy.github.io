/**
 * OnCost 2.0 — Indonesia + US trip fuel cost calculator.
 * Leaflet + OpenStreetMap tiles · Nominatim · OSRM (no API keys).
 */

const OSRM = "https://router.project-osrm.org";
const NOMINATIM = "https://nominatim.openstreetmap.org";

const REGION = {
  ID: {
    code: "ID",
    label: "Indonesia",
    countrycodes: "id",
    center: [-6.917464, 107.619123],
    zoom: 12,
    defaultEnd: "Jalan Ganesha, Bandung, Indonesia",
    tank: 50, // liters
    distanceUnit: "km",
    economyUnit: "km/l",
    currency: "IDR",
    priceUnit: "liter",
  },
  US: {
    code: "US",
    label: "United States",
    countrycodes: "us",
    center: [40.4433, -79.9436], // CMU / Pittsburgh
    zoom: 12,
    defaultEnd: "Carnegie Mellon University, Pittsburgh, PA",
    tank: 15, // gallons
    distanceUnit: "mi",
    economyUnit: "mpg",
    currency: "USD",
    priceUnit: "gallon",
  },
};

const el = {
  make: document.getElementById("make"),
  model: document.getElementById("model"),
  fuel: document.getElementById("fuel"),
  economy: document.getElementById("economy"),
  price: document.getElementById("price"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  startSuggest: document.getElementById("start-suggest"),
  endSuggest: document.getElementById("end-suggest"),
  calc: document.getElementById("calc"),
  clear: document.getElementById("clear-route"),
  status: document.getElementById("status"),
  mDistance: document.getElementById("m-distance"),
  mDuration: document.getElementById("m-duration"),
  mCost: document.getElementById("m-cost"),
  mStops: document.getElementById("m-stops"),
  mCostSub: document.getElementById("m-cost-sub"),
  mStopsSub: document.getElementById("m-stops-sub"),
  economyLabel: document.getElementById("economy-label"),
  priceLabel: document.getElementById("price-label"),
  fuelAsOf: document.getElementById("fuel-as-of"),
  carsSource: document.getElementById("cars-source"),
};

let region = "ID";
let carData = null;
let fuelsDoc = null;
let startPoint = null;
let endPoint = null;
let map;
let routeLayer;
let markersLayer;
let routeTimer = null;
let lastRoute = null;

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function setStatus(msg, kind = "") {
  el.status.textContent = msg || "";
  el.status.className = "status" + (kind ? " " + kind : "");
}

function money(n) {
  if (region === "ID") {
    return "Rp" + Math.round(n).toLocaleString("id-ID");
  }
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDistance(meters) {
  if (region === "ID") {
    const km = meters / 1000;
    return (km >= 100 ? km.toFixed(0) : km >= 10 ? km.toFixed(1) : km.toFixed(2)) + " km";
  }
  const mi = meters / 1609.344;
  return (mi >= 100 ? mi.toFixed(0) : mi >= 10 ? mi.toFixed(1) : mi.toFixed(2)) + " mi";
}

function formatDuration(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (region === "ID") {
    if (h > 0) return h + " jam " + m + " mnt";
    return m + " mnt";
  }
  if (h > 0) return h + " hr " + m + " min";
  return m + " min";
}

function initMap() {
  const cfg = REGION[region];
  map = L.map("map", { zoomControl: true }).setView(cfg.center, cfg.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
  routeLayer = L.geoJSON(null, {
    style: { color: "#0c6b58", weight: 5, opacity: 0.92 },
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function resetMapView() {
  const cfg = REGION[region];
  map.setView(cfg.center, cfg.zoom);
}

async function loadRegionData() {
  setStatus(region === "ID" ? "Memuat data…" : "Loading data…", "busy");
  const carsUrl = region === "ID" ? "data/cars-id.json" : "data/cars-us.json";
  const [cars, fuels] = await Promise.all([
    fetchJson(carsUrl),
    fuelsDoc || fetchJson("data/fuels.json"),
  ]);
  carData = cars;
  fuelsDoc = fuels;

  el.make.innerHTML =
    `<option value="">${region === "ID" ? "— Pilih merek —" : "— Choose make —"}</option>` +
    cars.makes.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");
  el.model.innerHTML = `<option value="">${region === "ID" ? "— Pilih merek dulu —" : "— Pick a make first —"}</option>`;
  el.model.disabled = true;
  el.economy.value = "";
  el.price.value = "";

  const pack = fuels[region];
  el.fuel.innerHTML =
    `<option value="">${region === "ID" ? "— Pilih BBM —" : "— Choose fuel —"}</option>` +
    pack.items
      .map(
        (f, i) =>
          `<option value="${i}">${escapeHtml(f.brand + " · " + f.name)}${
            f.grade ? " (" + escapeHtml(f.grade) + ")" : ""
          }</option>`
      )
      .join("");

  el.economyLabel.textContent =
    region === "ID" ? "Konsumsi (km/l)" : "Fuel economy (mpg)";
  el.priceLabel.textContent =
    region === "ID" ? "Harga BBM (Rp/liter)" : "Fuel price (USD/gal)";
  el.fuelAsOf.textContent = fuels.updated + " · " + (fuels.note || "");
  el.carsSource.textContent = cars.source || "";

  el.end.value = REGION[region].defaultEnd;
  startPoint = null;
  endPoint = null;
  clearRouteVisual(false);
  resetMapView();
  setStatus(
    region === "ID"
      ? "Pilih mobil & BBM, lalu isi asal–tujuan."
      : "Pick a car & fuel, then enter origin and destination."
  );
}

function fillModels() {
  const make = el.make.value;
  el.model.innerHTML = `<option value="">${region === "ID" ? "— Pilih model —" : "— Choose model —"}</option>`;
  el.model.disabled = !make;
  if (!make || !carData) return;
  const rows = [...(carData.cars[make] || [])].sort(
    (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))
  );
  rows.forEach(([model, year, kmpl, mpg]) => {
    const opt = document.createElement("option");
    const eco = region === "ID" ? kmpl : mpg;
    opt.value = `${model}||${year}||${kmpl}||${mpg}`;
    opt.textContent =
      region === "ID"
        ? `${make} ${model} (${year}) · ${kmpl} km/l`
        : `${make} ${model} (${year}) · ${mpg} mpg`;
    el.model.appendChild(opt);
  });
}

function onModelChange() {
  const v = el.model.value;
  if (!v) return;
  const [, , kmpl, mpg] = v.split("||");
  el.economy.value = region === "ID" ? kmpl : mpg;
  if (lastRoute) renderCosts(lastRoute);
}

function onFuelChange() {
  const i = el.fuel.value;
  if (i === "") return;
  const item = fuelsDoc[region].items[Number(i)];
  if (!item) return;
  el.price.value = String(item.price);
  if (lastRoute) renderCosts(lastRoute);
}

async function nominatimSearch(query) {
  const url = new URL(NOMINATIM + "/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", REGION[region].countrycodes);
  const rows = await fetchJson(url.toString());
  return (rows || []).map((r) => ({
    label: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
  }));
}

function bindAutocomplete(input, listEl, onPick) {
  let items = [];
  let active = -1;
  let lastQuery = "";

  const run = debounce(async () => {
    const q = input.value.trim();
    if (q.length < 3) {
      listEl.hidden = true;
      listEl.innerHTML = "";
      items = [];
      return;
    }
    if (q === lastQuery) return;
    lastQuery = q;
    try {
      items = await nominatimSearch(q);
      active = -1;
      if (!items.length) {
        listEl.hidden = true;
        listEl.innerHTML = "";
        return;
      }
      listEl.innerHTML = items
        .map(
          (it, i) =>
            `<li><button type="button" data-i="${i}" aria-selected="false">${escapeHtml(
              it.label
            )}</button></li>`
        )
        .join("");
      listEl.hidden = false;
    } catch (err) {
      console.warn(err);
      setStatus(
        region === "ID" ? "Pencarian lokasi gagal." : "Place search failed.",
        "error"
      );
    }
  }, 450);

  input.addEventListener("input", () => {
    onPick(null);
    lastQuery = "";
    run();
  });

  input.addEventListener("keydown", (e) => {
    if (listEl.hidden || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, items.length - 1);
      sync();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      sync();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      listEl.hidden = true;
    }
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-i]");
    if (!btn) return;
    pick(Number(btn.dataset.i));
  });

  document.addEventListener("click", (e) => {
    if (!listEl.contains(e.target) && e.target !== input) listEl.hidden = true;
  });

  function sync() {
    [...listEl.querySelectorAll("button")].forEach((b, i) =>
      b.setAttribute("aria-selected", i === active ? "true" : "false")
    );
  }

  function pick(i) {
    const it = items[i];
    if (!it) return;
    input.value = it.label;
    listEl.hidden = true;
    onPick(it);
    scheduleRoute();
  }
}

async function resolvePoint(text, existing) {
  if (existing && existing.label === text) return existing;
  const q = (text || "").trim();
  if (!q) {
    throw new Error(
      region === "ID" ? "Asal dan tujuan wajib diisi." : "Origin and destination are required."
    );
  }
  const hits = await nominatimSearch(q);
  if (!hits.length) {
    throw new Error(
      (region === "ID" ? "Lokasi tidak ditemukan: " : "Place not found: ") + q
    );
  }
  return hits[0];
}

async function osrmRoute(from, to) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const json = await fetchJson(url);
  if (json.code !== "Ok" || !json.routes?.[0]) {
    throw new Error(
      region === "ID"
        ? "Rute tidak ditemukan."
        : "No driving route found."
    );
  }
  const route = json.routes[0];
  return {
    meters: Number(route.distance || 0),
    seconds: Number(route.duration || 0),
    geometry: route.geometry,
  };
}

function showRoute(from, to, geometry) {
  routeLayer.clearLayers();
  markersLayer.clearLayers();
  if (geometry) {
    routeLayer.addData({ type: "Feature", properties: {}, geometry });
  }
  markersLayer.addLayer(
    L.circleMarker([from.lat, from.lon], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#0c6b58",
      fillOpacity: 1,
    }).bindPopup(region === "ID" ? "Asal" : "Origin")
  );
  markersLayer.addLayer(
    L.circleMarker([to.lat, to.lon], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#e26d00",
      fillOpacity: 1,
    }).bindPopup(region === "ID" ? "Tujuan" : "Destination")
  );
  const b = routeLayer.getBounds();
  if (b.isValid()) map.fitBounds(b.pad(0.12));
  else map.fitBounds(L.latLngBounds([from.lat, from.lon], [to.lat, to.lon]).pad(0.2));
}

function computeCosts(meters) {
  const eco = Number(el.economy.value);
  const price = Number(el.price.value);
  if (!(eco > 0) || !(price > 0)) {
    throw new Error(
      region === "ID"
        ? "Isi konsumsi dan harga BBM dulu."
        : "Enter fuel economy and price first."
    );
  }
  const tank = REGION[region].tank;
  let once;
  let volumeOnce;
  if (region === "ID") {
    const km = meters / 1000;
    volumeOnce = km / eco; // liters
    once = volumeOnce * price;
  } else {
    const miles = meters / 1609.344;
    volumeOnce = miles / eco; // gallons
    once = volumeOnce * price;
  }
  return {
    once,
    roundTrip: once * 2,
    weekly: once * 14,
    fillsOnce: volumeOnce / tank,
    fillsRound: (volumeOnce * 2) / tank,
    fillsWeekly: (volumeOnce * 14) / tank,
  };
}

function renderCosts(route) {
  const c = computeCosts(route.meters);
  el.mDistance.textContent = formatDistance(route.meters);
  el.mDuration.textContent = formatDuration(route.seconds);
  el.mCost.textContent = money(c.once);
  el.mCostSub.textContent =
    (region === "ID" ? "PP " : "RT ") +
    money(c.roundTrip) +
    " · " +
    (region === "ID" ? "Mingguan " : "Weekly ") +
    money(c.weekly);
  el.mStops.textContent = Math.floor(c.fillsOnce) + (region === "ID" ? "×" : "×");
  el.mStopsSub.textContent =
    (region === "ID" ? "PP " : "RT ") +
    Math.floor(c.fillsRound) +
    " · " +
    (region === "ID" ? "Mingguan " : "Weekly ") +
    Math.floor(c.fillsWeekly) +
    (region === "ID"
      ? ` (tangki ${REGION.ID.tank} L)`
      : ` (${REGION.US.tank} gal tank)`);
}

function clearRouteVisual(resetInputs) {
  if (routeLayer) routeLayer.clearLayers();
  if (markersLayer) markersLayer.clearLayers();
  lastRoute = null;
  el.mDistance.textContent = "—";
  el.mDuration.textContent = "—";
  el.mCost.textContent = "—";
  el.mCostSub.textContent = "—";
  el.mStops.textContent = "—";
  el.mStopsSub.textContent = "—";
  if (resetInputs) {
    el.start.value = "";
    el.end.value = REGION[region].defaultEnd;
    startPoint = null;
    endPoint = null;
    resetMapView();
  }
}

async function calculateRoute() {
  el.calc.disabled = true;
  setStatus(region === "ID" ? "Menghitung rute…" : "Calculating route…", "busy");
  try {
    const from = await resolvePoint(el.start.value, startPoint);
    startPoint = from;
    el.start.value = from.label;
    const to = await resolvePoint(el.end.value, endPoint);
    endPoint = to;
    el.end.value = to.label;
    const route = await osrmRoute(from, to);
    lastRoute = route;
    showRoute(from, to, route.geometry);
    renderCosts(route);
    setStatus(
      region === "ID"
        ? "Rute siap. Ongkos dari jarak OSRM × konsumsi × harga."
        : "Route ready. Cost = OSRM distance × economy × price."
    );
  } catch (err) {
    console.error(err);
    clearRouteVisual(false);
    setStatus(err.message || "Error", "error");
  } finally {
    el.calc.disabled = false;
  }
}

function scheduleRoute() {
  clearTimeout(routeTimer);
  routeTimer = setTimeout(() => {
    if (el.start.value.trim() && el.end.value.trim() && el.economy.value && el.price.value) {
      calculateRoute();
    }
  }, 350);
}

async function setRegion(next) {
  if (next === region && carData) return;
  region = next;
  document.querySelectorAll("[data-region]").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.region === region ? "true" : "false");
  });
  document.documentElement.lang = region === "ID" ? "id" : "en";
  try {
    await loadRegionData();
  } catch (err) {
    console.error(err);
    setStatus(region === "ID" ? "Gagal memuat data." : "Failed to load data.", "error");
  }
}

async function boot() {
  initMap();
  document.querySelectorAll("[data-region]").forEach((btn) => {
    btn.addEventListener("click", () => setRegion(btn.dataset.region));
  });
  el.make.addEventListener("change", () => {
    fillModels();
    el.economy.value = "";
  });
  el.model.addEventListener("change", onModelChange);
  el.fuel.addEventListener("change", onFuelChange);
  el.calc.addEventListener("click", calculateRoute);
  el.clear.addEventListener("click", () => {
    clearRouteVisual(true);
    setStatus("");
  });
  el.economy.addEventListener("change", () => lastRoute && renderCosts(lastRoute));
  el.price.addEventListener("change", () => lastRoute && renderCosts(lastRoute));
  bindAutocomplete(el.start, el.startSuggest, (pt) => {
    startPoint = pt;
  });
  bindAutocomplete(el.end, el.endSuggest, (pt) => {
    endPoint = pt;
  });
  await setRegion("ID");
}

boot();
