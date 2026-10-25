# Critical Fixes (C1–C4) and Test Safety (H5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four confirmed critical problems from the architecture review, and make the test suite unable to call paid AI APIs or depend on a frontend build.

**Architecture:** Small, independent changes.
- Backend: route method and throttle, config defaults, test bootstrap.
- Frontend: one cache reset hook, and stale-response guards that reuse the existing `active`-flag pattern from `method-comparison.jsx`.
- No new dependencies and no new folders.

**Tech Stack:** Laravel 12 (PHP 8.2), Pest 3, React 19 (no JS test tooling), Vite.

**Spec:** `graphify-out/ARCHITECTURE_REVIEW.md`, Phase 4, items C1, C2, C3, C4 and H5 (approved by the user on 2026-10-26).

## Global Constraints

- Do not change business logic, scoring or data. Only the approved items.
- Do not add dependencies; Laravel Boost guidelines apply (Pint, Pest, `php artisan make:test --pest`).
- Commit only when the user asks (project rule). The commit steps below are prepared, not run automatically.
- Frontend changes have no JS tests. Verify them in the browser pane.

## Review Focus

1. A planner who double-clicks "Generate" should get at most one report per click, and on the 11th request in a minute a clear "too many requests" message rather than a broken download. *(Task 2 throttle test.)*
2. An old link or bookmark to `GET /api/reports/generate` must not create a report. *(Task 2 test: GET returns 405 and no `Report` row.)*
3. With `APP_DEBUG=false`, an unexpected error on any `api/*` route must not reveal the exception message, file or trace. *(Task 3 test.)*
4. After saving weights in Admin, the very next visit to Map or Dashboard must show the new classes without a page reload. *(Task 4 browser check.)*
5. Rapidly switching land use on Suitability must always end showing the last-selected land use's rankings. *(Task 5 browser check with network throttling.)*

---

### Task 1 (H5): Make the test suite safe

**Files:**
- Modify: `phpunit.xml` (the `<php>` env block)
- Modify: `tests/TestCase.php`
- Modify: `tests/Feature/ExampleTest.php`

**Interfaces:**
- Produces: every Feature test runs with `Http::preventStrayRequests()`; the AI keys are empty unless a test sets them.

- [ ] **Step 1:** Add `<env name="GEMINI_API_KEY" value=""/>`, `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` (same, empty) to `phpunit.xml`.
- [ ] **Step 2:** In `tests/TestCase.php`, add a `setUp(): void` that calls `parent::setUp()` and then `Http::preventStrayRequests()`.
- [ ] **Step 3:** In `ExampleTest`, call `$this->withoutVite()` before `get('/')`.
- [ ] **Step 4:** Run `php artisan test --compact`. Expected: all pass. A failure means a test made a real HTTP call: fix that test with `Http::fake`, never by removing the guard.
- [ ] **Step 5:** Commit when the user asks: `test: block real HTTP and AI keys in tests, drop the Vite build dependency`.

### Task 2 (C3): Report generation becomes a throttled POST

**Files:**
- Modify: `routes/api.php` (the `role:admin,planner` group)
- Modify: `resources/js/http.js` (add a raw-response helper)
- Modify: `resources/js/reports.jsx` (`generateReport`)
- Test: `tests/Feature/ReportGenerationTest.php`

**Interfaces:**
- Produces:
  - `Route::post('/reports/generate', [ReportController::class, 'generate'])->middleware('throttle:10,1')`. `ReportController::generate` and `GenerateReportRequest` are unchanged (the same fields are read from the body).
  - `export async function apiRequest(url: string, { method = 'GET', body, accept = 'application/json' } = {}): Promise<Response>` in `http.js`. It sends the XSRF token on non-GET requests and same-origin credentials, dispatches `UNAUTHENTICATED_EVENT` on 401, and returns the raw `Response` without throwing. `apiJson` is refactored to build on it.

- [ ] **Step 1: Failing tests.** Convert the existing generate calls to `postJson('/api/reports/generate', [...])` or `post(...)`, with the same parameters as arrays (`sections` as an array). Add:
  - `it('rejects report generation by GET so a link cannot create a report')`: an admin does `getJson('/api/reports/generate?type=Suitability%20Summary&barangay=Inland')`, gets `assertStatus(405)`, and `Report::count()` is 0.
  - `it('limits report generation to 10 per minute')`: an admin posts an invalid body 10 times (each 422), then the 11th returns `assertTooManyRequests()`.
- [ ] **Step 2:** Run `php artisan test --compact --filter=ReportGeneration`. Expected: FAIL (405 for POST).
- [ ] **Step 3:** Change the route to POST with `throttle:10,1`. Add `apiRequest` to `http.js`. In `generateReport`, send the parameters as a JSON body through `apiRequest(..., { method: 'POST', body, accept: 'application/json, application/pdf' })`; keep the existing blob download and error display.
- [ ] **Step 4:** Run the filter again. Expected: PASS.
- [ ] **Step 5:** Commit when the user asks: `fix: generate reports by POST with CSRF and a throttle`.

### Task 3 (C4): Safe production defaults

**Files:**
- Modify: `.env.example`
- Test: `tests/Feature/RouteHardeningTest.php`

- [ ] **Step 1: Failing-first test.** Add `it('hides exception details on API errors when debug is off')`:
  - Set `config(['app.debug' => false])`.
  - Register `Route::get('/api/test-failure', fn () => throw new RuntimeException('secret detail'))` inside the test.
  - `getJson` it, then assert status 500 and `json('message')` equal to `'Server Error'`.
  - Assert the response has no `exception`, `file` or `trace` keys and that its content does not contain `secret detail`.
- [ ] **Step 2:** Run the test. Expected: PASS (Laravel already does this when debug is off). The test pins the behaviour the config change relies on.
- [ ] **Step 3:** In `.env.example`:
  - Set `APP_DEBUG=false`.
  - Add `SESSION_SECURE_COOKIE=` with a comment line above it: `# Production: APP_DEBUG=false and SESSION_SECURE_COOKIE=true (HTTPS only). Local http://localhost: leave SESSION_SECURE_COOKIE empty and set APP_DEBUG=true in your own .env.`
  - Do not touch the local `.env`.
- [ ] **Step 4:** Commit when the user asks: `chore: production-safe defaults in .env.example`.

### Task 4 (C1): Refresh the suitability summary after weight or zone changes

**Files:**
- Modify: `resources/js/data.js` (next to `fetchSuitabilitySummary`)
- Modify: `resources/js/admin.jsx` (AHP apply, `saveWeights`, `handleSave` for the zones tab)

**Interfaces:**
- Produces: `export function refreshSuitabilitySummary(): void` in `data.js`. It clears `summaryPromise` so the next `fetchSuitabilitySummary()` refetches. Also fix the stale comment above it to say the summary is computed live.
- Consumers (unchanged): `dashboard.jsx`, `landing.jsx`, `panabo-map.jsx`, `map-layers.jsx`. They mount fresh on navigation (screen-state shows one screen at a time), so the next mount refetches.

- [ ] **Step 1:** Add `refreshSuitabilitySummary` and call it after a successful `ahp/apply`, after a successful `PUT /criteria`, and after a successful zone `PUT` (zone type and area affect scores).
- [ ] **Step 2 (browser check):**
  1. Open Map and note one barangay's commercial class.
  2. Sign in as staff, open Admin → Criteria, change the commercial weights (column still sums to 1) and save.
  3. Return to Map and the Dashboard. The class and percentage now match `/suitability/rankings`, with no reload.
  4. Restore the weights afterwards.
- [ ] **Step 3:** Commit when the user asks: `fix: refresh the cached suitability summary after admin changes`.

### Task 5 (C2): Guard screens against stale responses

**Files (each effect gets `let active = true; … return () => { active = false; };` and every `set*` in the promise chain checks `if (!active) return;`):**
- `resources/js/suitability.jsx`: rankings effect (`[analysisType]`)
- `resources/js/reforestation.jsx`: match effect (`[selectedId]`)
- `resources/js/barangay-profile.jsx`: list effect (`[barangay]`)
- `resources/js/admin.jsx`: `load(tab)`, guarded by a `useRef` request counter, because `load` is also called after saves
- `resources/js/panabo-map.jsx`: `runQuery`, guarded by a `useRef` request counter

- [ ] **Step 1:** Apply the guard to the five places above. Keep loading and error handling the same. A `finally` that clears loading must also check `active` (or the counter).
- [ ] **Step 2 (browser check):**
  1. In the browser pane, use JavaScript to delay `/suitability/rankings?analysis_type=commercial` (wrap `window.fetch` to add 1.5 s for that URL).
  2. On Suitability, click Commercial, then Residential straight away.
  3. After 2 s the page shows Residential rankings and the Residential average.
- [ ] **Step 3:** Commit when the user asks: `fix: ignore stale responses when switching land use, barangay or tab`.

### Task 6: Verify the whole change

- [ ] `vendor/bin/pint --dirty --format agent`, then `php artisan test --compact` (all pass) and `npm run build` (builds).
- [ ] Browser: Reports generate a PDF (staff), Map, Dashboard and Suitability load with no console errors, and the Task 4 and Task 5 checks pass.
- [ ] Code review of the branch diff (superpowers:requesting-code-review).
- [ ] Graphify incremental update, then recheck that `ReportController` is still reached only through the role-gated route group.
