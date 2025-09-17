# TheraMatch — Therapist Management System (Vanilla JS)

TheraMatch is a browser-based staffing assistant for home-based therapy. It helps coordinators:
- Manage therapists and their caseloads
- Capture referral details and preferred availability
- Visualize weekly schedules (15/30/60 minute display increments)
- Shortlist eligible therapists for a case based on borough, hours, availability, and distance
- Validate addresses with OpenStreetMap Nominatim and compute distances

This build is 100% client-side (no backend), persists to `localStorage`, and exports/imports JSON. It’s structured to be upgradeable to a real database in future.

---

## Table of Contents

1. Overview
2. Quick Start
3. Architecture (Current)
4. Matching/Shortlist Algorithm
5. Mapping, Geocoding, and Distances
6. Scheduling & Calendar UX
7. Data Model (Current In-Memory)
8. Files and Directories
9. Future Architecture (Real Database + API)
10. Testing & QA
11. Operational Notes
12. Contributing & Code Style
13. License & Credits

---

## 1) Overview

TheraMatch provides a unified UI with four tabs:

- Add Therapist: Create and manage therapist records (name, contact, required hours, borough prefs).
- Edit Booking: View a therapist’s weekly schedule, edit case time blocks, and assign a referral to a therapist as a new case.
- Referrals: Add/edit referrals (child information, total hours, max/day, status, address), capture preferred availability (mini-grid).
- Search: Enter a case’s details (hours, address, preferred availability via blue tiles), then “Search” to shortlist eligible therapists. Select a therapist to visualize their cases (color overlays), break/travel time, and see per-case distance to the child.

Key highlights:
- Address validation at save-time (Referrals and new Cases) with OpenStreetMap Nominatim; lat/lon stored on the record.
- Shortlist filters by borough, hours threshold, schedule availability (with break-time), and distance radius.
- Visual schedule overlays (colors/gradients for multiple cases, partial fills, per-block hours badges).
- JSON export/import for backup and migration.

---

## 2) Quick Start

- Clone the repo
- Open `index.html` in a modern browser (no build required)
- Data persists under `localStorage` key `tms_state`

Utilities:
- Export: Click “Export Data” (Add Therapist tab) to download JSON
- Import: Click “Import Data” to load JSON

LocalStorage flags:
- `tms_seed_tag = "queens-v1"` — prevents re-seeding the Queens dataset
- `tms_migration_tag = "required-hours-25"` — ensures one-time migration of therapists’ `requiredHours = 25`
- `tms_geo_cache_v1` — cached geocodes (address -> lat/lon)

To re-seed or re-run a one-time migration, clear the relevant localStorage keys (Developer Tools -> Application -> Local Storage).

---

## 3) Architecture (Current)

This app uses a simple layered structure in vanilla JavaScript:

- State & Persistence (`src/js/state/store.js`)
  - Owns therapist and referral arrays
  - Saves/loads JSON to/from `localStorage`
  - Generates demo schedules for initial seed data
  - Exposes CRUD for referrals, and setters for therapists

- UI Grid Builder (`src/js/ui/scheduleGrid.js`)
  - Renders the time grid (rows = time, columns = days)
  - Wires event handlers passed from the controller

- UI Renderer/Painter (`src/js/ui/scheduleRender.js`)
  - Paints schedules onto the grid, handles partial coverage visuals
  - Provides combined gradient rendering for overlapping cases
  - Places hours badges and renders legends

- Controller (`src/js/app.js`)
  - Ties everything together
  - Initializes state and seeds demo data
  - Implements Search shortlist logic and geocoding
  - Validates addresses at save time (Referrals and new Cases)
  - Wires all UI events

- Utilities (`src/js/utils/time.js`)
  - Time manipulation helpers (HH:MM calc, block subslots in 15-minute increments)

Display increments are 15/30/60 minutes; underlying schedule resolution is always 15 minutes (`slotId` strings: `dayIndex-HH:MM`).

---

## 4) Matching/Shortlist Algorithm

Triggered on Search button:

Inputs:
- Borough filter (checkboxes)
- Required Hours (Search-level, optional)
- Travel/Break Time (minutes)
- Max miles (distance radius, optional)
- Total Referred Hours (child)
- User’s blue availability selection (15-minute slots)
- Child’s address (from referral loaded into Search or typed)

Rules to shortlist therapists:

1) Borough filter
- If any boroughs selected, include therapists whose `boroughPrefs` intersect the selection.

2) Hours threshold
- If Search “Required Hours” is empty: include therapists where `t.totalHours < t.requiredHours` (therapist’s own target).
- If Search “Required Hours” is provided (X): include therapists where `t.totalHours <= X`.

3) Availability (considering busy + travel/break)
- Build `busySet` = all 15-min slots from therapist’s cases
- Compute `breakSet` via `computeBreakSet(therapist, breakMins, inc)`:
  - For each contiguous run in a case’s schedule, allocate break subslots (in 15-min units) after the run, stopping at end-of-day or next conflict
- Remaining available = user’s blue selection − (busySet ∪ breakSet)
- If remaining hours (remaining slots / 4) ≥ child’s Total Referred Hours, pass

4) Distance (optional; if Max miles > 0)
- Ensure child lat/lon (prefer from referral; fallback geocoding Search form)
- Ensure each therapist case has lat/lon (one-time geocode + persist)
- Child must be within `maxMiles` of each case; if any case is too far or fails geocode, exclude (strict)

Result:
- Therapist dropdown is rebuilt with the shortlist (alphabetical). If previously selected therapist is still eligible, reselect and update overlays/legend; otherwise clear selection and visuals.

---

## 5) Mapping, Geocoding, and Distances

- Geocoding: OpenStreetMap Nominatim “search” endpoint
  - Function: `geocodeAddressCached({ address, crossStreets, city, state, zip })`
  - Caches results in `localStorage` under `tms_geo_cache_v1`
  - Throttles requests to ~1 per 1100ms
  - Includes contact: `email=techadmin@aees.us.com` as required by OSM Nominatim
- Save-time validation:
  - Referrals (inline edit + new entry): must geocode; lat/lon stored on referral
  - Add New Case (Edit Booking): must geocode; lat/lon stored on case
- Distance:
  - Haversine great-circle distance in miles
  - Search legend shows per-case distances (e.g., “3.2 mi”) beneath each case’s hours

Note: For legacy data lacking lat/lon, the system attempts a one-time geocode during Search; if unsuccessful, strict distance rule excludes the therapist.

---

## 6) Scheduling & Calendar UX

- Grid covers 6:00 AM to 12:00 AM, 7 days a week
- Display increments selectable (15/30/60). Underlying data is 15-min resolution
- Select/drag to toggle availability (Search) or booked time (Edit Booking)
- Partial block visuals show fractional coverage at display resolution
- Case rendering:
  - Single case painter (`renderSingleCase`) applies color and partial overlay based on coverage
  - Combined gradient (`renderCombinedGradient`) displays overlapping segments for multiple cases
- Hours badges:
  - For each contiguous run (per day), a badge shows total run hours (on the last full or last display cell)
- Travel/Break overlay:
  - Yellow overlay is painted based on `breakMins`, immediately following each contiguous run (until conflict/day-end)
  - Data equivalent set is computed by `computeBreakSet` and used in availability math

---

## 7) Data Model (Current In-Memory)

All persisted under `localStorage` key `tms_state`.

Therapist
- id, firstName, lastName, phone, email
- requiredHours (weekly target), totalHours (computed)
- boroughPrefs: string[] (e.g., “Queens”)
- cases: Case[]
- Example seed migration: one-time sets `requiredHours = 25` for all (tagged by `tms_migration_tag`)

Case
- id, name, patientId
- address fields: crossStreets, address, city, state, zip
- lat, lon (set at save-time via geocoding)
- schedule: array of { slotId, caseId, caseName, colorIndex } at 15-min resolution
- colorIndex: used for consistent case colors in overlays

Referral
- id, childName, childId
- totalReferredHours, maxDesiredPerDay, status (“referred” | “staffed”)
- address fields: crossStreets, city, state, zip
- lat, lon (set at save-time)
- preferredAvailability: array of 15-min `slotId`s (from mini-grid)

Export/Import
- JSON shape: `{ therapists: Therapist[], referrals: Referral[] }`
- Filename uses timestamp format from `Store.timestampedFilename()`

---

## 8) Files and Directories

- `index.html`
  - App shell, four tabs, form fields, schedule grids (Search + Edit Booking)
  - Loads scripts in dependency order
  - New fields: “Max miles” (Search), “Travel/Break Time (min)”
  - Search legend area shows each case’s hours and distance to child

- `style.css`
  - Global layout and typography
  - `.schedule-grid` time grid styling and header row
  - Classes for overlays: `.selected`, `.partial*`, `.case-color-*`, `.break*`, `.busy*`
  - Legend styles: `.legend-item`, `.legend-swatch`, `.legend-total`, `.borough-chips`, `.chip`
  - Buttons: `.btn`, variants `.btn-primary`, `.btn-outline`, `.btn-success`, `.btn-secondary`

- `src/js/utils/time.js`
  - `pad2(n)`, `subtractMinutes(timeStr, mins)`
  - `timeToDisplay('HH:MM', inc)`: snaps time to display cell
  - `getPrevDisplayTime(displayTime, inc)`: shift one display step
  - `blockSubslots15(displayTime, inc)`: enumerate underlying 15-min subslots for a display cell

- `src/js/ui/scheduleGrid.js`
  - `Grid.generateTimeSlots(gridEl, minutesPerSlot, handlers)` builds the grid and wires event callbacks

- `src/js/ui/scheduleRender.js`
  - `Render.clearGrid(gridEl)`
  - `Render.renderSingleCase(gridEl, case, inc)` with partial coverage and block badges
  - `Render.renderCombined` (exposed as gradient variant) paints multiple cases using CSS linear-gradients
  - `Render.renderLegend(legendEl, cases)` basic legend (used in Edit Booking). Search has its own legend to include distances

- `src/js/state/store.js`
  - Demo seed (therapist shells with generated schedules for seed)
  - `initState()`, `saveState()`, `loadStateIfAny()`, `hydrateTotals()`
  - `getTherapists()`, `setTherapists(updater)`: recomputes totals and persists
  - Export/Import: `exportJSON()`, `importJSON(obj)`, `timestampedFilename(base)`
  - Referrals API: `getReferrals()`, `addReferral(ref)`, `updateReferral(id, patch)`, `deleteReferral(id)`, `findReferral(id)`, `findReferralByChildId(childId)`
  - Enforces unique `childId` and updates timestamps

- `src/js/app.js`
  - Bootstraps tabs and seeds Queens dataset (one-time)
  - One-time migration to set all therapists `requiredHours = 25`
  - Search shortlist logic (borough, hours, availability with breakSet, distance with max miles)
  - `geocodeAddressCached` with caching and throttle; `haversineMiles`
  - Save-time validation for Referrals and new Cases (geocoding; store lat/lon)
  - Search legend: shows per-case distance and hours for selected therapist
  - Overlays on Search grid: case colors, block totals, break overlays
  - Edit Booking: view/edit case schedule, assign from referral, add new case (validated)

- `data/therapists.json` (optional static sample; not required by runtime)
- `script.js` (legacy/unused in current flow)

---

## 9) Future Architecture (Real Database + API)

Goals:
- Multi-user, authentication, role-based permissions
- Durable persistent store, audit logs, reliable address geocoding pipeline
- Fast search and geospatial filters

Suggested Stack:
- Database: PostgreSQL + PostGIS for geospatial
- ORM: Prisma or Drizzle
- API: NestJS (preferred), Fastify or Express
- Auth: JWT sessions or provider (Auth0 or similar)
- Jobs: BullMQ (Redis) for throttled geocoding and schedule recomputations
- Cache: Redis for geocode cache and search results
- Infra: Docker, CI/CD (GitHub Actions), IaC (Terraform)

Proposed Tables (first pass):
- `users (id, email, name, role, created_at, updated_at)`
- `therapists (id, first_name, last_name, phone, email, required_hours int, total_hours_cached int, created_at, updated_at)`
- `therapist_borough_prefs (therapist_id fk, borough text)`
- `cases (id, therapist_id fk, name, patient_id unique, address_line, cross_streets, city, state, zip, lat float8, lon float8, geom geography(Point, 4326), color_index int, created_at, updated_at)`
- `schedules (id, case_id fk, day_of_week int, slot_time time, unique (case_id, day_of_week, slot_time))`
- `referrals (id, child_name, child_id unique, total_hours numeric(5,2), max_per_day numeric(4,2), status, cross_streets, city, state, zip, lat float8, lon float8, geom geography(Point, 4326), preferred_availability jsonb, created_at, updated_at)`
- `geocode_cache (id, normalized_address unique, lat float8, lon float8, geom geography(Point, 4326), last_checked_at timestamp)`

Indexes:
- `cases(therapist_id)`, `schedules(case_id)`, `referrals(child_id unique)`, `geocode_cache(normalized_address unique)`
- PostGIS indexes on `geom` fields for fast radius queries

API Sketch (REST):
- `GET /therapists`, `POST /therapists`
- `GET /therapists/:id/cases`, `POST /therapists/:id/cases`
- `POST /cases/:id/schedules` (batch add/remove 15-min slots)
- `GET /referrals`, `POST /referrals`, `PATCH /referrals/:id`
- `POST /search/shortlist` with filters and blue tiles; returns sorted shortlist plus explanation

Migration Plan:
- Use current Export JSON
- Create a server script to map JSON into DB tables
- Recompute `total_hours_cached` per therapist
- Generate `color_index` for cases if missing

Future Optimization Strategy:
- A scoring model combining:
  - Borough match
  - Hours slack (`requiredHours - totalHours`)
  - Availability coverage score
  - Distance penalty
- Optionally min-cost/max-flow or ILP for batch optimization across multiple children and therapists

---

## 10) Testing & QA

- Unit: `utils/time.js` and `haversineMiles`, `geocodeAddressCached` (mock fetch)
- Integration: Shortlist rules with fixtures for borough, hours, availability, and distance
- E2E: Happy paths for saving referrals, adding cases, and running Search
- Data: Validate import/export round trips

As we add a backend, add CI with unit/integration tests and a staging environment.

---

## 11) Operational Notes

- OSM Nominatim: Respect TOS. We throttle and include a contact (`techadmin@aees.us.com`). For production you may:
  - Self-host Nominatim or use commercial providers (Mapbox, Google) with quotas and SLAs
- Privacy: Addresses and phone/emails are PII—handle with care when moving to a server
- Rate Limits and Retries: Use job queues for bulk geocoding and backoff on errors

---

## 12) Contributing & Code Style

- Keep individual source files under ~300 lines where feasible; refactor into helpers/modules as complexity grows.
- Prefer small, pure functions; document side effects and state mutations.
- Commit messages:
  - `feat(area): …`
  - `fix(area): …`
  - `chore/docs/refactor/test: …`

---

## 13) License & Credits

- License: MIT (or update to your preference).
- Mapping & geocoding by OpenStreetMap Nominatim.
- UI/UX and logic © 2025 AEES (or your organization).

---

## Appendix: Key Functions and Flows

- Shortlist:
  ```
  borough filter ->
  hours threshold ->
  remaining = blueSelection - (busySet ∪ breakSet) ->
  remainingHours ≥ childTotalHours ->
  distance check (if maxMiles) ->
  shortlist
  ```

- Address Validation:
  - On referral/case save -> geocode -> store lat/lon or block save with message.

- Visual Consistency after Search:
  - If previous selection still eligible: reselect and re-apply overlays and distance legend
  - Else: clear selection and visuals
