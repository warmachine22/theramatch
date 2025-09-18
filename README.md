# TheraMatch — Therapist Management System (Vanilla JS, Modular TMS Namespace)

TheraMatch is a browser-based staffing assistant for home-based therapy. It helps coordinators:
- Manage therapists and their caseloads
- Capture referral details and preferred availability
- Visualize weekly schedules (15/30/60 minute display increments)
- Shortlist eligible therapists for a case based on borough, hours, availability, and distance
- Validate addresses with OpenStreetMap Nominatim and compute distances

This build is 100% client-side (no backend), persists to localStorage, and exports/imports JSON. The codebase is modularized under a single TMS namespace to keep logic isolated by domain, while app.js orchestrates initialization and cross-module wiring.

---

## Table of Contents

1. Quick Start
2. Architecture Overview (TMS Modules)
3. Folder Structure
4. Public APIs and Events (for AI + Humans)
5. Data Model and Persistence
6. Search/Shortlist Algorithm
7. Scheduling and Rendering
8. Geocoding and Distance Rules
9. Coding Standards and Contribution Guide
10. Typical Workflows
11. Future Architecture (DB/API) — Roadmap
12. Testing/QA Notes
13. Operational Notes
14. License & Credits

---

## 1) Quick Start

- Clone the repo
- Open index.html in a modern browser (no build required)
- Data persists under localStorage key tms_state

Utilities:
- Export: Click “Export Data” (Manage Therapists tab) to download JSON
- Import: Use the file picker to load JSON and refresh UI

LocalStorage flags:
- tms_seed_tag — prevents repeated data seed
- tms_migration_tag — tracks one-time migrations
- tms_geo_cache_v1 — OSM Nominatim geocode cache

To re-seed or re-run a one-time migration, clear relevant keys in DevTools → Application → Local Storage.

---

## 2) Architecture Overview (TMS Modules)

The app is organized into cohesive modules under the TMS namespace. app.js is intentionally slim; it initializes modules, wires tabs, and handles simple cross-module coordination.

High-level:
- app.js
  - Orchestrator only (tabs, bootstrapping, module init)
  - Listens for module events and routes between tabs (e.g., tms:viewSchedule)
  - Does not own feature logic
- TMS.State/Store (src/js/state/store.js, src/js/state/seedQueens.js)
  - State and persistence (therapists/referrals)
  - Seeding/migrations (one-time)
- TMS.UI (src/js/state/uiController.js)
  - Export/Import handlers, triggers full UI refresh/reset after import
- TMS.Therapists (src/js/therapists/therapistsController.js)
  - Therapist list, inline edit, borough filters, add/save therapist
  - Emits tms:viewSchedule and tms:therapistsUpdated
- TMS.Edit (src/js/edit/editController.js)
  - Edit Booking: grid interactions, case rendering, referral-assign selection
  - Public API for loading a therapist and re-rendering the grid
- TMS.Search (src/js/search/searchController.js and searchLegend.js)
  - Search tab: availability selection (blue tiles), shortlist mechanics (delegated parts), overlays for therapist case colors, block totals, and break overlay
  - Search legend with distance and hours for selected therapist
- TMS.Referrals (src/js/referrals/referralsController.js)
  - Referrals list and inline “Add New Referral” creation
  - Datalist builder and assign options builder
  - Hook to push a referral’s preferred availability into Search

UI helpers:
- TMS.Grid (src/js/ui/scheduleGrid.js): builds schedule grid and wires provided handlers
- TMS.Render (src/js/ui/scheduleRender.js): renders single/combined case overlays, badges, and legends

Utilities:
- TMS.Time (src/js/utils/time.js): time/slot helpers (15-minute resolution)
- TMS.ScheduleUtils (src/js/utils/schedule.js): compute busy/break sets and schedule helpers
- TMS.Geo (src/js/utils/geo.js): OSM Nominatim geocoder + cache + haversine
- TMS.String (src/js/utils/string.js): slugify, etc.

Script load order (index.html):
1) utils/time.js  
2) state/store.js  
3) state/seedQueens.js  
4) ui/scheduleGrid.js  
5) ui/scheduleRender.js  
6) utils/geo.js  
7) utils/schedule.js  
8) search/searchLegend.js  
9) search/searchController.js  
10) utils/string.js  
11) referrals/referralsController.js  
12) edit/editController.js  
13) therapists/therapistsController.js  
14) state/uiController.js  
15) app.js

---

## 3) Folder Structure

- index.html — App shell (tabs, forms, grids). Loads scripts in dependency order.
- style.css — Layout, grids, overlays, legends, and button styles
- data/
  - therapists.json (optional static sample; not required at runtime)
- src/js/
  - app.js (orchestrator: tabs + module init + light wiring)
  - utils/
    - time.js (time helpers, 15-min resolution)
    - schedule.js (ScheduleUtils: computeBreakSet, busy sets, etc.)
    - geo.js (Nominatim geocoding, cache, and haversine)
    - string.js (slugify and related)
  - ui/
    - scheduleGrid.js (grid builder/generator)
    - scheduleRender.js (render single/combined cases, badges, legends)
  - state/
    - store.js (state, persistence, export/import)
    - seedQueens.js (demo seed + migrations)
    - uiController.js (TMS.UI: export/import and post-import refresh)
  - therapists/
    - therapistsController.js (TMS.Therapists: list, edit, filters, add/save)
  - edit/
    - editController.js (TMS.Edit: edit grid interactions and case flows)
  - referrals/
    - referralsController.js (TMS.Referrals: list + inline create + builders)
  - search/
    - searchController.js (TMS.Search: availability selection, search overlays)
    - searchLegend.js (TMS.SearchLegend: legend for selected therapist)

---

## 4) Public APIs and Events (for AI + Humans)

Modules expose minimal public surfaces. Always consume via these APIs (do not reach into internals):

- TMS.Therapists
  - init()
  - refreshList()
  - populateTherapistSelectDropdown()
  - Events emitted:
    - tms:viewSchedule (detail: { therapistId })
    - tms:therapistsUpdated (after any change that affects data/state)

- TMS.Edit
  - init()
  - rerenderGrid()
  - loadTherapistSchedule(therapist)
  - getCurrentTherapist()

- TMS.Search
  - init() if needed (currently minimal no-op; wired by app.js)
  - setSelectedSlots(slotIds[]) — Set blue selection for Search grid
  - getSelectedSlots(): string[] — Read blue selection (15-min slotIds)
  - forEachSelected(fn) — Iterate user-selected 15-min slotIds
  - handleSearchMouseDown/Move/Up/Click — Passed to TMS.Grid for search grid
  - clearTherapistBusyOverlay(), clearSearchCaseOverlay()
  - overlayTherapistCaseColorsOnSearchGrid(t)
  - overlayTherapistBlockTotalsOnSearchGrid(t)
  - overlayTherapistBreaksOnSearchGrid(t)
  - buildSearchTherapistOptions() — Refresh therapist dropdown from filters
  - getActiveSearchBoroughs() — Read borough filter group

- TMS.Referrals
  - init()
  - renderList()
  - buildChildDatalist()
  - buildAssignOptions()
  - addNewReferralInline()
  - cleanupDraft()
  - setLoadToSearchHook(fn(ref)) — Allow Search to load a referral’s preferred availability

- TMS.UI
  - init() — Wires Export/Import; upon import, refreshes all modules and resets Edit UI

- TMS.Store
  - initState(), saveState(), exportJSON(), importJSON(parsed)
  - getTherapists(), setTherapists(updater)
  - getReferrals(), addReferral(ref), updateReferral(id, patch), deleteReferral(id)
  - findReferral(id), findReferralByChildId(childId)
  - Hydrates totals and enforces unique childId constraints

Events (global):
- tms:viewSchedule — Route from list to Edit Booking (app.js consumes, calls TMS.Edit.loadTherapistSchedule)
- tms:therapistsUpdated — Signals app + modules to refresh caches/UI post changes

Invariants (critical for agents and devs):
- 15-minute resolution for schedule data (slotId = "day-HH:MM")
- Display increments only affect grid painting, not data resolution
- BreakSet computation applies after each contiguous run; used both for yellow overlay and availability math
- Distance filter is strict when enabled (therapist is excluded if any case is too far or lacks coords)

---

## 5) Data Model and Persistence

Persisted in localStorage under tms_state.

Therapist
- id, firstName, lastName, phone, email
- requiredHours (weekly target)
- totalHours (computed/hydrated upon set)
- boroughPrefs: string[]
- cases: Case[]

Case
- id, name, patientId
- address fields: crossStreets, address, city, state, zip
- lat, lon (set via geocoding on save)
- schedule: array of { slotId, caseId, caseName, colorIndex }
- colorIndex: determines case color in overlays

Referral
- id, childName, childId
- totalReferredHours, maxDesiredPerDay, status
- address fields: crossStreets, city, state, zip
- lat, lon (set on save)
- preferredAvailability: string[] of 15-min slotIds

Export/Import JSON shape:
{
  "therapists": Therapist[],
  "referrals": Referral[]
}

---

## 6) Search/Shortlist Algorithm

Inputs:
- Borough filter (checkboxes)
- Required Hours (Search-level, optional)
- Travel/Break Time (minutes)
- Max miles (distance radius, optional)
- Total Referred Hours (child)
- User’s blue availability selection (15-min slots)
- Child’s address (geocoded)

Steps:
1) Borough filter: require overlap with therapist.boroughPrefs if any selected
2) Hours threshold:
   - If empty: t.totalHours < t.requiredHours
   - Else: t.totalHours <= providedRequiredHours
3) Availability: remaining = BlueSelection − (BusySet ∪ BreakSet)
   - BusySet: union of all case schedule 15-min slots
   - BreakSet: computed via TMS.ScheduleUtils.computeBreakSet(therapist, breakMins, inc)
   - Require remainingHours ≥ child.totalReferredHours
4) Distance (if maxMiles > 0): Strict mode
   - Geocode child (if not present)
   - Ensure each case has lat/lon (geocode once if missing)
   - Exclude therapist if any case is too far or fails geocode

Output:
- Therapist dropdown updated with shortlist; if previous selection still valid, keep selected and repaint overlays/legend; otherwise clear.

---

## 7) Scheduling and Rendering

Grids:
- TMS.Grid.generateTimeSlots(el, inc, handlers) builds the time grid and wires handlers
- Edit Booking: TMS.Edit wires handlers for selection/drag to add/remove booked slots
- Search: TMS.Search wires handlers to toggle blue availability selection, with partial visuals

Rendering:
- TMS.Render.renderSingleCase(), renderCombined() — Single/multi-case overlays
- Partial coverage shows top/bottom alignment depending on contiguous coverage
- Hours badges are placed at the last full (or last) display cell for a contiguous run
- Break overlay (yellow) is painted per display cell after runs, aligned top/bottom as needed

---

## 8) Geocoding and Distance Rules

- Geocoder: OSM Nominatim (search endpoint)
  - TMS.Geo.geocodeAddressCached({ address, crossStreets, city, state, zip })
  - Caches results in localStorage (tms_geo_cache_v1)
  - Includes contact email for TOS compliance; throttled to ~1 request/1100ms
- Save-time validation:
  - Referrals/new Cases must geocode; saves lat/lon on the record
  - If validation fails, save is blocked with a message
- Distance:
  - Haversine miles; strict mode on Search excludes therapists that lack coords or exceed the max miles threshold

---

## 9) Coding Standards and Contribution Guide

- Keep files ≤ ~300 lines where feasible; extract helpers/modules as needed
- Small, pure functions where possible; document side effects/state changes
- Do not bypass Store; use TMS.Store APIs to ensure totals and persistence are consistent
- Prefer module public APIs; avoid reaching into internals
- Event-driven coordination (e.g., tms:therapistsUpdated) over direct cross-module mutations
- Commit message convention:
  - feat(area): … | fix(area): … | refactor(area): … | chore/docs/test: …

For AI agents:
- Respect 15-min slot resolution (never mix resolutions in data)
- Use TMS.Edit and TMS.Search public APIs for grid interactions
- If adding new modules, expose a minimal API and wire them in index.html before app.js
- If you must mutate therapist/referral arrays, always do it through TMS.Store.setTherapists / addReferral / updateReferral, etc.
- Re-render via controller APIs (e.g., TMS.Edit.rerenderGrid) rather than directly manipulating DOM without the controllers

---

## 10) Typical Workflows

- Add Therapist:
  - Manage Therapists → “Add New Therapist” → Save → List refreshes → “View Schedule” emits tms:viewSchedule → app routes to Edit Booking
- Edit Booking:
  - Select therapist → view schedule
  - Switch case in dropdown or “Add New Case” (validated via geocoding)
  - Drag/select to add/remove 15-min booked slots, saved via Store
- Referrals:
  - Add/edit referrals inline (validated via geocoding)
  - Preferred availability via mini-grid (blue selection, 15-min)
  - Load referral into Search using datalist; Search form gets hours/address
- Search:
  - Enter blue availability for child, filters, and optional distance
  - Click Search → shortlist → select therapist → overlays show case colors, break overlay, and per-case distance

---

## 11) Future Architecture (DB/API) — Roadmap

Goals:
- Multi-user auth and role-based permissions
- Durable store and geospatial search
- CI/CD and infra with proper SLAs

Suggested stack:
- DB: PostgreSQL + PostGIS, ORM: Prisma/Drizzle, API: NestJS
- Auth: JWT or provider (e.g., Auth0)
- Jobs: BullMQ/Redis for geocoding queues
- Cache: Redis for geocode and search
- Infra: Docker, GitHub Actions, Terraform

Outline tables and REST endpoints similar to prior designs (omitted here for brevity; see earlier README versions).

Migration plan:
- Use Export JSON, transform and ingest
- Recompute totals and ensure constraints (unique childId, etc.)

---

## 12) Testing/QA Notes

- Unit: utils/time (slot math), Geo (haversine + cache), ScheduleUtils (breakSet)
- Integration: shortlist behavior across borough/hours/availability/distance
- E2E: add therapist, add case, add referral, run search, assign referral
- Data: export/import round trips

Add CI with unit/integration coverage when moving server-side.

---

## 13) Operational Notes

- Respect OSM Nominatim TOS (we throttle and include contact)
- Privacy: addresses & contacts are PII — consider encryption & access controls if adding a backend
- Retries/backoff for geocoding; consider job queues in server builds

---

## 14) License & Credits

- License: MIT (or your organization’s policy)
- Geocoding: OpenStreetMap Nominatim
- © 2025 AEES (or your organization) for UI/UX and logic

---

## Appendix A: Script Entry Points and Wiring

- app.js:
  - init: TMS.Referrals.init(), TMS.Therapists.init(), TMS.UI.init(), TMS.Edit.init()
  - buildSearchTherapistOptions(), TMS.Search handlers bound to Search grid
  - listens for tms:viewSchedule to switch tabs and load therapist into Edit
  - listens for tms:therapistsUpdated to refresh local cache

## Appendix B: Extending the System

Adding a new feature controller (example: TMS.Reports)
1) Create src/js/reports/reportsController.js
2) Define minimal API: init(), render(), refresh()
3) Wire script in index.html before app.js
4) Add any events it needs to emit (e.g., tms:reportsUpdated)
5) app.js calls TMS.Reports.init() during DOMContentLoaded
6) Keep file < 300 lines; move helpers to utils/ if needed
