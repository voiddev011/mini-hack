# EventSync

EventSync schedules client events across venues A, B and C, allocates the smallest feasible hall, and checks venue equipment and staff throughout setup, the event and cleanup.

## Run locally

Requires Node.js 22.13 or later and npm. No external accounts or services are needed.

In one terminal, from this project directory:

```powershell
cd backend
npm start
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The frontend proxies /api requests to http://127.0.0.1:3000.
The backend creates backend/data/eventsync.sqlite on first launch. Existing database bookings are retained.

For the production frontend preview, run npm run build and npm run preview in frontend, with the backend still running. Open http://127.0.0.1:4173. A deployed frontend needs its host to proxy /api to the backend.

## Booking workflow

- Find a Venue shows all six official halls with photos and capacities. Search by location, date/time, guest count and budget; the optional filters start minimized. Halls that cannot fit the current request or schedule remain visible with booking disabled.
- An explicitly selected hall is checked exactly; the system will not silently move a booking to another hall. Requests without a hall selection still use the smallest feasible hall.
- The floating chat-style assistant compares guest count, equipment, date/time, availability and budget, then suggests one best-value hall and other feasible options. Choosing an option opens the normal final confirmation.
- Review the hall and estimate before confirming. If a location is unavailable, another venue may be proposed for requests without an explicit hall selection.
- Each event reserves 30 minutes before and after. Event times must fall within 08:30 to 21:30 so the protected interval stays inside 08:00 to 22:00.
- Every booking is saved in SQLite, including rejected requests. Browser-only bookings from the earlier prototype are not imported because their venues and capacities do not match the official dataset.
- Bookings shows clients, actual halls, equipment quantities, status, conflict reasons and the change log.
- Reschedule rechecks all constraints. A failed reschedule preserves the original confirmed row. Cancellation retains the record and releases allocations.
- Bulk booking supports atomic and feasible-only submission. Recurring events support daily, weekly, fortnightly and monthly intervals; month-end occurrences are clamped without shifting future months.
- Schedule shows per-venue peak equipment/staff usage, protected intervals and relative date navigation.
- All views load database state on startup, after writes, when the window regains focus, and through Refresh bookings. Final confirmation always revalidates in a SQLite transaction.

Venue locations, prices and photographs are illustrative additions. Official hall capacities and resource limits are shared by the frontend and backend. Reviews are user-submitted, unverified, and stored only in this browser; booking data is stored in SQLite.

## Verification

```powershell
cd backend
npm test
cd ../frontend
npm test
npm run lint
npm run build
```

Tests cover allocation, the PDF sample, buffered boundaries, resource peaks, database persistence, API origins, mixed single/series workflows, cancellation, rescheduling, changed availability, client/resource conversion, month ends and booking statuses.

## Structure

- shared/scheduling.mjs: official venue data, validation, allocation and recurrence algorithms.
- shared/pricing.mjs and shared/catalogue.mjs: illustrative catalogue and non-stacking estimates.
- backend/engine.mjs: SQLite persistence, transactions and audit history.
- backend/server.mjs: HTTP API and the original compact interface.
- frontend/src/pages/EventSync.jsx: React booking workspace.
- frontend/src/eventSync/: API adapter, recommendations, dates and analytics.

The backend accepts its own origin and the local Vite origins on ports 5173 and 4173. Override the comma-separated ALLOWED_ORIGINS setting when using another frontend origin. If changing the backend PORT, update the Vite proxy target too. The development frontend uses a fixed port to keep origin validation predictable.

The frontend contains only the active EventSync app and its shared error boundary. It does not initialize external authentication or require third-party credentials.
