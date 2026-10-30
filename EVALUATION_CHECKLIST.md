# EventSync evaluation checklist

Reviewed against the two-page EventSync Hackathon Problem Statement, dated 30 October 2026.

## Requirement coverage

| Requirement | Current implementation | Evidence |
| --- | --- | --- |
| Multiple clients and complete event requests | Client, title, date, start/end, attendees, preferred venue, projector/audio/staff quantities in single, bulk and recurring flows | RequestFields, API adapter, HTTP integration test |
| Official initial dataset | A1 60, A2 150; B1 100, B2 200; C1 80, C2 250. Venue resource pools match the PDF exactly | shared/scheduling.mjs; catalogue regression test |
| Smallest feasible hall, preferred venue first | Sort by preferred venue, capacity, venue ID, then hall ID; evaluate all constraints before selecting | allocate(); preferred-hall and deterministic-fallback tests |
| Full protected interval inside 08:00–22:00 | Reserve start minus 30 minutes and end plus 30 minutes; permit event start at 08:30 and finish at 21:30 | validate(); buffered-boundary tests |
| Venue-local equipment and staff limits | Sweep resource changes over time separately for projectors, audio and staff at each candidate venue | allocate(); resource-exhaustion and interior-peak tests |
| Confirmation only after all constraints pass | SQLite transaction rechecks current state before writing; preview does not confirm | book(), preview(); stale-confirmation regression test |
| Cancellation releases allocations | Keep cancelled row; allocation uses only confirmed rows | cancel(); cancellation/API tests |
| Rescheduling rechecks constraints and preserves original on failure | Exclude the booking's own allocation during checks; update only after a feasible decision | reschedule(); failed-reschedule equality test |
| Decision visibility | Booking register shows client, actual hall, resource quantities, status, rejected-request reasons and change history | Bookings component; API integration tests |
| Database persistence | SQLite clients, venues, halls, bookings and audit tables; restart persistence test | createStore(); reopen-database test |
| Useful innovation | Atomic/feasible-only bulk booking, recurring events, month-end clamping and resource analytics | Batch/series tests; recurrence tests |

Code and automated coverage support these requirements. A complete manual UI acceptance run is still needed before the demonstration; automated tests are not proof that every browser interaction has been exercised.

## Demonstration: prepare this sequence

Use an empty date, three distinct client names and a maximum estimate high enough to avoid an unintended budget rejection. Sample timings below are event times; resource reservations include both buffers.

1. Conference: preferred A, 120 attendees, 10:00–13:00, 1 projector, 0 audio, 3 staff. Expect A2; protected interval 09:30–13:30.
2. Workshop: preferred A, 50 attendees, 11:00–14:00, 1 projector, 0 audio, 2 staff. Expect A1; protected interval 10:30–14:30. Combined peak is 2 projectors and 5 staff, within A's limits.
3. Product launch: preferred A, 100 attendees, 13:15–15:00, 1 projector, 0 audio, 2 staff. A1 is too small and A2's protected interval conflicts. Expect fallback B1 if B is otherwise free. Its setup starts at 12:45, before A2's cleanup ends.
4. Attempt an impossible reschedule to 251 attendees. Show the rejection explanation and the unchanged original booking.
5. Cancel one confirmed booking. Show its retained Cancelled status and that its hall/resources can be allocated again.
6. Submit an atomic batch with a feasible request and a 251-attendee request. Show that neither is saved. Repeat with feasible-only mode and show the confirmed and rejected outcomes.
7. Preview a monthly series starting 31 January 2027. Expect 31 January, 28 February and 31 March. Explain why adding a fixed 30 days is incorrect.
8. Refresh and restart the normal SQLite-backed backend. Show that bookings and audit history remain. Do not use an in-memory test server for the final persistence demonstration.

Also check arrow visibility and keyboard focus, heading/description spacing, client validation, both resource types together, schedule date navigation, cancellation totals and rejected reasons in the actual browser used for evaluation.

## Explain the design to judges

- **Data structures:** venue/hall arrays, a Map of time-to-resource deltas, and relational SQLite tables linked by IDs. Booking date/status/venue has an index.
- **Time intervals:** two protected intervals conflict when each starts before the other ends. Equal endpoints are allowed because one interval has finished when the next begins.
- **Hall selection:** prefer the requested venue, then the smallest feasible capacity; break equal choices consistently with venue/hall IDs. Do not pick a hall based on seating alone.
- **Resource sweep:** add quantities at reservation start and subtract at reservation end. Process equal-time deltas together and find the peak. Summing all events that intersect a long request would incorrectly reject some feasible schedules.
- **Complexity:** with H candidate halls, R resource types and B relevant bookings, the current straightforward allocator is approximately O(H × R × B log B). H is 6 and R is 3 for this dataset. The prototype currently loads all bookings before filtering; date/status queries would be a sensible scaling improvement.
- **Reliability:** BEGIN IMMEDIATE serializes competing SQLite writes around validation and persistence. A failed reschedule does not release the original reservation. Stale confirmation cannot silently allocate another hall.
- **Innovation:** atomic batches prevent partially booked programmes; feasible-only batches preserve available dates; recurrence avoids repetitive entry. These solve concrete organizer problems.
- **Scope:** authentication, payments, external services and cloud hosting are not required by the statement. Prices, photos and locations are illustrative additions; official capacities/resources are authoritative.

## Rubric readiness

| Criterion | Marks | What to prepare |
| --- | ---: | --- |
| Problem understanding and requirements analysis | 15 | Walk through the requirement table and the PDF sample |
| Algorithm design and problem-solving | 20 | Explain ordering, protected intervals, sweep calculation and tie-breaking |
| Technical implementation and code quality | 30 | Show shared scheduling rules, SQLite transactions, tests, validation and error handling |
| Project demonstration | 15 | Rehearse the above sequence on a clean date with a persistent database |
| Responses to judges' questions | 20 | Each team member should explain resource peaks, failed-reschedule safety, persistence and batch modes |

The implementation addresses the mandatory functionality and includes useful innovation. A score cannot be guaranteed from code alone: demonstration and judges' questions account for 35 marks.

## Remaining submission checks

- Complete the manual browser acceptance sequence. Automated verification does not cover every rendered interaction or layout.
- Record the original source, creator and usage licence for each venue photograph, or replace it with an asset your team owns or is permitted to use. Those records are currently missing; filenames alone do not establish permission.
- Run the backend against its normal database for the final demo. Keep the frontend on the documented origin so the API proxy/origin settings agree.
- Keep both frontend and backend with the shared directory when submitting the project. Explain that old TrustCarbon files are reference material and are not part of the active booking app.
