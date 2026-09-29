# TerraSpec — System Knowledge Base

> Geospatial Decision Support System (DSS) for land-use suitability in **Panabo City, Davao del Norte, Philippines**.
> This document describes how the system actually works as of the `agentic-branch` snapshot (Sept 2026). For install steps see [`setup.md`](../setup.md); for raw source data see [`TerraSpec_Exact_Suitability_Data.md`](TerraSpec_Exact_Suitability_Data.md).

---

## 1. What the system does

TerraSpec helps the City Planning and Development Office (CPDO) and the public answer *"Where in Panabo is land suitable for X?"* across all **40 barangays**. It:

1. **Scores every barangay** for five land-use types — commercial, residential, industrial, agricultural, reforestation — using an **AHP-WLC** (Analytic Hierarchy Process + Weighted Linear Combination) model over 7 criteria.
2. **Matches native tree species** to barangays for reforestation planning.
3. **Summarises environmental constraints** — flood, landslide, storm surge, drought, sea-level-rise flags and protected areas (mangrove, watershed, SAFDZ).
4. Provides an **AI assistant** (Google Gemini) grounded in the live database.
5. **Generates PDF reports** (suitability, environmental, reforestation, comparative) with an AI-written executive summary.
6. Gives LGU admins a panel to edit zones, criteria weights (incl. an AHP pairwise calculator), restrictions, species and users.

All base data is transcribed from the **CLUP Panabo City CY 2020–2029, Vol. 1**.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.2, **Laravel 12** |
| PDF | `barryvdh/laravel-dompdf` 3 (Blade templates in `resources/views/pdf/`) |
| AI | Google **Gemini** REST API (`gemini-2.5-flash` default) via Laravel `Http` client |
| Database | MySQL (XAMPP) in dev; SQLite in-memory for tests |
| Sessions / cache / queue | `database` driver |
| Frontend | **React 19** SPA (plain JSX, no router), bundled by **Vite** |
| Styling | **Tailwind CSS v4** + custom CSS classes + inline styles; Geist font |
| Map | **MapLibre GL 5** through the mapcn `components/ui/map.tsx` wrapper; CARTO basemaps |
| Tests | Pest 3 / PHPUnit 11 |
| Tooling | Laravel Boost (AI guidelines in `AGENTS.md`, skills in `.github/skills/`), Pint |

> `inertiajs/inertia-laravel` and `@inertiajs/react` are installed, but **Inertia is not used** — the middleware isn't registered and nothing imports the React adapter. The app is a single Blade page that mounts a React SPA.

---

## 3. Architecture at a glance

```
Browser
 └─ welcome.blade.php  ──mounts──▶  resources/js/app.jsx  (<App/>, screen state machine)
        │                                   │
        │ fetch() JSON / file downloads     │ screens: landing, dashboard, map, suitability,
        ▼                                   │          environmental, reforestation, chat, reports, admin
Laravel routes
 ├─ routes/web.php  (no /api prefix)  → Suitability, Environmental, Reforestation, Report(generate)
 └─ routes/api.php  (/api prefix)     → Chatbot, DashboardStats, Reports(archive), LGU auth, Admin CRUD, AHP
        │
        ▼
Controllers ──▶ Services (business logic) ──▶ Eloquent models ──▶ MySQL
                  ├─ SuitabilityScoreService   (AHP-WLC scoring, NLP type detection)
                  ├─ AhpService                (pairwise matrix → weights, CR)
                  ├─ ReforestationService      (species matching, restrictions)
                  ├─ GeminiChatService         (chat replies, report narratives)
                  └─ TerraSpecContextService   (builds DB snapshot for the AI system prompt)
```

---

## 4. Directory map

| Path | Contents |
|---|---|
| `app/Http/Controllers/` | `SuitabilityController`, `ReforestationController`, `EnvironmentalController`, `ReportController`, `ChatbotController`, `DashboardStatsController`, `AdminController`, `AhpController`, `LguAuthController` |
| `app/Services/` | Domain logic (see §7–§10) |
| `app/Models/` | `ZoneUnit`, `ZoneHazardData`, `ZoneSoilData`, `PopulationProjection`, `SuitabilityCriteria`, `SuitabilityAnalysis`, `TreeSpecies`, `EnvironmentalRestriction`, `Report`, `User` |
| `app/Http/Requests/ChatbotRequest.php` | Validation for `/api/chatbot` |
| `database/migrations/2024_01_01_*` | Domain schema |
| `database/seeders/` | All reference data (40 barangays, hazards, soils, criteria, species, restrictions, admin users) |
| `resources/js/` | React SPA — one file per screen + `components.jsx` (UI kit) + `data.js` (static data & chat storage helpers) |
| `components/ui/map.tsx` | MapLibre React wrapper (mapcn registry) |
| `resources/views/welcome.blade.php` | The only HTML page |
| `resources/views/pdf/` | `report`, `environmental-report`, `reforestation-plan` PDF templates |
| `docs/` | This file + exact CLUP source tables |
| `tests/Feature/ChatbotTest.php` | Only meaningful test |

---

## 5. Data model

All domain tables use custom primary keys (`zone_unit_id`, `criteria_id`, `analysis_id`, `species_id`, `restriction_id`).

```
zone_units (40 barangays) ─┬─1:1─ zone_hazard_data
                           ├─1:1─ zone_soil_data
                           ├─1:N─ population_projections   (2020–2029)
                           ├─1:N─ suitability_analyses     (history; latestAnalysis = max analysis_id)
                           ├─N:M─ environmental_restrictions  (pivot: zone_restrictions)
                           └─1:N─ reports
suitability_criteria (7 rows, one weight column per analysis type)
tree_species (7 rows)
users (role: admin | planner | viewer)
```

### Key columns

**`zone_units`** — `unit_name`, `unit_type` (Urban/Rural), `total_area_ha`, `population_2020`, `household_count`, `population_density`, `avg_household_size`, `settlement_tier` (CBD / Minor_Growth / Emerging / Satellite), `saturation_index` (0–1 commercial saturation), `dominant_soil_type`, `dominant_slope_class` (0-8, 8-18, 18-30, 30-50, 50+), `land_capability_class` (A–D), `elevation_min/max` (m), `salinity_level` (None/Low/Med/High), `center_latitude/longitude`, `geojson_poly` (unused so far).

**`zone_hazard_data`** — hectares per class for flood (high/moderate/low/none), liquefaction (HSA/MSA/LSA), storm surge (high/moderate/low), plus boolean flags `has_flood`, `has_landslide`, `has_storm_surge`, `has_drought`, `has_sea_level_rise`.

**`zone_soil_data`** — hectares of each of the 4 soil series: Cabangan Clay Loam, Camasan Sandy Clay Loam, Matina Clay Loam, San Manuel Silty Clay Loam.

**`suitability_analyses`** — six per-criterion scores, `total_score` (0–1), `suitability_level`, JSON `criteria_breakdown` and `applied_weights`, `analysis_type`, optional `use_subtype`, nullable `user_id`. A new row is inserted on **every** calculation (append-only history).

**`reports`** — log of generated PDFs: `report_type`, `barangay`, `zone_unit_id`, `generated_by`, `status` (Draft/Review/Final/Archived), JSON `sections`.

### Seed data (`php artisan db:seed`)
Order in `DatabaseSeeder`: LGU admins → zones → hazards → soils → population projections → criteria → **pre-computed suitability analyses for all 5 types** → elevation/salinity → tree species → restrictions.

- Users: `admin@panabocity.gov.ph` (admin) and `planner@panabocity.gov.ph` (planner), password set in `LguAdminSeeder`. **Change these outside local dev.**
- Species: Bakawan, Pagatpat, Nipa Palm, Molave, Ipil, Dao, Toog.
- Restrictions: Panabo Mangrove Park (Mangrove), Tibungol Watershed Reserve and Tuganay Watershed (Watershed), SAFDZ Agricultural Zone (SAFDZ).

> `setup.md` still says the admin login is `admin / admin123`. That is outdated — login is by email against the `users` table.

---

## 6. Screens (frontend)

`app.jsx` holds `screen` in React state (saved to `sessionStorage['terraspec-screen']`) and passes `go, role, search, setSearch, mapContext, setMapContext` to every screen. `mapContext` (`{barangay, zone, score}`) links the map to the chat.

| Screen | File | Backend calls | Notes |
|---|---|---|---|
| Landing | `landing.jsx` | none | Marketing page + decorative map |
| Dashboard | `dashboard.jsx` | `GET /suitability/rankings?analysis_type=commercial`, `GET /api/dashboard-stats` | KPIs, top-5, restrictions, species, recent AI queries (localStorage) |
| Map | `panabo-map.jsx` | `POST /api/chatbot` (floating chat bubble) | Zoning / flood / landslide / reforestation layers, barangay search, AI highlight markers |
| Suitability | `suitability.jsx` | `GET /suitability/rankings?analysis_type=…` | Tab per type, criteria weights, print-to-PDF via `window.open` |
| Environmental | `environmental.jsx` | `GET /environmental/summary`, download `GET /environmental/report` | Flood / restricted / protected tables |
| Reforestation | `reforestation.jsx` | `GET /reforestation`, `GET /reforestation/{id}/match`, download `GET /reforestation/{id}/pdf` | Species ranking per barangay |
| AI Assistant | `chat.jsx` | `POST /api/chatbot` | Multiple conversations saved in localStorage, markdown rendering, live-calc cards, "show on map" |
| Reports | `reports.jsx` | download `GET /reports/generate?type=&barangay=&sections[]=`, `GET /api/reports` | Generator + archive |
| Admin | `admin.jsx` | `/api/admin/{zones,criteria,restrictions,species,users}` CRUD, `POST /api/admin/ahp/apply` | Only visible when `role === 'admin'` |

**Auth UX:** the topbar "LGU Admin" tab opens a login modal → `POST /api/lgu/login` (email + password). On success the browser stores `role='admin'` in `sessionStorage`. The role check happens **only in the browser** (see §12).

**Map:** centred on `[125.6847, 7.307]`, zoom 12.5. Basemaps are CARTO Positron / Dark Matter (need internet). The landslide layer tries `public/data/landslide_hazard_panabo_final.geojson` and uses built-in dummy polygons if it's missing. **Zoning, flood and reforestation layers are placeholder rectangles.** Clicking the map shows a *simulated* suitability score (fixed values plus noise), not a backend result.

**`data.js`** holds hardcoded copies of rankings, criteria, species, restrictions, reports and 40 barangay centroids (22 checked against OSM, 18 estimated). The map and landing page still read these static values, so admin edits in the DB don't show there.

---

## 7. Suitability model (AHP-WLC) — `SuitabilityScoreService`

Each barangay gets seven **criterion scores in [0, 1]** (higher = better):

| Key | Criterion | Formula |
|---|---|---|
| `flood` | Flood Risk | `1 − (1.0·high + 0.5·moderate + 0.2·low) / area` |
| `slope` | Slope Suitability | lookup: 0-8 → 1.0, 8-18 → 0.8, 18-30 → 0.5, 30-50 → 0.1, 50+ → 0.0 (default 0.5) |
| `liquefaction` | Liquefaction Risk | `1 − (1.0·HSA + 0.5·MSA + 0.2·LSA) / area` |
| `population` | Population Density | `min(1, density / 14 910)` (14 910 p/ha = Gredu, the city max) |
| `saturation` | Market Saturation | `1 − saturation_index` (less saturation = more opportunity) |
| `soil` | Soil Suitability | Camasan 0.90, Cabangan 0.85, San Manuel 0.70, Matina 0.55 (default 0.5) |
| `zoning` | Zoning Compliance | rule matrix: reforestation on capability C/D = 1.0 (else 0.5); Urban + commercial/residential = 1.0; Urban + industrial = 0.75; Rural + agricultural = 1.0; Rural + commercial = 0.5; otherwise 0.6 |

**Total** = Σ (criterion score × weight for the analysis type), clamped to [0, 1]. Weights are read from `suitability_criteria` on every call, so admin changes apply right away.

**Classification**

| Total | Level |
|---|---|
| ≥ 0.75 | Highly Suitable |
| ≥ 0.50 | Moderately Suitable |
| ≥ 0.25 | Low Suitability |
| < 0.25 | Not Suitable |

**Seeded weights** (each column sums to 1.00):

| Criterion | Default | Commercial | Residential | Industrial | Agricultural | Reforestation |
|---|---|---|---|---|---|---|
| Flood Risk | .30 | .25 | .35 | .30 | .20 | .15 |
| Slope Suitability | .20 | .20 | .20 | .25 | .15 | .20 |
| Liquefaction Risk | .10 | .10 | .15 | .15 | .05 | .05 |
| Population Density | .15 | .25 | .15 | .05 | .00 | .00 |
| Market Saturation | .10 | .15 | .05 | .05 | .00 | .00 |
| Soil Suitability | .10 | .05 | .05 | .10 | .45 | .40 |
| Zoning Compliance | .05 | .00 | .05 | .10 | .15 | .20 |

The criterion names in the DB **must match** `CRITERIA_SCORE_MAP` exactly. If a row is renamed, it silently contributes 0.

**Natural-language entry point** (`POST /suitability/nlp`): `detectAnalysisType()` keyword-matches the query in the order commercial → residential → industrial → agricultural → reforestation (default commercial). `extractSubtype()` picks words like grocery or hospital. It returns the top 5 barangays with a rule-based explanation (flood, liquefaction, demand, saturation, terrain, soil, settlement tier).

---

## 8. AHP weight calculator — `AhpService`

Input: an n×n pairwise comparison matrix (Saaty scale, values 1/9 … 9).

1. Normalise each column by its sum; the row averages give the priority vector **w**.
2. λmax = mean of (A·w)ᵢ / wᵢ.
3. CI = (λmax − n) / (n − 1).
4. CR = CI / RI[n], using Saaty's RI = [0, 0, 0, .58, .90, 1.12, 1.24, 1.32, 1.41, 1.45]. CR is 0 for n ≤ 2.
5. **Valid if CR ≤ 0.10.**

`POST /api/admin/ahp/apply` rejects an inconsistent matrix (422). Otherwise it writes weights to `{type}_weight` for each criterion, **matched by `criteria_id` order**, so the matrix rows must follow the criteria table order. Applying to `commercial` also overwrites `default_weight`. `/compute` (preview only) exists but the UI computes CR client-side instead.

---

## 9. Reforestation matching — `ReforestationService`

For each species vs. a barangay (max 1.00):

| Factor | Points | Rule |
|---|---|---|
| Soil | 0.35 | species `soil_preference` is in the compatibility list for the zone's dominant soil (hardcoded `$soilCompatibility` map) |
| Elevation | 0.25 | species range overlaps `elevation_min–max` |
| Salinity | 0.20 | High needs High; Med needs Med or High; Low accepts Low, Med or High; None needs None |
| Temperature | 0.20 | species range overlaps the city range 27.2–28.3 °C |

Species scoring 0 are dropped. Results are sorted by score (ties broken by `species_id`) and ranked. Ranges are stored as strings like `"0-50"` and parsed by splitting on `-`. `checkRestrictions()` returns the restrictions linked to the zone.

---

## 10. AI assistant — `GeminiChatService` + `TerraSpecContextService`

**`POST /api/chatbot`** `{prompt, context?: {selection, suitability, zone, weights}}`

1. `TerraSpecContextService::build()` creates a text snapshot of the DB: city overview, **full rankings for commercial, residential, industrial and reforestation**, restrictions and their barangays, hazard zones, species, and elevation/salinity. This goes into the **system prompt on every request**, so prompts are large and each chat runs several DB queries.
2. The user prompt is sent with the on-screen context ("user is viewing barangay X…"). Settings: temperature 0.2, 700 max tokens, 3 retries.
3. The response adds post-processing done in PHP (no extra LLM calls):
   - `recommended_zones`: barangays named in the answer, with their stored scores.
   - `detected_intent`: environmental_assessment / zoning_compliance / {type}_suitability.
   - `extracted_entities`: barangays, zone codes (R-1, C-1…), parcel codes (PCL-#####), species, hazards.
   - `live_calculation`: if the prompt contains words like "calculate / analyze / assess" **and** names a barangay, a fresh score is computed (not saved).
4. If there's no API key it throws a `RuntimeException`, which returns an HTTP 500.

`generateNarrative()` writes a 3–4 sentence executive summary for PDF reports. It returns `''` on any failure, so reports still generate without Gemini.

> The chat service has its **own** regex-based `detectAnalysisType()`, separate from `SuitabilityScoreService`'s keyword list. The two can disagree for the same prompt.

---

## 11. HTTP API reference

### Web routes (`routes/web.php`, CSRF applies to POST)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | SPA shell |
| GET | `/suitability` | All zones + latest analysis |
| GET | `/suitability/rankings?analysis_type=` | Stored rankings for a type (from `suitability_analyses`, every row for that type) |
| POST | `/suitability/calculate` | `{analysis_type, zone_unit_id?, use_subtype?}` — compute and **save** for one or all zones |
| POST | `/suitability/nlp` | `{query}` — top 5 with explanations (saves 5 rows) |
| GET | `/suitability/{id}` | One stored analysis |
| GET | `/environmental/summary` | Hazard + restriction summary JSON |
| GET | `/environmental/report` | Environmental PDF download |
| GET | `/reforestation` | Zone list |
| GET | `/reforestation/{id}/match` | Species matches + restrictions |
| GET | `/reforestation/{id}/report` | Reforestation report JSON |
| GET | `/reforestation/{id}/pdf` | Reforestation PDF |
| GET | `/reports/generate?type=&barangay=&sections[]=` | Generate PDF + log to `reports` |

Report types: *Suitability Summary, Zone Compliance Check, Environmental Clearance, Hazard Assessment* (all scored as **commercial**), *Reforestation Plan*, *Comparative Analysis* (city-wide commercial ranking).

### API routes (`routes/api.php`, prefix `/api`, stateless)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chatbot` | AI assistant |
| GET | `/api/dashboard-stats` | Zone/hazard/report counts, restrictions, 5 species |
| GET | `/api/reports` | Report archive |
| POST | `/api/lgu/login` · `/api/lgu/logout` | LGU login/logout |
| POST | `/api/admin/ahp/compute` · `/apply` | AHP |
| GET/PUT | `/api/admin/zones[/{id}]` | Zones |
| GET/PUT | `/api/admin/criteria` | Bulk criteria weights |
| GET/POST/PUT/DELETE | `/api/admin/restrictions[/{id}]` | Restrictions |
| GET/POST/PUT/DELETE | `/api/admin/species[/{id}]` | Species |
| GET/PUT/DELETE | `/api/admin/users[/{id}]` | Users |

---

## 12. Known issues and risks

### Security (high priority)
- **Admin and AHP API routes have no authentication or authorization middleware.** Anyone who can reach the server can edit weights, restrictions and species, and can **change or delete users (including passwords)**.
- The admin role is enforced **only in the browser** (`sessionStorage['terraspec-role']`).
- Login runs on the stateless `api` group, so no session cookie is kept. `logout` calls `$request->session()`, which fails with no session middleware. The frontend calls `/sanctum/csrf-cookie`, but **Sanctum isn't installed**.
- The Gemini API key is sent as a URL query parameter (Google's standard method, but it can show up in proxy logs).
- Seeded admin passwords are in source control.

### Correctness
- `SuitabilityScoreService::detectAnalysisType` lists `plant` under **industrial** before reforestation, so "where to plant trees" is classified as industrial.
- `/suitability/rankings` returns **every** stored analysis for a type. After repeated `calculate`/`nlp` calls, the same barangay appears several times.
- `calculate` crashes if a zone has no `zone_hazard_data` row (reads properties of null).
- Zoning compliance ignores `use_subtype`. Agricultural in Urban and residential in Rural fall to the 0.6 default.
- AHP `apply` maps weights to criteria by row order, not by name.
- Report types other than Reforestation/Comparative are always scored as **commercial**.
- `ChatbotTest` probably fails as written: it expects `*` stripped from answers (`normalizeAnswer` only trims), and it hits DB tables without `RefreshDatabase`.

### Frontend
- The map uses placeholder polygons and a simulated click score. `public/data/` doesn't exist, and `parcels` is empty, so parcel search/panel are dead paths.
- Layer components use `useMemo` for side effects (`map.on`, `addLayer`, fetch). Cleanup never runs, so click handlers pile up across re-renders.
- `data.js` duplicates DB data; the map and landing page ignore admin edits.
- The Reports default barangay `'Poblacion'` doesn't exist. The archive "download" button and the map filter chips have no handlers.
- Most `fetch` calls don't check `r.ok`.
- Unused: Inertia (both sides), `resources/js/app.js` + axios bootstrap, `PanaboMapSVG`, `concurrently` in npm deps.
- `@vitejs/plugin-react` isn't used, so there's no React Fast Refresh (JSX is compiled by esbuild).

### Performance
- The AI system prompt includes the full rankings on every chat request.
- Dashboard and environmental endpoints load full collections and filter in PHP. That's fine for 40 zones but won't scale to parcel-level data.

---

## 13. Running and testing

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate   # set DB_* and GEMINI_API_KEY
php artisan migrate --seed
composer run dev          # artisan serve + queue:listen + vite
composer test             # Pest (SQLite in-memory)
vendor/bin/pint --dirty   # code style
```

Rebuild frontend assets with `npm run build` if UI changes don't show up.

---

## 14. Conventions (from `AGENTS.md`)

- Follow existing structure; no new top-level folders or dependency changes without approval.
- Business logic lives in `app/Services`; controllers stay thin and return JSON or PDF downloads.
- Weights are never hardcoded in scoring. Always read `suitability_criteria`.
- Use Pest for tests; run Pint before committing.
- Only add documentation files when explicitly requested.

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **AHP** | Analytic Hierarchy Process — derives criterion weights from pairwise comparisons |
| **WLC** | Weighted Linear Combination — Σ weight × normalised score |
| **CR** | Consistency Ratio — must be ≤ 0.10 for AHP judgements to be accepted |
| **CLUP** | Comprehensive Land Use Plan (source of all base data) |
| **CPDO** | City Planning and Development Office |
| **LGU** | Local Government Unit |
| **SAFDZ** | Strategic Agriculture and Fisheries Development Zone |
| **HSA / MSA / LSA** | High / Moderate / Low Susceptibility Area (liquefaction) |
| **Settlement tier** | CBD → Minor Growth → Emerging → Satellite (urban hierarchy) |
| **Land capability class** | A (best) … D (degraded); C/D favoured for reforestation |
| **Zone unit** | A barangay record in `zone_units` |
