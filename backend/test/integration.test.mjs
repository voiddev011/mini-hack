import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, InputError } from '../engine.mjs';
import { app } from '../server.mjs';
import { toBackendRequest, toUiBooking } from '../../frontend/src/eventSync/backendApi.js';
import { recommendation, VENUES } from '../../frontend/src/eventSync/engine.js';

const request = (changes = {}) => ({ client: 'Science club', title: 'Annual conference', date: '2026-11-12', start: '10:00', end: '13:00', attendees: 120, preferredVenue: 'A', projectors: 1, audio: 0, staff: 3, ...changes });

test('React request conversion and HTTP API share bookings across single, series, cancellation and rescheduling', async () => {
  const store = createStore(); const server = app(store);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const post = async (path, body, origin = 'http://127.0.0.1:5173') => {
    const response = await fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const single = await post('/api/bookings', toBackendRequest(request()));
    assert.equal(single.status, 201); assert.equal(single.body.booking.hall, 'A2');
    const second = await post('/api/bookings/series', { ...toBackendRequest(request({ client: 'Arts club', title: 'Workshop', attendees: 50, staff: 2, start: '11:00', end: '14:00' })), frequency: 'weekly', occurrences: 2, mode: 'atomic' });
    assert.equal(second.status, 200); assert.equal(second.body.results[0].booking.hall, 'A1');
    const third = await post('/api/check', toBackendRequest(request({ attendees: 100, start: '13:15', end: '15:00', staff: 2 })));
    assert.equal(third.body.decision.hall, 'B1');
    const state = await (await fetch(url + '/api/state')).json();
    const restored = state.bookings.map(toUiBooking);
    assert.equal(restored.filter(row => row.backendVenue === 'A' && row.date === request().date).length, 2);
    const previews = recommendation(VENUES, restored, [], { ...request({ attendees: 50, budget: 50000 }), location: '', tier: 'Any' });
    assert.ok(previews.every(row => row.backendVenue !== 'A'));
    assert.deepEqual([...new Set(state.bookings.map(row => row.client))].sort(), ['Arts club', 'Science club']);
    const id = single.body.booking.id;
    const failed = await post('/api/bookings/' + id + '/reschedule', { attendees: 251 });
    assert.equal(failed.body.preserved, true); assert.deepEqual(failed.body.booking, single.body.booking);
    const changed = await post('/api/bookings/' + id + '/reschedule', { date: '2026-11-14', projectors: 2, audio: 2 });
    assert.equal(changed.body.booking.date, '2026-11-14');
    assert.deepEqual(toUiBooking(changed.body.booking).equipment, ['Projector', 'Sound system']);
    assert.equal((await post('/api/bookings/' + id + '/cancel', {})).status, 200);
    const cancelled = (await (await fetch(url + '/api/state')).json()).bookings.find(row => row.id === id);
    assert.equal(cancelled.status, 'cancelled');
    assert.equal((await post('/api/check', request({ date: '2026-11-14' }))).body.decision.hall, 'A2');
    assert.equal((await post('/api/bookings', request(), 'https://example.com')).status, 403);
    assert.equal((await post('/api/bookings/batch', null)).status, 400);
    assert.equal((await post('/api/bookings', request({ start: '08:00' }))).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); store.close(); }
});

test('confirmation rejects a changed allocation without silently reserving another hall', () => {
  const store = createStore();
  try {
    const input = request({ attendees: 50 });
    const preview = store.evaluate(input);
    store.book(input);
    assert.throws(() => store.book({ ...input, expectedHall: preview.decision.hall }), InputError);
    assert.equal(store.list().length, 1);
  } finally { store.close(); }
});

test('server enforces the same discounted budget used by catalogue recommendations', () => {
  const store = createStore();
  try {
    const input = request({ preferredVenue: 'B', budget: 22000 });
    assert.equal(store.book(input).booking.hall, 'B2');
    const rejected = store.book(request({ budget: 1 }));
    assert.equal(rejected.booking.status, 'rejected');
    assert.ok(rejected.decision.diagnostics.every(row => row.reasons.some(reason => reason.includes('budget'))));
  } finally { store.close(); }
});

test('preview records only rejected requests and never confirms a feasible request', () => {
  const store = createStore();
  try {
    assert.equal(store.preview(request()).decision.ok, true);
    assert.equal(store.list().length, 0);
    assert.equal(store.preview(request({ attendees: 251 })).booking.status, 'rejected');
    assert.equal(store.list().length, 1);
    assert.equal(store.preview(request()).decision.ok, true);
    assert.equal(store.list().filter(row => row.status === 'confirmed').length, 0);
  } finally { store.close(); }
});

test('saved budget survives reads and reschedules, including bookings with no budget', () => {
  const store = createStore();
  try {
    const original = store.book(request({ attendees: 50, budget: 9500 })).booking;
    assert.equal(original.budget, 9500);
    assert.equal(store.reschedule(original.id, { date: '2026-11-13' }).preserved, true);
    assert.deepEqual(store.list().find(row => row.id === original.id), original);
    const unrestricted = store.book(request({ date: '2026-11-15' })).booking;
    assert.equal(unrestricted.budget, null);
    assert.equal(store.reschedule(unrestricted.id, { date: '2026-11-16' }).decision.ok, true);
  } finally { store.close(); }
});
