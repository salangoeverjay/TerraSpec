# TerraSpec — Setup Guide

Geospatial Decision Support System for Panabo City, Davao del Norte.

---

## Prerequisites

Install these before cloning the project:

| Tool | Version | Download |
|------|---------|----------|
| XAMPP | 8.2+ | https://www.apachefriends.org |
| PHP | 8.2+ | bundled with XAMPP |
| Composer | latest | https://getcomposer.org |
| Node.js | 18+ | https://nodejs.org |
| Git | latest | https://git-scm.com |

> **Windows users:** After installing XAMPP, add `C:\xampp\php` and `C:\xampp\mysql\bin` to your system `PATH`.

---

## 1. Clone the Repository

Place the project inside XAMPP's web root:

```bash
cd C:\xampp\htdocs
git clone <repository-url> TerraSpec
cd TerraSpec
```

---

## 2. Install PHP Dependencies

```bash
composer install
```

---

## 3. Configure Environment

Copy the example env file and generate an app key:

```bash
copy .env.example .env
php artisan key:generate
```

Open `.env` and update the database and API settings:

```env
APP_NAME=TerraSpec
APP_URL=http://localhost/TerraSpec/public

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=terraspec
DB_USERNAME=root
DB_PASSWORD=

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

> `DB_PASSWORD` is blank by default in XAMPP. Change it if your MySQL root has a password.

---

## 4. Create the Database

Open **phpMyAdmin** (`http://localhost/phpmyadmin`) and create a new database named `terraspec`, or run:

```bash
php -r "new PDO('mysql:host=127.0.0.1;port=3306', 'root', '')->exec('CREATE DATABASE IF NOT EXISTS terraspec');"
```

Then run migrations:

```bash
php artisan migrate
```

This creates the `sessions`, `cache`, `jobs`, and `users` tables required by Laravel.

---

## 5. Install JavaScript Dependencies

```bash
npm install
```

---

## 6. Map Component (MapLibre)

The interactive map uses a custom React wrapper around **MapLibre GL JS** located at [components/ui/map.tsx](components/ui/map.tsx). This file is already included in the repository — no separate installation is needed beyond `npm install`.

### How it works

| Part | Detail |
|------|--------|
| Package | `maplibre-gl` v5 — installed via `npm install` |
| Component file | `components/ui/map.tsx` |
| Import path (from `resources/js/`) | `../../components/ui/map` |
| Basemap tiles | CARTO Positron (light) and CARTO Dark Matter (dark) — requires internet |
| Theme | Auto-detects dark/light from the `dark` class on `<html>` |

### Import example

```jsx
import {
  Map, MapControls, MapMarker, MarkerContent,
  MarkerPopup, MarkerTooltip, useMap,
} from '../../components/ui/map';
```

### Path alias

The component internally imports `@/lib/utils`. The `@` alias points to `resources/js/` and is defined in [vite.config.js](vite.config.js):

```js
resolve: {
  alias: { '@': '/resources/js' },
}
```

This is already configured — no changes needed.

### Required dependencies (all included in `package.json`)

```
maplibre-gl       — core map engine
lucide-react      — control icons (zoom, compass, fullscreen)
clsx              — CSS class utility
tailwind-merge    — Tailwind class merging
```

All are installed automatically with `npm install`.

### What needs internet

The basemap tile styles are fetched from CARTO's CDN at runtime:
- Light: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Dark: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`

Without internet, the map canvas will show blank (no basemap tiles), but markers, GeoJSON layers, and UI panels will still render.

### If you need offline tiles

Replace the default CARTO styles in [components/ui/map.tsx](components/ui/map.tsx) (lines 24–27) with a self-hosted MapLibre style pointing to a local tile server (e.g., `tileserver-gl`):

```ts
const defaultStyles = {
  dark:  'http://localhost:8080/styles/dark-matter/style.json',
  light: 'http://localhost:8080/styles/positron/style.json',
};
```

---

## 7. Add GeoJSON Data (Optional)

The landslide hazard layer reads from `public/data/landslide_hazard_panabo_final.geojson`.  
Create the folder and place the file there if you have it:

```
public/
  data/
    landslide_hazard_panabo_final.geojson
```

The map will work without this file — the layer simply won't load until the file is present.

---

## 8. Run the Development Server

Start Vite and Laravel together:

```bash
composer run dev
```

This runs three processes in parallel:
- `php artisan serve` — Laravel backend at `http://127.0.0.1:8000`
- `npm run dev` — Vite HMR at `http://localhost:5173`
- `php artisan queue:listen` — background job queue

Open `http://127.0.0.1:8000` in your browser.

---

## 9. Build for Production

```bash
npm run build
php artisan config:cache
php artisan route:cache
```

Then visit the site via XAMPP Apache: `http://localhost/TerraSpec/public`

---

## Default Login

The LGU Admin login (top-right of the app) uses hardcoded credentials:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

---

## Getting a Gemini API Key

The AI chatbot requires a Google Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Paste it into `.env` as `GEMINI_API_KEY`

Without a key, the AI Assistant and Map AI chat features will return errors but the rest of the app works normally.

---

## Troubleshooting

**Vite build error / blank page**
```bash
npm run build
php artisan config:clear
php artisan view:clear
```

**`php artisan` not found**
Add PHP to your PATH: `C:\xampp\php`

**Database connection refused**
Make sure XAMPP's MySQL service is running in the XAMPP Control Panel.

**Session errors on first load**
Run `php artisan migrate` — the `SESSION_DRIVER=database` setting requires the sessions table.

**Map tiles not loading**
The basemap uses MapLibre with OpenStreetMap/CARTO tiles. An internet connection is required for map tiles to render.
