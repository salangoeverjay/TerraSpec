# High-Priority Hardening (H1–H4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Throttle the expensive public routes, end other sessions when a password changes, return JSON errors and surface fetch failures consistently, and show admin-only UI to admins only.

**Architecture:**
- Backend:
  - named rate limiters in `AppServiceProvider` (so buckets are never shared)
  - `AuthenticateSession` on the web middleware group
  - JSON error rendering extended to the JSON web routes
  - a single `message` error key
- Frontend:
  - one `getJson()` helper in `http.js`, used by every screen GET
  - the real staff role passed to the Admin screen

**Tech Stack:** Laravel 12, Pest 3, React 19 (no JS test tooling).

**Spec:** `graphify-out/ARCHITECTURE_REVIEW.md`, Phase 4, items H1, H2, H3, H4 (approved by the user on 2026-10-26).

## Global Constraints

- No business-logic, scoring or data changes; no new dependencies; Pint + Pest per Laravel Boost guidelines.
- Commit and push only when the user asks.
- Frontend changes are verified in the browser pane (no JS tests).
- The client `role` value `'admin'` keeps meaning "a signed-in staff member": chat storage keys, header tabs and chat suggestions rely on it. The real role (`admin` or `planner`) is passed separately where it matters.

## Review Focus

1. A visitor reloading the dashboard or map normally (a few requests a minute) must never hit a limit. *(Task 1 uses 60/min for ordinary public routes.)*
2. A planner whose password an admin resets is signed out on their next request, while an admin who changes their own password stays signed in. *(Task 2, both tests.)*
3. Any screen whose API call fails (500, 429, 422) shows an error message, never empty tables or an endless "…". *(Task 3, browser check with a forced failure.)*
4. Validation errors on JSON web routes come back as 422 JSON even when the request has no `Accept` header. *(Task 3 test.)*
5. A planner signed in to Admin never sees the Users tab; an admin still does. *(Task 4, browser check of the tab list.)*

---

### Task 1 (H1): Throttle the expensive public routes

**Files:** `app/Providers/AppServiceProvider.php`, `routes/web.php`, `routes/api.php`. Test: `tests/Feature/RouteHardeningTest.php`.

**Interfaces:**
- `RateLimiter::for('heavy', …)`: 10 per minute per IP. JSON 429 with message `Too many requests for this report or analysis. Please wait a minute and try again.`
- `RateLimiter::for('public', …)`: 60 per minute per IP. JSON 429 with message `Too many requests. Please wait a minute and try again.`
- Apply `throttle:heavy` to `GET /environmental/report`, `/reforestation/{id}/pdf`, `/suitability/compare` and `/suitability/sensitivity`.
- Apply `throttle:public` to every other public GET in `web.php` and to `GET /api/dashboard-stats`.

- [ ] **Step 1:** Write the failing tests:
  - `it('limits heavy public analyses to 10 per minute')`: 10 × `getJson('/suitability/compare?analysis_type=commercial')` are OK, the 11th `assertTooManyRequests()`.
  - `it('limits ordinary public data routes to 60 per minute')`: 60 × `getJson('/barangays')` are OK, the 61st returns 429.
- [ ] **Step 2:** Run `php artisan test --compact --filter="per minute"`. Expected: both FAIL (no 429).
- [ ] **Step 3:** Add the two limiters and the route middleware.
- [ ] **Step 4:** Run the same filter. Expected: PASS. Then the full suite.

### Task 2 (H2): End other sessions on a password change

**Files:** `bootstrap/app.php` (`withMiddleware`), `app/Http/Controllers/LguAuthController.php` (comment only, if behaviour needs no code). Test: `tests/Feature/LguAuthenticationTest.php`.

**Interfaces:** `$middleware->web(append: [\Illuminate\Session\Middleware\AuthenticateSession::class])`. It stores the password hash in the session after each request and signs out any session whose stored hash no longer matches.

- [ ] **Step 1:** Write the failing tests:
  - `it('signs a user out after an admin resets their password')`:
    1. Log in as a planner via `POST /api/lgu/login`.
    2. `getJson('/api/admin/zones')` is OK.
    3. Change the planner's password in the DB (`forceFill(['password' => Hash::make('NewPassword123')])->save()`).
    4. The next `getJson('/api/admin/zones')` returns 401.
  - `it('keeps the user signed in after changing their own password')`:
    1. Log in as an admin.
    2. `POST /api/lgu/password` with valid new data is OK.
    3. `getJson('/api/admin/zones')` is still OK.
- [ ] **Step 2:** Run the filter. Expected: the first FAILS (still 200); the second passes (it guards against over-correction).
- [ ] **Step 3:** Append `AuthenticateSession` to the web group.
- [ ] **Step 4:** Run the filter (both PASS), then the full suite. Fix any test that relied on keeping the session after a password change.

### Task 3 (H3): Consistent JSON errors and checked fetches

**Files:**
- Backend: `bootstrap/app.php` (`shouldRenderJsonWhen`), `app/Http/Controllers/AhpController.php` (`error` → `message`).
- Frontend: `resources/js/http.js` (new `getJson`), then every raw screen GET:
  - `suitability.jsx` (rankings, export-all)
  - `dashboard.jsx` (rankings, stats)
  - `reforestation.jsx` (list, match)
  - `barangay-profile.jsx` (list, profile)
  - `environmental.jsx`
  - `reports.jsx` (`/reforestation` via `getJson`, `/api/reports` via `apiJson`)
  - `zoning-query.jsx`
  - `panabo-map.jsx` (`/reforestation`)
  - `landing.jsx`
- Tests: `tests/Feature/RouteHardeningTest.php`, `tests/Feature/CriteriaWeightIntegrityTest.php`.

**Interfaces:** `export async function getJson(url: string): Promise<any>` in `http.js`:
- sends `Accept: application/json` with same-origin credentials
- on `!ok`, throws `Error(firstValidationError || json.message || 'Request failed (HTTP <status>).')`, the same message rule as `apiJson`, and fires the 401 event
- returns the parsed JSON

JSON rendering applies when the path is `api/*` or matches `suitability`, `suitability/*`, `reforestation`, `reforestation/*`, `barangays`, `barangays/*`, `environmental/*` or `zoning/*`, or when the request expects JSON.

- [ ] **Step 1:** Write the failing tests:
  - `it('returns validation errors as JSON on data routes without an Accept header')`: `get('/suitability/breakdown')` (no params, no Accept) gives `assertStatus(422)` and `assertJsonValidationErrors(['analysis_type', 'zone_unit_id'])`.
  - In CriteriaWeightIntegrityTest: the inconsistent-matrix test also asserts that `json('message')` contains `'Consistency Ratio'`.
- [ ] **Step 2:** Run them. Expected: FAIL (a 302 redirect, and no `message` key).
- [ ] **Step 3:** Extend `shouldRenderJsonWhen`. Rename `error` to `message` in the 3 AhpController responses. Add `getJson` and replace the raw GETs listed above. Wherever a screen's catch is empty or only logs, set its existing error state (or add one) so the screen shows `Could not load …` instead of "…" or an empty list.
- [ ] **Step 4:** Run the tests (PASS), the full suite, and `npm run build`.
- [ ] **Step 5 (browser):** Block `/suitability/rankings` (wrap `fetch` to return a 500) and open Suitability and Dashboard. Both show an error message. Restore and reload: data shows, with no console errors.

### Task 4 (H4): Real admin and planner roles in the UI

**Files:** `resources/js/app.jsx` (pass `staffRole={lguUser?.role}` to screens), `resources/js/admin.jsx` (hide the `users` tab unless `staffRole === 'admin'`; remove `viewer` from the role options), `app/Http/Controllers/AdminController.php` (role rule `in:admin,planner` in `storeUser` and `updateUser`). Tests: `tests/Feature/LguAuthenticationTest.php`.

- [ ] **Step 1:** Write the failing test `it('only creates admin or planner accounts')`: an admin `postJson('/api/admin/users', [... 'role' => 'viewer'])` gets 422 with an error on `role`; the same with `'planner'` gets 201.
- [ ] **Step 2:** Run it. Expected: FAIL (viewer accepted).
- [ ] **Step 3:** Change the two validation rules, the admin role options, and the tab filter with the `staffRole` prop. The existing viewer-login refusal test stays: the DB enum and the login guard are unchanged.
- [ ] **Step 4:** Run the test (PASS) and the full suite.
- [ ] **Step 5 (browser):** In the Admin screen, read the tab list with `staffRole` forced to `planner` and to `admin` by checking the rendered tabs after signing in, or by reviewing the filter if no staff login is available.

### Task 5: Verify

- [ ] Pint, full test suite, `npm run build`, a browser pass over Dashboard, Map, Suitability, Reforestation, Profile, Environmental and Zoning query with no console errors.
- [ ] Fresh whole-branch code review (most capable model), a fix pass for Critical/Important findings, and a ledger.
- [ ] Graphify incremental update.
