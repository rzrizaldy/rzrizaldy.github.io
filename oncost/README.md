# OnCost

Trip fuel-cost calculator, rewritten from the 2016 PHP + MySQL + Google Maps app ([OnCost-Github](https://github.com/rzrizaldy/OnCost-Github)) for GitHub Pages:

| Surface | URL |
| --- | --- |
| **Legacy** (look & feel dekat 2016) | [`/oncost/`](https://rzrizaldy.github.io/oncost/) |
| **OnCost 2.0** (modern, ID + US) | [`/oncost/v2/`](https://rzrizaldy.github.io/oncost/v2/) |

Tombol **OnCost 2.0** ada di header legacy; tombol **Legacy 2016** ada di header 2.0.

## Bahasa / English

**ID:** Legacy dipertahankan visualnya (cream, logo, banner, rumus ongkos). OnCost 2.0 menambah skala Indonesia + Amerika Serikat, database mobil lebih baru, harga BBM snapshot terkini, dan UI yang lebih modern — tanpa API key.

**EN:** Legacy keeps the 2016 aesthetic. OnCost 2.0 adds Indonesia + US scope, newer vehicle catalogues, current fuel-price snapshots, and a contemporary UI — still fully static on GitHub Pages.

## What was ported (legacy)

| Feature | Status |
| --- | --- |
| Car catalogue + fuel economy (km/l) | Ported from original `mobil` / EPA CSV (aggregated) |
| Indonesian fuel brands & **2016** price snapshot | Ported from `bbm` |
| Manual konsumsi / harga overrides | Ported (+ auto-fill) |
| Origin → destination driving route | **OSRM** (was Google Directions) |
| Place search | **Nominatim** (was Google Places) |
| Map + route line | **Leaflet + OpenStreetMap tiles** (was Google Maps; no key) |
| Results: jarak, waktu, ongkos (sekali / PP / mingguan), isi SPBU | Same formulas; tank = 50 L |
| Default tujuan Jalan Ganesha, Bandung | Ported |

## OnCost 2.0

- **Regions:** Indonesia (`cars-id.json` curated market models) and United States (`cars-us.json` from EPA `vehicles.csv`, model years **2018–2027**).
- **Fuel prices (snapshot):**
  - **ID** — Pertamina Jabodetabek as of **1 Nov 2026** (Pertalite Rp10.000 … Pertamina Dex Rp25.200).
  - **US** — AAA national averages as of **31 Oct 2026** (Regular $4.184/gal … Diesel $6.310/gal).
- **Units:** ID uses km + km/l + IDR/liter; US uses miles + mpg + USD/gallon.
- **Design:** Outfit + IBM Plex, petrol-green accent, region switch, metric tiles — not the 2016 cream Bootstrap skin.
- **Maps:** Leaflet + `tile.openstreetmap.org` (no CARTO, no API key), Nominatim country-scoped, OSRM.

## What changed vs 2016

- No PHP / MySQL / Google API keys — static HTML/CSS/JS under `oncost/`.
- Fits existing `rzrizaldy.github.io` user Pages deploy (commit files under `oncost/`; no site-wide build step).
- Cascading make → model instead of one giant `<select>`.

## What could not / was not ported

- Google Maps night style, Places, Directions, and **draggable** routes.
- Live fuel-price APIs (snapshots only; update `v2/data/fuels.json` when prices move).
- `api.php` alternate UI (not a real HTTP API).
- Pure EVs in 2.0 cost math (excluded; no $/kWh path yet).
- Public OSRM / Nominatim are best-effort demos, not SLAs.

## Run locally

```bash
cd oncost
python3 -m http.server 8080
# Legacy: http://127.0.0.1:8080/
# 2.0:    http://127.0.0.1:8080/v2/
```

## Credits

- Original: Rizaldy Al Kautsar Utomo, 2016
- US economy: [fueleconomy.gov](https://www.fueleconomy.gov/feg/download.shtml)
- Routing / geocoding / tiles: OSRM, Nominatim, OpenStreetMap (`tile.openstreetmap.org`)
