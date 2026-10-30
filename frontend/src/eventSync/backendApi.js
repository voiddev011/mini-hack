import { VENUES } from "../../../shared/scheduling.mjs";
export const BACKEND_VENUES = VENUES.map((venue) => ({
  ...venue,
  detail: venue.halls
    .map((hall) => hall.id + " (" + hall.capacity + ")")
    .join(" or "),
}));
export function toBackendRequest(row) {
  return {
    client: row.client?.trim() || "",
    title: row.title?.trim() || "",
    date: row.date,
    start: row.start,
    end: row.end,
    attendees: Number(row.attendees),
    preferredVenue: row.preferredVenue,
    projectors: Number(row.projectors ?? 0),
    audio: Number(row.audio ?? 0),
    staff: Number(row.staff ?? 0),
    ...(row.budget !== undefined ? { budget: Number(row.budget) } : {}),
    ...(row.selectedHall ? { selectedHall: row.selectedHall } : {}),
  };
}
export function toUiBooking(booking) {
  return {
    ...booking,
    id: "api-" + booking.id,
    backendId: booking.id,
    venueId: booking.hall,
    backendVenue: booking.venue,
    source: "sqlite",
    price: null,
    equipment: [
      ...(booking.projectors ? ["Projector"] : []),
      ...(booking.audio ? ["Sound system"] : []),
    ],
  };
}
export async function bookingApi(path, body, { signal } = {}) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal || AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => {
    throw new Error(
      "Invalid booking service response. Check that the backend is running.",
    );
  });
  if (!response.ok)
    throw new Error(
      payload.error || "The booking service could not process this request.",
    );
  return payload;
}
export const postBookingApi = bookingApi;
export const decisionMessage = (result) =>
  result.decision?.diagnostics
    ?.filter((item) => item.reasons.length)
    .map((item) => item.hall + ": " + item.reasons.join(" "))
    .join(" ") ||
  result.decision?.message ||
  result.error ||
  "This request could not be allocated.";
