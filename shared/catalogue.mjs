import { VENUES } from "./scheduling.mjs";
import { HALL_BASE_PRICES } from "./pricing.mjs";

// Illustrative prices and photos; capacities/resources come from the official dataset.
const styles = {
  A: {
    region: "Pune",
    tier: "Affordable",
    basePrice: 10000,
    color: "blue",
    image: "/assets/aff1.jpg",
  },
  B: {
    region: "Mumbai",
    tier: "Premium",
    basePrice: 20000,
    color: "orange",
    image: "/assets/pre1.jpg",
  },
  C: {
    region: "Bangalore",
    tier: "Luxury",
    basePrice: 30000,
    color: "purple",
    image: "/assets/lux1.jpg",
  },
};
export const HALLS = VENUES.flatMap((venue) =>
  venue.halls.map((hall) => ({
    ...styles[venue.id],
    ...hall,
    backendVenue: venue.id,
    hall: hall.id,
    name: `${venue.name} · ${hall.id}`,
    area: `${venue.name}, ${styles[venue.id].region}`,
    basePrice: HALL_BASE_PRICES[hall.id],
    category: "Multi-purpose",
    rating: 0,
    equipment: ["Projector", "Sound system"],
    projectors: venue.projectors,
    audio: venue.audio,
    staff: venue.staff,
  })),
);

export { priceFor } from "./pricing.mjs";
