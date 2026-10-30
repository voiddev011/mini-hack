# EventSync implementation plan

Goal: a local, database-backed hackathon prototype that satisfies every rule in the provided PDF.

## Delivery order
1. SQLite schema and seeded venue inventory.
2. Deterministic hall allocation, buffered interval checks, and peak resource checks.
3. Atomic confirmation, cancellation, and safe rescheduling.
4. Booking workspace, venue timeline, resource overview, and clear decision reasons.
5. Validated alternative suggestions and an audit history.
6. Automated boundary, resource, change-management, and API checks; demo rehearsal.

## Core decisions
- Node.js with built-in HTTP and SQLite keeps setup dependency-free. Node 22.13+ required.
- Reservation intervals use [start - 30 minutes, end + 30 minutes). Equal endpoints do not overlap.
- Try the preferred venue first, then other venues. Within each search tier sort by capacity, venue ID, then hall ID.
- Use a sweep of resource usage changes to check peak simultaneous demand independently for each resource.
- Check and write inside a SQLite BEGIN IMMEDIATE transaction. Reschedule excludes its own old allocation and updates only after validation succeeds.
- Suggestions run the exact same allocator and require explicit selection before confirmation.

## Marks and demonstration
- Requirements (15): map each rule to a test and working action.
- Algorithms (20): explain overlap, best fit, sweep events, and deterministic fallback.
- Implementation (30): persistence, validation, atomic changes, and separated modules.
- Demo (15): two successful events, buffer conflict, alternative, failed reschedule, cancellation.
- Questions (20): rehearse tradeoffs and edge cases with every teammate.

## Scope
No external APIs, payments, cloud hosting, or login required for the local prototype. Prioritize correct scheduling over extra integrations.

## Current state

Core implementation and 16 engine/API tests completed. UI redesigned as a venue operations board with optional Shoelace and Lucide CDN enhancements and native fallbacks. No browser/computer control is permitted without explicit user approval; visual browser review remains unperformed.
