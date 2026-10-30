import { HALL_BASE_PRICES, priceFor } from "./pricing.mjs";
export const RESOURCES = ["projectors", "audio", "staff"];
export const VENUES = [
  {
    id: "A",
    name: "Atrium",
    projectors: 2,
    audio: 2,
    staff: 5,
    halls: [
      { id: "A1", capacity: 60 },
      { id: "A2", capacity: 150 },
    ],
  },
  {
    id: "B",
    name: "Boulevard",
    projectors: 2,
    audio: 1,
    staff: 4,
    halls: [
      { id: "B1", capacity: 100 },
      { id: "B2", capacity: 200 },
    ],
  },
  {
    id: "C",
    name: "Crescent",
    projectors: 3,
    audio: 2,
    staff: 6,
    halls: [
      { id: "C1", capacity: 80 },
      { id: "C2", capacity: 250 },
    ],
  },
];
export class InputError extends Error {}
export function minute(time) {
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new InputError("Use a valid time in HH:MM format.");
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function clock(value) {
  return (
    String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0")
  );
}
export function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Provide an event request.");
  const r = {};
  for (const [key, max] of [
    ["client", 100],
    ["title", 140],
  ]) {
    if (
      typeof input[key] !== "string" ||
      !input[key].trim() ||
      input[key].trim().length > max
    )
      throw new InputError(
        key + " is required and must be at most " + max + " characters.",
      );
    r[key] = input[key].trim();
  }
  if (
    typeof input.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    throw new InputError("Choose a valid event date.");
  r.date = input.date;
  r.start = input.start;
  r.end = input.end;
  const start = minute(r.start),
    end = minute(r.end);
  if (start >= end)
    throw new InputError("Event end must be after its start on the same day.");
  if (start - 30 < 480 || end + 30 > 1320)
    throw new InputError(
      "With setup and cleanup, events must start at or after 08:30 and end at or before 21:30.",
    );
  for (const key of ["attendees", ...RESOURCES]) {
    if (
      !Number.isSafeInteger(input[key]) ||
      input[key] < (key === "attendees" ? 1 : 0) ||
      input[key] > 100000
    )
      throw new InputError(
        key +
          " must be a whole number " +
          (key === "attendees" ? "greater than zero." : "of zero or more."),
      );
    r[key] = input[key];
  }
  if (!VENUES.some((v) => v.id === input.preferredVenue))
    throw new InputError("Choose venue A, B, or C.");
  r.preferredVenue = input.preferredVenue;
  r.reservedStart = start - 30;
  r.reservedEnd = end + 30;
  if (input.selectedHall !== undefined && input.selectedHall !== null) {
    if (
      typeof input.selectedHall !== "string" ||
      !VENUES.some(
        (venue) =>
          venue.id === r.preferredVenue &&
          venue.halls.some((hall) => hall.id === input.selectedHall),
      )
    ) {
      throw new InputError("Choose a hall that belongs to the selected venue.");
    }
    r.selectedHall = input.selectedHall;
  }
  // Optional catalogue filters are also checked by the authoritative allocator.
  if (input.budget !== undefined && input.budget !== null) {
    if (!Number.isFinite(input.budget) || input.budget < 0)
      throw new InputError("Budget must be a non-negative number.");
    r.budget = input.budget;
  }
  return r;
}
const overlaps = (a, b) =>
  a.reservedStart < b.reservedEnd && b.reservedStart < a.reservedEnd;
export function allocate(request, bookings, venues = VENUES) {
  const active = bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      b.date === request.date &&
      overlaps(request, b),
  );
  const candidates = venues.flatMap((v) =>
    v.halls.map((h) => ({ ...h, venue: v.id })),
  );
  const ordered = request.selectedHall
    ? candidates.filter(
        (hall) =>
          hall.id === request.selectedHall &&
          hall.venue === request.preferredVenue,
      )
    : candidates.sort(
        (a, b) =>
          Number(b.venue === request.preferredVenue) -
            Number(a.venue === request.preferredVenue) ||
          a.capacity - b.capacity ||
          a.venue.localeCompare(b.venue) ||
          a.id.localeCompare(b.id),
      );
  const diagnostics = [];
  for (const hall of ordered) {
    const reasons = [];
    if (
      request.budget !== undefined &&
      priceFor(
        { basePrice: HALL_BASE_PRICES[hall.id], backendVenue: hall.venue },
        request.date,
      ).total > request.budget
    )
      reasons.push("Hall estimate exceeds the requested budget.");
    if (hall.capacity < request.attendees)
      reasons.push(
        "Seats " + hall.capacity + "; request needs " + request.attendees + ".",
      );
    const occupied = active.filter((b) => b.hall === hall.id);
    for (const b of occupied)
      reasons.push(
        "Hall reserved by “" +
          b.title +
          "” from " +
          clock(b.reservedStart) +
          " to " +
          clock(b.reservedEnd) +
          ", including buffers.",
      );
    const venue = venues.find((v) => v.id === hall.venue),
      concurrent = active.filter((b) => b.venue === hall.venue);
    for (const key of RESOURCES) {
      const changes = new Map([[request.reservedStart, 0]]);
      for (const b of concurrent) {
        const start = Math.max(request.reservedStart, b.reservedStart),
          end = Math.min(request.reservedEnd, b.reservedEnd);
        changes.set(start, (changes.get(start) || 0) + b[key]);
        changes.set(end, (changes.get(end) || 0) - b[key]);
      }
      let used = 0,
        peak = 0,
        peakAt = request.reservedStart;
      for (const [time, delta] of [...changes].sort((a, b) => a[0] - b[0])) {
        used += delta;
        if (time < request.reservedEnd && used > peak) {
          peak = used;
          peakAt = time;
        }
      }
      if (peak + request[key] > venue[key])
        reasons.push(
          key +
            ": needs " +
            (peak + request[key]) +
            " total at " +
            clock(peakAt) +
            ", venue has " +
            venue[key] +
            " (" +
            peak +
            " allocated + " +
            request[key] +
            " requested).",
        );
    }
    diagnostics.push({ hall: hall.id, venue: hall.venue, reasons });
    if (!reasons.length)
      return {
        ok: true,
        hall: hall.id,
        venue: hall.venue,
        capacity: hall.capacity,
        fallback: hall.venue !== request.preferredVenue,
        diagnostics,
      };
  }
  return {
    ok: false,
    message:
      "No hall can satisfy attendance, reserved interval, and shared resource requirements.",
    diagnostics,
  };
}
export function alternatives(request, bookings) {
  const suggestions = [],
    seen = new Set(),
    duration = minute(request.end) - minute(request.start);
  const collect = (r, kind) => {
    const d = allocate(r, bookings),
      key = d.hall + ":" + r.start + ":" + r.end;
    if (d.ok && !seen.has(key)) {
      seen.add(key);
      suggestions.push({
        kind,
        hall: d.hall,
        venue: d.venue,
        start: r.start,
        end: r.end,
        date: r.date,
        preferredVenue: r.preferredVenue,
      });
    }
  };
  for (const v of VENUES)
    collect({ ...request, preferredVenue: v.id }, "Same time");
  const candidates = new Set();
  for (let start = 510; start + duration <= 1290; start += 15)
    candidates.add(start);
  for (const b of bookings.filter(
    (b) => b.status === "confirmed" && b.date === request.date,
  )) {
    candidates.add(b.reservedEnd + 30);
    candidates.add(b.reservedStart - 30 - duration);
  }
  for (const start of [...candidates]
    .filter(
      (t) => t >= 510 && t + duration <= 1290 && t !== minute(request.start),
    )
    .sort(
      (a, b) =>
        Math.abs(a - minute(request.start)) -
          Math.abs(b - minute(request.start)) || a - b,
    )) {
    collect(
      {
        ...request,
        start: clock(start),
        end: clock(start + duration),
        reservedStart: start - 30,
        reservedEnd: start + duration + 30,
      },
      "Nearby time",
    );
    if (suggestions.length >= 3) break;
  }
  return suggestions.slice(0, 3);
}
const FREQUENCIES = { daily: 1, weekly: 7, fortnightly: 14 };
export function seriesDates(startDate, frequency, occurrences) {
  if (
    typeof startDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !Number.isFinite(Date.parse(startDate)) ||
    new Date(startDate).toISOString().slice(0, 10) !== startDate
  )
    throw new InputError("Choose a valid event date.");
  if (!Number.isSafeInteger(occurrences) || occurrences < 2 || occurrences > 12)
    throw new InputError("Choose between 2 and 12 occurrences.");
  const dates = [];
  for (let i = 0; i < occurrences; i++) {
    if (frequency === "monthly") {
      const [year, month, day] = startDate.split("-").map(Number);
      const shifted = month - 1 + i;
      const y = year + Math.floor(shifted / 12);
      const m = ((shifted % 12) + 12) % 12;
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      dates.push(
        y +
          "-" +
          String(m + 1).padStart(2, "0") +
          "-" +
          String(Math.min(day, last)).padStart(2, "0"),
      );
    } else if (FREQUENCIES[frequency]) {
      const d = new Date(startDate + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + i * FREQUENCIES[frequency]);
      dates.push(d.toISOString().slice(0, 10));
    } else
      throw new InputError("Choose daily, weekly, fortnightly, or monthly.");
  }
  return dates;
}
export function expandSeries(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Provide a recurring series request.");
  const dates = seriesDates(
    input.date,
    input.frequency,
    Number(input.occurrences),
  );
  return dates.map((date) => ({ ...input, date }));
}
