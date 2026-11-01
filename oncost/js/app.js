/**
 * OnCost — static rewrite of the 2016 PHP/Google Maps trip-cost calculator.
 * Maps: Leaflet + OpenStreetMap tiles. Geocode: Nominatim. Routing: OSRM public demo.
 */

const TANK_LITERS = 50;
const BANDUNG = [-6.917464, 107.619123];
const DEFAULT_END = "Jalan Ganesha, Bandung, Indonesia";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://router.project-osrm.org";

const el = {
  make: document.getElementById("make"),
  model: document.getElementById("model"),
  fuel: document.getElementById("fuel"),
  konsumsi: document.getElementById("bbm"),
  harga: document.getElementById("harga"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  startSuggest: document.getElementById("start-suggest"),
  endSuggest: document.getElementById("end-suggest"),
  calc: document.getElementById("calc"),
  clear: document.getElementById("clear-route"),
  status: document.getElementById("status"),
  distance: document.getElementById("directions-panel1"),
  duration: document.getElementById("directions-panel2"),
  cost: document.getElementById("directions-panel3"),
  stops: document.getElementById("directions-panel4"),
};

/** @type {{ makes: string[], cars: Record<string, [string, number, number][]> } | null} */
let carData = null;
/** @type {{ brand: string, name: string, price: number, fuelType: string }[]} */
let fuels = [];
/** @type {{ lat: number, lon: number, label: string } | null} */
let startPoint = null;
/** @type {{ lat: number, lon: number, label: string } | null} */
let endPoint = null;

let map;
let routeLayer;
let markersLayer;
let routeTimer = null;

function rupiah(n) {
  return "Rp." + Math.max(0, Math.round(n)).toLocaleString("id-ID");
}

function formatKm(meters) {
  const km = meters / 1000;
  if (km >= 100) return km.toFixed(0) + " km";
  if (km >= 10) return km.toFixed(1) + " km";
  return km.toFixed(2) + " km";
}

function formatDuration(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + " jam " + m + " mnt";
  if (m > 0) return m + " mnt";
  return s + " dtk";
}

function setStatus(msg, kind = "") {
  el.status.textContent = msg || "";
  el.status.className = "status" + (kind ? " " + kind : "");
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Accept: "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function loadData() {
  const [cars, fuelList] = await Promise.all([
    fetchJson("data/cars.json"),
    fetchJson("data/fuels.json"),
  ]);
  carData = cars;
  fuels = fuelList;

  el.make.innerHTML =
    '<option value="">— Pilih merek —</option>' +
    cars.makes.map((m) => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join("");

  el.fuel.innerHTML =
    '<option value="">— Pilih jenis BBM —</option>' +
    fuels
      .map(
        (f, i) =>
          `<option value="${i}">${escapeHtml(f.brand + " " + f.name)} | Rp.${f.price.toLocaleString("id-ID")}</option>`
      )
      .join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function fillModels() {
  const make = el.make.value;
  el.model.innerHTML = '<option value="">— Pilih model —</option>';
  el.model.disabled = !make;
  if (!make || !carData) return;

  const rows = carData.cars[make] || [];
  // Prefer newest years first, then model name
  const sorted = [...rows].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  el.model.innerHTML = '<option value="">— Pilih model —</option>';
  sorted.forEach(([model, year, kmpl]) => {
    const opt = document.createElement("option");
    opt.value = `${model}||${year}||${kmpl}`;
    opt.textContent = `${make} ${model} (${year}) | ${kmpl} km/l`;
    el.model.appendChild(opt);
  });
  el.model.disabled = false;
}

function onModelChange() {
  const v = el.model.value;
  if (!v) return;
  const parts = v.split("||");
  const kmpl = Number(parts[2]);
  if (Number.isFinite(kmpl) && kmpl > 0) {
    el.konsumsi.value = String(kmpl);
  }
}

function onFuelChange() {
  const i = el.fuel.value;
  if (i === "") return;
  const f = fuels[Number(i)];
  if (f) el.harga.value = String(f.price);
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(BANDUNG, 12);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  routeLayer = L.geoJSON(null, {
    style: {
      color: "#ffb81c",
      weight: 5,
      opacity: 0.92,
    },
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

async function nominatimSearch(query) {
  const url = new URL(NOMINATIM + "/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  // Prefer Indonesia but allow worldwide (trips may cross borders)
  url.searchParams.set("countrycodes", "id");

  const rows = await fetchJson(url.toString(), {
    headers: { "Accept-Language": "id,en" },
  });
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
            `<li><button type="button" role="option" data-i="${i}" aria-selected="false">${escapeHtml(it.label)}</button></li>`
        )
        .join("");
      listEl.hidden = false;
    } catch (err) {
      console.warn(err);
      setStatus("Pencarian lokasi gagal. Coba lagi sebentar.", "error");
    }
  }, 450);

  input.addEventListener("input", () => {
    onPick(null);
    run();
  });

  input.addEventListener("keydown", (e) => {
    if (listEl.hidden || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, items.length - 1);
      syncActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
      syncActive();
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
    if (!listEl.contains(e.target) && e.target !== input) {
      listEl.hidden = true;
    }
  });

  function syncActive() {
    [...listEl.querySelectorAll("button")].forEach((b, i) => {
      b.setAttribute("aria-selected", i === active ? "true" : "false");
    });
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
  if (!q) throw new Error("Asal dan tujuan wajib diisi.");
  const hits = await nominatimSearch(q);
  if (!hits.length) throw new Error('Lokasi tidak ditemukan: "' + q + '"');
  return hits[0];
}

async function osrmRoute(from, to) {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const json = await fetchJson(url);
  if (json.code !== "Ok" || !json.routes?.[0]) {
    throw new Error("Rute tidak ditemukan (OSRM: " + (json.code || "error") + ")");
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
    routeLayer.addData({
      type: "Feature",
      properties: {},
      geometry,
    });
  }
  const startM = L.circleMarker([from.lat, from.lon], {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: "#2e7d4f",
    fillOpacity: 1,
  }).bindPopup("Asal");
  const endM = L.circleMarker([to.lat, to.lon], {
    radius: 7,
    color: "#fff",
    weight: 2,
    fillColor: "#ffb81c",
    fillOpacity: 1,
  }).bindPopup("Tujuan");
  markersLayer.addLayer(startM);
  markersLayer.addLayer(endM);
  const bounds = routeLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds.pad(0.12));
  } else {
    map.fitBounds(L.latLngBounds([from.lat, from.lon], [to.lat, to.lon]).pad(0.2));
  }
}

function clearResultsVisual() {
  el.distance.innerHTML = "<strong>Jarak: </strong>";
  el.duration.innerHTML = "<strong>Waktu Tempuh: </strong>";
  el.cost.innerHTML = "<strong>Ongkos BBM: </strong>";
  el.stops.innerHTML = "<strong>Berhenti di SPBU: </strong>";
}

function computeCosts(meters) {
  const konsumsi = Number(el.konsumsi.value);
  const harga = Number(el.harga.value);
  if (!(konsumsi > 0) || !(harga > 0)) {
    throw new Error("Isi konsumsi BBM (km/l) dan harga BBM terlebih dahulu.");
  }
  const km = meters / 1000;
  // Same formulas as the 2016 app: cost = km × (1/kmpl) × price
  const once = km * (1 / konsumsi) * harga;
  const roundTrip = once * 2;
  const weekly = once * 14;
  const fills = (liters) => liters / TANK_LITERS;
  const litersOnce = km / konsumsi;
  return {
    once,
    roundTrip,
    weekly,
    fillsOnce: fills(litersOnce),
    fillsRound: fills(litersOnce * 2),
    fillsWeekly: fills(litersOnce * 14),
    km,
  };
}

function renderCosts(route) {
  const c = computeCosts(route.meters);
  el.distance.innerHTML = "<strong>Jarak: </strong>" + formatKm(route.meters);
  el.duration.innerHTML = "<strong>Waktu Tempuh: </strong>" + formatDuration(route.seconds);
  el.cost.innerHTML =
    "<strong>Ongkos BBM: </strong>" +
    rupiah(c.once) +
    " (Sekali Jalan) | " +
    rupiah(c.roundTrip) +
    " (Pulang Pergi) | " +
    rupiah(c.weekly) +
    " (Mingguan)";
  el.stops.innerHTML =
    "<strong>Berhenti di SPBU: </strong>" +
    Math.floor(c.fillsOnce) +
    " kali (Sekali Jalan) | " +
    Math.floor(c.fillsRound) +
    " kali (Pulang Pergi) | " +
    Math.floor(c.fillsWeekly) +
    " kali (Mingguan)";
}

async function calculateRoute() {
  el.calc.disabled = true;
  setStatus("Menghitung rute…", "busy");
  try {
    const from = await resolvePoint(el.start.value, startPoint);
    startPoint = from;
    el.start.value = from.label;

    const to = await resolvePoint(el.end.value, endPoint);
    endPoint = to;
    el.end.value = to.label;

    const route = await osrmRoute(from, to);
    showRoute(from, to, route.geometry);
    renderCosts(route);
    setStatus("Rute siap. Biaya dihitung dari jarak OSRM dan input BBM Anda.");
  } catch (err) {
    console.error(err);
    clearResultsVisual();
    setStatus(err.message || "Gagal menghitung rute.", "error");
  } finally {
    el.calc.disabled = false;
  }
}

function scheduleRoute() {
  clearTimeout(routeTimer);
  routeTimer = setTimeout(() => {
    if (el.start.value.trim() && el.end.value.trim() && el.konsumsi.value && el.harga.value) {
      calculateRoute();
    }
  }, 350);
}

function clearRoute() {
  routeLayer.clearLayers();
  markersLayer.clearLayers();
  clearResultsVisual();
  startPoint = null;
  endPoint = null;
  el.start.value = "";
  el.end.value = DEFAULT_END;
  endPoint = null;
  setStatus("");
  map.setView(BANDUNG, 12);
}

async function boot() {
  initMap();
  setStatus("Memuat data kendaraan…", "busy");
  try {
    await loadData();
    setStatus("Pilih mobil & BBM, lalu isi asal/tujuan.");
  } catch (err) {
    console.error(err);
    setStatus("Gagal memuat data lokal. Muat ulang halaman.", "error");
  }

  el.make.addEventListener("change", () => {
    fillModels();
    el.konsumsi.value = "";
  });
  el.model.addEventListener("change", onModelChange);
  el.fuel.addEventListener("change", onFuelChange);
  el.calc.addEventListener("click", calculateRoute);
  el.clear.addEventListener("click", clearRoute);

  ["bbm", "harga"].forEach((id) => {
    document.getElementById(id).addEventListener("change", scheduleRoute);
  });

  bindAutocomplete(el.start, el.startSuggest, (pt) => {
    startPoint = pt;
  });
  bindAutocomplete(el.end, el.endSuggest, (pt) => {
    endPoint = pt;
  });

  el.end.value = DEFAULT_END;

  // Prefill a common Indonesia-relevant example if Toyota exists
  if (carData?.cars?.Toyota) {
    el.make.value = "Toyota";
    fillModels();
  }
}

boot();
