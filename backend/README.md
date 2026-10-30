# EventSync booking service

Requires Node.js 22.13+. Run `npm start` here. The API listens on http://127.0.0.1:3000 and stores bookings in data/eventsync.sqlite. Run `npm test` for engine and HTTP integration tests.

Use the React workspace at http://127.0.0.1:5173 after starting it in ../frontend. See ../README.md for installation, demo flows and checks. The original compact interface is still served at port 3000 and shares the database.

Scheduling and pricing rules are in ../shared; keep this directory alongside backend and frontend. Operating hours include 30 minutes of setup and cleanup. Single bookings, batch bookings, recurring events, cancellations and reschedules use SQLite transactions. Confirmed, rejected and cancelled requests remain in the booking register.

No authentication, external accounts or cloud deployment is needed for this local prototype. Configure the comma-separated ALLOWED_ORIGINS setting if using a frontend origin other than the documented local Vite addresses.
