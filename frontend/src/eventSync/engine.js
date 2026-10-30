import {
  VENUES as SITES,
  allocate,
  validate,
  minute,
  clock,
  seriesDates,
} from "../../../shared/scheduling.mjs";
import { HALLS, priceFor } from "../../../shared/catalogue.mjs";
export const VENUES = HALLS;
export { priceFor, seriesDates };
export const offerFor = (venue, date, count) =>
  priceFor(venue, date, count).offer;
export const INITIAL_REVIEWS = [];
export const INITIAL_BOOKINGS = [];
export const minutes = (time) => {
  try {
    return minute(time);
  } catch {
    return NaN;
  }
};
export const addMinutes = (time, amount) => clock(minutes(time) + amount);
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export function shiftDate(date, days) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function bookingStatus(booking, now = new Date()) {
  if (booking.status === "cancelled") return "Cancelled";
  if (booking.status === "rejected") return "Rejected";
  return new Date(booking.date + "T" + booking.end + ":00+05:30") <= now
    ? "Completed"
    : "Upcoming";
}
export const reviewSummary = (reviews, venue) => {
  const rows = reviews.filter((review) => review.venueId === venue.id);
  return {
    count: rows.length,
    average: rows.length
      ? rows.reduce((sum, review) => sum + review.rating, 0) / rows.length
      : 0,
    recent: [...rows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 2),
  };
};
export function validateReview({ venueId, rating, text, reviewerId }, reviews) {
  if (!VENUES.some((venue) => venue.id === venueId))
    return "Choose a venue before submitting a review.";
  if (
    !Number.isInteger(Number(rating)) ||
    Number(rating) < 1 ||
    Number(rating) > 5
  )
    return "Choose a whole-star rating from 1 to 5.";
  if (
    typeof text !== "string" ||
    text.trim().length < 20 ||
    text.trim().length > 500
  )
    return "Reviews must contain 20?500 characters.";
  if (
    reviews.some(
      (review) =>
        review.venueId === venueId && review.reviewerId === reviewerId,
    )
  )
    return "You have already reviewed this venue.";
  return null;
}
const active = (bookings) =>
  bookings.filter((row) => row.status === "confirmed");
const engineRows = (bookings) =>
  active(bookings).map((row) => ({
    ...row,
    hall: row.hall || row.venueId,
    venue: row.backendVenue || row.venue,
    reservedStart: minutes(row.start) - 30,
    reservedEnd: minutes(row.end) + 30,
  }));
export function recommendation(venues, bookings, reviews, form) {
  let request;
  try {
    request = validate({
      ...form,
      client: form.client?.trim() || "Preview",
      title: form.title?.trim() || "Preview",
      attendees: Number(form.attendees),
      projectors: Number(form.projectors || 0),
      audio: Number(form.audio || 0),
      staff: Number(form.staff || 0),
      budget: Number(form.budget),
      preferredVenue: form.preferredVenue || "A",
    });
  } catch {
    return [];
  }
  return SITES.flatMap((site) =>
    site.halls.flatMap((siteHall) => {
      const decision = allocate(
        { ...request, preferredVenue: site.id, selectedHall: siteHall.id },
        engineRows(bookings),
        [site],
      );
      const hall = venues.find((venue) => venue.id === siteHall.id);
      if (
        !decision.ok ||
        !hall ||
        (form.location &&
          !(hall.region + " " + hall.area)
            .toLowerCase()
            .includes(form.location.trim().toLowerCase())) ||
        (form.tier !== "Any" && form.tier && form.tier !== hall.tier)
      )
        return [];
      const summary = reviewSummary(reviews, hall);
      return [
        {
          ...hall,
          ...summary,
          price: priceFor(hall, form.date),
          equipmentMatches:
            Number(request.projectors > 0) + Number(request.audio > 0),
          score: Math.round(80 + summary.average * 4),
        },
      ];
    }),
  );
}
export function costOptimizedRecommendations(venues, bookings, reviews, form) {
  const attendees = Number(form.attendees);
  return recommendation(venues, bookings, reviews, form).sort(
    (a, b) =>
      a.price.total - b.price.total ||
      a.capacity - attendees - (b.capacity - attendees) ||
      b.score - a.score ||
      a.backendVenue.localeCompare(b.backendVenue) ||
      a.id.localeCompare(b.id),
  );
}
function resourcePeak(rows, key) {
  const changes = new Map();
  for (const row of rows) {
    const start = minutes(row.start) - 30,
      end = minutes(row.end) + 30;
    changes.set(start, (changes.get(start) || 0) + row[key]);
    changes.set(end, (changes.get(end) || 0) - row[key]);
  }
  let used = 0,
    peak = 0,
    at = null;
  for (const [time, delta] of [...changes].sort((a, b) => a[0] - b[0])) {
    used += delta;
    if (used > peak) {
      peak = used;
      at = time;
    }
  }
  return { used: peak, at };
}
export function analytics(bookings, date, venueId = "All") {
  const sites = SITES.filter(
    (site) => venueId === "All" || site.id === venueId,
  );
  const day = active(bookings).filter(
    (row) =>
      row.date === date && sites.some((site) => site.id === row.backendVenue),
  );
  const resources = [
    ["projectors", "Projector"],
    ["audio", "Sound system"],
    ["staff", "Support staff"],
  ].map(([key, name]) => ({
    name,
    capacity: sites.reduce((sum, site) => sum + site[key], 0),
    used: sites.reduce(
      (sum, site) =>
        sum +
        resourcePeak(
          day.filter((row) => row.backendVenue === site.id),
          key,
        ).used,
      0,
    ),
  }));
  const peak = resourcePeak(
    day.map((row) => ({
      ...row,
      demand: row.projectors + row.audio + row.staff,
    })),
    "demand",
  );
  return {
    day,
    byEquipment: resources.slice(0, 2),
    staff: resources[2],
    hallUtilization: Math.round(
      (day.reduce(
        (sum, row) => sum + minutes(row.end) - minutes(row.start) + 60,
        0,
      ) /
        (sites.length * 2 * 840)) *
        100,
    ),
    peak: peak.at === null ? "No demand" : clock(peak.at),
  };
}
