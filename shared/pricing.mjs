export const HALL_BASE_PRICES = { A1: 10000, A2: 15000, B1: 20000, B2: 25000, C1: 30000, C2: 35000 };
export function priceFor(hall, date, occurrenceCount = 1) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const offer = hall.backendVenue === 'B' && date >= '2026-11-01' && date <= '2026-12-31'
    ? { label: 'Festive season offer', percent: 12, reason: 'Through 31 Dec 2026' }
    : occurrenceCount >= 3 ? { label: 'Multi-event offer', percent: 8, reason: 'Three or more occurrences' }
      : hall.backendVenue === 'A' && weekday >= 1 && weekday <= 4
        ? { label: 'Weekday planning offer', percent: 10, reason: 'Monday–Thursday' } : null;
  const discount = offer ? Math.round(hall.basePrice * offer.percent / 100) : 0;
  return { original: hall.basePrice, discount, total: hall.basePrice - discount, offer };
}
