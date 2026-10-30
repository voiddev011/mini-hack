import { describe, expect, it } from 'vitest';
import { VENUES, priceFor, recommendation, costOptimizedRecommendations, reviewSummary, validateReview, analytics, seriesDates, shiftDate, bookingStatus } from './engine';
import { toBackendRequest, toUiBooking } from './backendApi';
import { VENUES as SITES, validate, allocate } from '../../../shared/scheduling.mjs';
const request = (changes = {}) => ({ client: 'College council', title: 'Workshop', date: '2026-11-12', start: '10:00', end: '12:00', attendees: 50, preferredVenue: 'A', projectors: 1, audio: 1, staff: 2, budget: 50000, location: '', tier: 'Any', ...changes });
const booking = (changes = {}) => toUiBooking({ id: 1, ...request(), venue: 'A', hall: 'A1', status: 'confirmed', ...changes });
describe('EventSync reviews and catalogue', () => {
  it('uses all six official halls with exact venue resource limits', () => {
    expect(VENUES.map(hall => [hall.id, hall.capacity])).toEqual(SITES.flatMap(site => site.halls.map(hall => [hall.id, hall.capacity])));
    expect(VENUES.find(hall => hall.id === 'A1').staff).toBe(5);
    expect(VENUES.find(hall => hall.id === 'B2').audio).toBe(1);
  });
  it('validates ratings, review length, venue identity and duplicate reviewers', () => {
    const row = { venueId: 'A1', rating: 4, text: 'The team provided excellent coordination.', reviewerId: 'organizer' };
    expect(validateReview({ ...row, rating: 6 }, [])).toContain('1 to 5');
    expect(validateReview({ ...row, text: 'Short' }, [])).toContain('20');
    expect(validateReview({ ...row, venueId: 'unknown' }, [])).toContain('Choose');
    expect(validateReview(row, [row])).toContain('already');
    expect(validateReview(row, [])).toBe(null);
  });
  it('calculates review averages and handles an unrated hall', () => {
    expect(reviewSummary([{ venueId: 'A1', rating: 2, createdAt: '2026-01-01' }, { venueId: 'A1', rating: 4, createdAt: '2026-02-01' }], VENUES[0])).toMatchObject({ count: 2, average: 3 });
    expect(reviewSummary([], VENUES[0])).toMatchObject({ count: 0, average: 0 });
  });
  it('applies one offer and keeps the same estimate at recommendation', () => {
    const hall = VENUES.find(item => item.id === 'B2');
    expect(priceFor(hall, '2026-11-12', 4)).toMatchObject({ original: 25000, discount: 3000, total: 22000 });
    expect(recommendation(VENUES, [], [], request({ attendees: 120, tier: 'Premium', budget: 22000 }))).toMatchObject([{ id: 'B2', price: { total: 22000 } }]);
  });
});
describe('database booking conversions', () => {
  it('preserves each client and numeric resource quantities', () => {
    expect(toBackendRequest(request({ client: '  Science club  ', projectors: '2', audio: '1', staff: '4' }))).toMatchObject({ client: 'Science club', projectors: 2, audio: 1, staff: 4 });
    expect(toBackendRequest(request({ client: '' })).client).toBe('');
    expect(toBackendRequest(request({ selectedHall: 'A2' })).selectedHall).toBe('A2');
  });
  it('keeps both equipment types, quantities, hall identities and status', () => {
    const row = booking({ projectors: 2, audio: 1, status: 'cancelled' });
    expect(row).toMatchObject({ venueId: 'A1', backendVenue: 'A', projectors: 2, audio: 1, equipment: ['Projector', 'Sound system'], status: 'cancelled' });
    expect(booking({ id: 2, hall: 'A2' }).venueId).toBe('A2');
  });
});
describe('recommendation constraints', () => {
  it('lists every feasible hall and respects location', () => {
    expect(recommendation(VENUES, [], [], request()).map(row => row.id)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(recommendation(VENUES, [], [], request({ location: 'bangalore' })).map(row => row.id)).toEqual(['C1', 'C2']);
    expect(recommendation(VENUES, [], [], request({ location: 'nonexistent' }))).toEqual([]);
  });
  it('ranks feasible recommendations by actual estimated price for cost savings', () => {
    const ranked = costOptimizedRecommendations(VENUES, [], [], request({ attendees: 120, audio: 0 }));
    expect(ranked[0].id).toBe('A2');
    expect(ranked.map(row => row.price.total)).toEqual([...ranked.map(row => row.price.total)].sort((a, b) => a - b));
    expect(costOptimizedRecommendations(VENUES, [], [], request({ attendees: 120, budget: 12000 }))).toEqual([]);
  });
  it('excludes invalid inputs and enforces operating hours including buffers', () => {
    for (const patch of [{ start: '08:00' }, { end: '22:00' }, { start: '' }, { date: '2026-02-30' }, { attendees: 0 }, { attendees: 1.5 }, { staff: -1 }, { budget: -1 }]) {
      expect(recommendation(VENUES, [], [], request(patch))).toEqual([]);
    }
    expect(recommendation(VENUES, [], [], request({ start: '08:30', end: '21:30' })).map(row => row.id)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
  it('uses concurrent peaks rather than summing separate reservations', () => {
    const rows = [booking({ start: '09:00', end: '10:00', projectors: 1, audio: 0, staff: 2 }), booking({ id: 2, start: '12:00', end: '13:00', projectors: 1, audio: 0, staff: 2 })];
    const form = request({ start: '09:30', end: '12:30', staff: 3, audio: 0 });
    expect(recommendation(VENUES, rows, [], form).map(row => row.id)).toContain('A2');
    expect(allocate(validate(form), rows.map(row => ({ ...row, venue: row.backendVenue, reservedStart: Number(row.start.slice(0,2)) * 60 - 30, reservedEnd: Number(row.end.slice(0,2)) * 60 + 30 }))).hall).toBe('A2');
  });
  it('does not let cancelled or rejected requests block new bookings', () => {
    const rows = [booking({ status: 'cancelled' }), booking({ id: 2, status: 'rejected' })];
    expect(recommendation(VENUES, rows, [], request()).map(row => row.id)).toContain('A1');
  });
  it('detects a venue resource shortage even with a free hall', () => {
    const rows = [booking({ hall: 'A2', attendees: 120, staff: 5 })];
    expect(recommendation(VENUES, rows, [], request()).map(row => row.backendVenue)).not.toContain('A');
  });
});
describe('date and schedule calculations', () => {
  it('clamps monthly recurrence to month end without drifting later occurrences', () => {
    expect(seriesDates('2026-01-31', 'monthly', 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(seriesDates('2028-01-31', 'monthly', 2)[1]).toBe('2028-02-29');
  });
  it('moves relative to the selected date across month and year boundaries', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('derives lifecycle labels using the actual end time in India', () => {
    const row = booking({ date: '2026-10-30', end: '13:00' });
    expect(bookingStatus(row, new Date('2026-10-30T07:29:00Z'))).toBe('Upcoming');
    expect(bookingStatus(row, new Date('2026-10-30T07:30:00Z'))).toBe('Completed');
    expect(bookingStatus({ ...row, status: 'cancelled' })).toBe('Cancelled');
    expect(bookingStatus({ ...row, status: 'rejected' })).toBe('Rejected');
  });
  it('reports per-venue peak allocations and includes buffers in utilization', () => {
    const rows = [booking({ start: '09:00', end: '10:00', staff: 5 }), booking({ id: 2, start: '12:00', end: '13:00', staff: 5 }), booking({ id: 3, status: 'cancelled' })];
    const metrics = analytics(rows, '2026-11-12', 'A');
    expect(metrics.staff).toMatchObject({ used: 5, capacity: 5 });
    expect(metrics.byEquipment[0]).toMatchObject({ used: 1, capacity: 2 });
    expect(metrics.day).toHaveLength(2);
    expect(metrics.hallUtilization).toBe(14);
  });
  it('finds an interior peak rather than the earliest event', () => {
    const rows = [booking({ start: '09:00', end: '10:00', staff: 1, projectors: 0, audio: 0 }), booking({ id: 2, start: '12:00', end: '13:00', staff: 5 })];
    expect(analytics(rows, '2026-11-12', 'A').peak).toBe('11:30');
  });
});
