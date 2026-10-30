# Project Guide: EventSync

This guide explains what is in the repository, which application actually runs,
how a booking moves through the system, and where the important functions live.
It is intended both as a code-reading guide and as a walkthrough for explaining
the project to someone else.

> **In one sentence:** EventSync is a venue-booking application whose React UI
> asks a Node.js service to reserve one of six halls; a shared allocator checks
> capacity, schedule buffers, budget, and venue-wide equipment before SQLite
> saves the result.

## 1. Quick project explanation

When a user searches for a venue, the browser gathers the event details and
shows the six official halls. The frontend can estimate which halls appear to
fit, but it does not make the final booking decision. When the user chooses a
hall, the frontend sends the request to the backend for a preview. The backend
validates it and runs the shared allocator against confirmed bookings. If the
preview succeeds, the user confirms; the backend runs the allocation again
inside a database transaction and saves the booking in SQLite.

The project has three important layers:

1. **Frontend:** React pages and forms used by the organizer.
2. **Backend:** HTTP API and SQLite persistence for bookings.
3. **Shared domain logic:** the official venue data, validation, pricing, and
   allocation rules used by both sides.

The root `README.md` gives the short setup instructions. This guide gives the
longer explanation.

## 2. Application entry point

The current React entry point renders **EventSync** directly:

- [`frontend/index.html`](./frontend/index.html) loads the React entry module.
- [`frontend/src/main.jsx`](./frontend/src/main.jsx) mounts the React tree.
- [`frontend/src/App.jsx`](./frontend/src/App.jsx) renders the EventSync app and
  imports its stylesheet stack.
- [`frontend/src/pages/EventSync.jsx`](./frontend/src/pages/EventSync.jsx)
  contains the EventSync workspace and its screens.

The backend also includes `backend/public/index.html`, `backend/public/app.js`,
and `backend/public/styles.css`, a compact EventSync UI served directly by the
backend. The regular local workflow uses the React/Vite frontend instead.

## 3. Repository map

| Location | Responsibility |
| --- | --- |
| `frontend/src/pages/EventSync.jsx` | Landing page, venue finder, booking workflow, assistant, schedule, bookings, recurring/bulk booking, and reviews |
| `frontend/src/eventSync/engine.js` | Frontend-side recommendation, review, date, and analytics helpers |
| `frontend/src/eventSync/backendApi.js` | HTTP helper functions and conversion between UI and API booking shapes |
| `frontend/src/styles/eventsync*.css` | EventSync layout, page, responsive, recommendation, and workflow styles |
| `backend/server.mjs` | HTTP routes, request parsing, origin checks, and server startup |
| `backend/engine.mjs` | SQLite schema, transactions, booking operations, and audit history |
| `shared/scheduling.mjs` | Canonical locations/halls, validation, allocation, alternatives, and recurrence rules |
| `shared/pricing.mjs` | Catalogue prices and discount calculations |
| `shared/catalogue.mjs` | Display-friendly hall records derived from the canonical venue list |
| `backend/test/` | Backend allocation, persistence, and HTTP tests |
| `frontend/src/eventSync/engine.test.js` | Frontend rule, conversion, recommendation, and analytics tests |
| `frontend/public/assets/`, `backend/assets/` | EventSync logo and venue image assets |
| `README.md` | Current EventSync setup and workflow summary |
| `EVALUATION_CHECKLIST.md` | Demonstration and project acceptance checklist |
| `PROJECT_GUIDE.md` | Detailed architecture, data flow, and code walkthrough |

## 4. Start the project locally

Use Node.js 22.13 or newer. Open two PowerShell terminals in the repository.

**Terminal 1 — backend API**

```powershell
cd C:\Users\Jainam\Desktop\Mini-project-hack\backend
npm start
```

By default, the backend listens at `http://127.0.0.1:3000`. It creates
`backend/data/eventsync.sqlite` when needed. The SQLite database retains
bookings between restarts.

**Terminal 2 — React frontend**

```powershell
cd C:\Users\Jainam\Desktop\Mini-project-hack\frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Run `npm ci` for a fresh checkout or whenever
dependencies need restoring. Vite proxies `/api` requests to the backend.

**Production build and local preview**

```powershell
cd C:\Users\Jainam\Desktop\Mini-project-hack\frontend
npm run build
npm run preview
```

The preview uses port 4173 and also proxies `/api` to port 3000. Keep the
backend running while using either frontend.

### Package scripts

- Backend: `npm start` starts the API; `npm test` runs Node's built-in test
  runner.
- Frontend: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`,
  and `npm test` run Vite, Oxlint, and Vitest tasks.
The Vite port/proxy settings are in
[`frontend/vite.config.js`](./frontend/vite.config.js). Backend startup and
allowed origins are in [`backend/server.mjs`](./backend/server.mjs).

## 5. End-to-end data flow

```text
Organizer
   │ enters location, date/time, guests, budget and equipment
   ▼
React EventSync screen
   │ local recommendation helpers estimate which halls fit
   │ POST /api/bookings/preview
   ▼
Vite proxy (during local development)
   │ forwards /api to 127.0.0.1:3000
   ▼
Node HTTP server: backend/server.mjs
   │ parses and validates the HTTP request shape
   ▼
SQLite booking engine: backend/engine.mjs
   │ validates domain rules and reads confirmed bookings
   ▼
Shared allocator: shared/scheduling.mjs
   │ checks hall, capacity, buffers, budget and shared resources
   ▼
Preview decision ── successful preview opens confirmation in React
   │
   │ user confirms; POST /api/bookings with expectedHall
   ▼
Backend repeats allocation inside a write transaction
   │
   ├── feasible: save confirmed booking and audit event
   └── not feasible: do not silently switch the confirmed hall
   ▼
React refreshes GET /api/state and updates the screens
```

**Important distinction:** a result in the search page or the assistant is a
recommendation, not a reservation. The backend is authoritative. Final
confirmation repeats the checks because another booking could have changed
availability after the preview.

## 6. Frontend walkthrough

### 6.1 Bootstrapping and application state

`frontend/src/main.jsx` mounts the app into the HTML root, using React
`StrictMode` and the error boundary. `frontend/src/App.jsx` renders `EventSync`
and imports the stylesheet files. The app uses a `tab` state rather than a URL
router for its primary EventSync sections. The initial tab is the landing page;
the sidebar switches among the workspace sections.

The principal state and flow are in
[`EventSync.jsx`](./frontend/src/pages/EventSync.jsx#L80):

- `EventSync` owns the current tab, search form, bookings, reviews, notices,
  active modal, pending writes, and service connection status.
- `refresh` loads server state and maps backend bookings to UI bookings.
- `mutate` prevents overlapping writes, displays errors, and restores the
  submitting state after each operation.
- `refreshAfterWrite` refreshes the UI after changes without hiding a
  successful write if a follow-up read fails.
- `choose` sends a booking preview request and opens the confirmation modal
  only when the preview decision succeeds.
- `confirmBooking` submits the exact expected hall for a second authoritative
  check and save.
- `bookRecommended` sends a hall selected in the assistant through the same
  booking flow; the assistant does not directly create a booking.

### 6.2 Screens and user actions

The top-level screen components are in
[`EventSync.jsx`](./frontend/src/pages/EventSync.jsx):

- **Landing:** introduces the product and links to the venue finder, workspace,
  and feedback. The homepage logo links home.
- **Overview:** shows operational summary information and shortcuts into venue
  search and the schedule.
- **Find a Venue (`Discover`):** presents the event search fields, the
  initially minimized filters, and cards for the six official halls. Halls
  which do not fit the active request remain visible as unavailable instead of
  disappearing. The booking action is disabled for those halls.
- **Venue details:** displays a selected hall's details and estimate before
  handing an available hall to the normal booking preview.
- **Schedule:** shows day/venue allocations and resource usage; supports date
  navigation and cancellation.
- **Bookings:** lists stored booking records and supports search/status filters,
  cancellation, and rescheduling of eligible bookings.
- **Recurring Events and Bulk Booking:** collect repeated or multiple requests
  and submit them to the corresponding backend endpoints.
- **Reviews:** accepts and displays browser-local venue reviews.

`Discover` calculates current availability using the frontend recommendation
engine, then renders the complete official hall list and attaches an
`isAvailable` status. Its filters operate on category, capacity, estimate,
rating, and equipment. Its sorting options include match, price, and capacity.
Location, date/time, guests, budget, and equipment belong to the event request;
changing those values updates the result calculation.

### 6.3 Important frontend functions by line

| Function/component | Location | What it does |
| --- | --- | --- |
| `EventSync` | [`EventSync.jsx:80`](./frontend/src/pages/EventSync.jsx#L80) | Owns workspace state and renders the selected screen |
| `refresh` | [`EventSync.jsx:116`](./frontend/src/pages/EventSync.jsx#L116) | Loads backend state and updates bookings/connection status |
| `refreshAfterWrite` | [`EventSync.jsx:155`](./frontend/src/pages/EventSync.jsx#L155) | Refreshes after a successful write without masking that write's success |
| `mutate` | [`EventSync.jsx:161`](./frontend/src/pages/EventSync.jsx#L161) | Prevents overlapping writes and manages submission/error state |
| `choose` | [`EventSync.jsx:178`](./frontend/src/pages/EventSync.jsx#L178) | Converts a selected hall into a preview request |
| `confirmBooking` | [`EventSync.jsx:206`](./frontend/src/pages/EventSync.jsx#L206) | Sends final confirmation with the expected hall |
| `bookRecommended` | [`EventSync.jsx:266`](./frontend/src/pages/EventSync.jsx#L266) | Hands an assistant pick into the normal booking flow |
| `Discover` | [`EventSync.jsx:1069`](./frontend/src/pages/EventSync.jsx#L1069) | Filters and displays the official hall list |
| `RecommendationAssistant` | [`EventSync.jsx:1526`](./frontend/src/pages/EventSync.jsx#L1526) | Collects event needs and presents ranked feasible halls |
| `toBackendRequest` | [`backendApi.js:8`](./frontend/src/eventSync/backendApi.js#L8) | Normalizes a UI request for the API |
| `toUiBooking` | [`backendApi.js:20`](./frontend/src/eventSync/backendApi.js#L20) | Adapts a stored booking for React views |
| `bookingApi` | [`backendApi.js:31`](./frontend/src/eventSync/backendApi.js#L31) | Performs the JSON HTTP request and reports API errors |
| `recommendation` | [`engine.js:74`](./frontend/src/eventSync/engine.js#L74) | Finds halls passing the shared allocator rules |
| `costOptimizedRecommendations` | [`engine.js:102`](./frontend/src/eventSync/engine.js#L102) | Sorts feasible halls by estimated cost and fit |

### 6.4 Booking request conversion and API calls

[`backendApi.js`](./frontend/src/eventSync/backendApi.js#L1) contains the
frontend/backend boundary:

- `toBackendRequest` trims names and converts numeric form values to numbers,
  preserving optional budget and explicit hall selection.
- `toUiBooking` adds UI-facing IDs and venue aliases and derives equipment
  labels from stored quantities.
- `bookingApi` sends JSON, applies a timeout, avoids cached state reads, parses
  API errors, and returns the decoded response.
- `decisionMessage` extracts allocation diagnostics for the UI.

The frontend loads authoritative state from `GET /api/state`. Relevant writes
include:

| User action | API request |
| --- | --- |
| Check/preview a normal booking | `POST /api/bookings/preview` |
| Confirm a booking | `POST /api/bookings` |
| Check availability separately | `POST /api/check` |
| Submit a batch | `POST /api/bookings/batch` |
| Submit a recurring series | `POST /api/bookings/series` |
| Cancel | `POST /api/bookings/:id/cancel` |
| Reschedule | `POST /api/bookings/:id/reschedule` |
| Refresh UI state | `GET /api/state` |

Exact route registration and dispatch are in
[`server.mjs`](./backend/server.mjs#L26).

### 6.5 Recommendation assistant

The floating assistant component is `RecommendationAssistant` in
[`EventSync.jsx`](./frontend/src/pages/EventSync.jsx#L1526). It collects an
organizer name, event name, location preference, attendance, date/time, budget,
and equipment quantities. On submission it shows:

1. A single lowest-estimated-cost feasible hall as the best-value pick.
2. Other feasible hall options, with their location, capacity, and estimate.
3. A booking action that passes the chosen exact hall into the regular preview
   and confirmation steps.

This is a deterministic rule-based recommendation rather than a trained ML
model. It uses the same canonical allocation constraints to avoid suggesting
an infeasible booking, then orders options by estimated price. A recommendation
does not bypass the backend recheck.

### 6.6 Reviews, bookings, and schedule data

Reviews are stored in browser `localStorage`, under the key
`eventsync.reviews.v2`. They are not written to SQLite and are not verified
against the booking database. `submitReview` validates the hall, whole-star
rating, text length, and duplicate reviewer/hall combination using
`validateReview`.

Bookings are stored in SQLite. On app startup and when the window regains
focus, `refresh` requests `/api/state`; after a write, `refreshAfterWrite`
updates the UI. Schedule utilization and booking status labels are calculated
by helper functions in
[`engine.js`](./frontend/src/eventSync/engine.js#L24).

## 7. Backend and API walkthrough

### 7.1 HTTP layer

[`backend/server.mjs`](./backend/server.mjs) creates the HTTP application and
maps URL/method pairs to booking-engine operations:

- `app(store)` constructs a server with an injected store. This makes HTTP
  behavior testable without sharing the production database.
- The server checks request origins, parses JSON bodies, and limits request
  size before dispatching API work.
- `GET /api/state` returns current booking state, venue information, and recent
  audit events.
- `POST /api/check` checks a request without confirming it.
- `POST /api/bookings/preview` previews a request. Failed/rejected preview
  outcomes can be recorded, but a successful preview is not a confirmed
  booking.
- `POST /api/bookings` creates one booking.
- Batch and series routes process multiple requests.
- Cancel and reschedule routes update an existing booking.
- Unknown routes and unsupported methods return explicit HTTP errors.

The default server binds to loopback (`127.0.0.1`) on port 3000. Origin
allowlisting is a browser-origin check, not user authentication; the prototype
does not implement login/access control for EventSync.

### 7.2 SQLite engine

[`backend/engine.mjs`](./backend/engine.mjs#L1) creates the database schema and
implements data operations:

- `createStore()` opens SQLite, configures it, creates/migrates tables, and
  returns the store API.
- Booking, hall, venue, client, and audit records are represented in SQLite.
- Write operations use explicit transactions. If an operation fails, the
  transaction is rolled back so partial changes are not left behind.
- Confirmed bookings consume a hall and venue resources. Rejected and
  cancelled records remain available for history but do not reserve the
  allocator's resources.
- Audit entries record important booking changes.
- Rescheduling checks availability with the current booking excluded. A failed
  reschedule preserves the original confirmed booking.
- Confirmation can compare `expectedHall` with the newly allocated result so a
  changed schedule does not silently move a user's explicit selection.

`bookMany` handles batches. Atomic mode saves none if an item cannot be
accepted; feasible-only mode can save feasible requests and record the
infeasible ones. `bookSeries` expands the repeated dates and delegates into the
batch workflow.

## 8. Shared venue data and booking rules

### 8.1 Canonical data

[`shared/scheduling.mjs`](./shared/scheduling.mjs#L1) is the authoritative
definition of three locations and two halls at each location:

| Location ID | Location | Hall | Capacity |
| --- | --- | --- | ---: |
| A | Atrium | A1 | 60 |
| A | Atrium | A2 | 150 |
| B | Boulevard | B1 | 100 |
| B | Boulevard | B2 | 200 |
| C | Crescent | C1 | 80 |
| C | Crescent | C2 | 250 |

The illustrative names, city/region labels, categories, and display images are
added by [`shared/catalogue.mjs`](./shared/catalogue.mjs#L1). That catalogue
does not create additional bookable halls. `shared/pricing.mjs` supplies the
illustrative hall prices and discounts.

### 8.2 Validation

`validate(input)` in [`scheduling.mjs`](./shared/scheduling.mjs#L39) checks
that:

- Client and event names are non-empty and within their length limits.
- The date is a real ISO calendar date.
- Start and end are valid same-day times, with the end later than the start.
- Attendance is a positive whole number; resources are nonnegative whole
  numbers.
- The venue exists and an explicitly selected hall belongs to that venue.
- An optional budget is a finite, nonnegative number.
- Event times fit the daily operating window once setup and cleanup are
  included.

### 8.3 Allocation

`allocate(request, bookings)` in
[`scheduling.mjs`](./shared/scheduling.mjs#L129) is the core booking decision.
It considers confirmed bookings on the same date whose protected intervals
overlap the new request.

Every event reserves **30 minutes before and after** the requested event time.
The allocator then checks:

1. The requested number of attendees fits the hall capacity.
2. The hall is not already reserved during the protected interval.
3. The estimated price fits the submitted budget, if present.
4. Projectors, audio systems, and staff do not exceed the **whole venue's**
   available quantity at any overlapping moment.

If no hall is explicitly selected, allocation prefers the requested location,
then a smaller suitable hall, with deterministic tie-breaks. If a hall is
explicitly selected, only that hall is considered; the backend does not
silently replace it with a different hall.

The resource calculation uses peak overlap, not the sum of every booking that
touches some portion of the interval. This matters when bookings occupy
different parts of a request's time.

### 8.4 Alternatives, dates, and prices

- `alternatives` in `scheduling.mjs` searches other locations and nearby times
  for feasible options.
- `seriesDates` expands daily, weekly, fortnightly, or monthly events. A
  monthly date clamps to the last day of a shorter month, rather than shifting
  later occurrences.
- `priceFor` in `shared/pricing.mjs` applies the configured illustrative
  discounts. These values are estimates, not external market quotes.
- The current allocator calls the pricing helper without a multi-occurrence
  count, so its budget check uses single-event pricing; the multi-event
  discount should not be assumed to lower the server-side series budget check.

## 9. Assets and configuration

The EventSync frontend uses local venue photos and logo assets in
`frontend/public/assets/`; the backend includes its own venue photos in
`backend/assets/`. The number of image files does not determine the number of
bookable halls. Hall IDs and capacities come from `shared/scheduling.mjs`.

The React UI does not require external authentication or third-party service
credentials. The backend runs locally and stores booking data in SQLite.

## 10. Tests and what they prove

Run the current EventSync test suites:

```powershell
cd C:\Users\Jainam\Desktop\Mini-project-hack\backend
npm test

cd C:\Users\Jainam\Desktop\Mini-project-hack\frontend
npm test
npm run lint
npm run build
```

Backend tests in `backend/test/` cover allocator rules, protected intervals,
resource peaks, cancellation, rescheduling, rejection, SQLite persistence,
recurrence, batch behavior, and HTTP integration. Frontend tests in
`frontend/src/eventSync/engine.test.js` cover data conversion, catalogue
assumptions, reviews, recommendations, dates, and analytics.

These are automated unit/integration checks. They do not replace manually
opening the UI and checking the full visual interaction or a deployment
environment.

## 11. A short presentation script

> “EventSync helps organizers find and reserve a venue hall. The React
> frontend collects the event's location, date, time, attendance, budget, and
> equipment needs. It shows the six official halls and a rule-based
> recommendation. When the organizer chooses one, the frontend asks the Node
> backend for a preview. The backend validates the request and uses the shared
> scheduler to check capacity, a 30-minute setup/cleanup buffer, hall
> conflicts, and shared equipment. If it is feasible, the organizer confirms.
> The backend repeats the check inside a SQLite transaction and saves the
> booking. This second check protects against availability changing between
> search and confirmation. Bookings persist in SQLite; reviews are currently
> only stored in that browser.”

## 12. Key files to open during a code walkthrough

Recommended order:

1. [`frontend/src/main.jsx`](./frontend/src/main.jsx) — how React starts.
2. [`frontend/src/App.jsx`](./frontend/src/App.jsx) — which app is mounted.
3. [`frontend/src/pages/EventSync.jsx`](./frontend/src/pages/EventSync.jsx#L80) —
   shared UI state and booking flow.
4. [`frontend/src/eventSync/backendApi.js`](./frontend/src/eventSync/backendApi.js#L1) —
   browser-to-API conversion and requests.
5. [`backend/server.mjs`](./backend/server.mjs#L26) — HTTP routes.
6. [`backend/engine.mjs`](./backend/engine.mjs#L1) — persistence and booking
   operations.
7. [`shared/scheduling.mjs`](./shared/scheduling.mjs#L1) — canonical data,
   validation, and allocation.
8. [`shared/pricing.mjs`](./shared/pricing.mjs#L1) — illustrative estimates.
9. [`frontend/src/eventSync/engine.test.js`](./frontend/src/eventSync/engine.test.js) —
   frontend rule tests.
10. [`backend/test/engine.test.mjs`](./backend/test/engine.test.mjs) and
    [`backend/test/integration.test.mjs`](./backend/test/integration.test.mjs) —
    backend behavior and API tests.
