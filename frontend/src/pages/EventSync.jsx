import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_REVIEWS, VENUES, addMinutes, analytics, minutes, priceFor, costOptimizedRecommendations, reviewSummary, validateReview, today, shiftDate, bookingStatus, seriesDates } from '../eventSync/engine';
import { BACKEND_VENUES, bookingApi, postBookingApi, toBackendRequest, toUiBooking, decisionMessage } from '../eventSync/backendApi';

const formatPrice = value => '\u20b9' + value.toLocaleString('en-IN');
const load = (key, fallback) => { try { const saved = JSON.parse(localStorage.getItem(key)); return Array.isArray(saved) ? saved : fallback; } catch { return fallback; } };
const loadReviews = () => load('eventsync.reviews.v2', INITIAL_REVIEWS).map(review =>
  review.reviewerId === 'demo-organizer' ? { ...review, reviewerId: 'organizer' } : review);
const Field = ({ label, wide, children }) => <label className={wide ? 'wide' : ''}>{label}{children}</label>;
const initialRequest = () => ({ client: '', title: '', date: today(), start: '10:00', end: '12:00', attendees: 50, preferredVenue: 'A', selectedHall: null, projectors: 1, audio: 0, staff: 2 });
const VENUE_CITIES = { A: 'Pune', B: 'Mumbai', C: 'Bangalore' };
const CATALOGUE_LISTINGS = [
  { hall: 'A1', image: '/assets/aff1.jpg' },
  { hall: 'A2', image: '/assets/hall1.jpg' },
  { hall: 'B1', image: '/assets/pre1.jpg' },
  { hall: 'B2', image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=85' },
  { hall: 'C1', image: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1000&q=85' },
  { hall: 'C2', image: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1000&q=85' },
];

export default function EventSync() {
  const [tab, setTab] = useState('landing');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState([]);
  const [audit, setAudit] = useState([]);
  const [connected, setConnected] = useState(false);
  const [reviews, setReviews] = useState(loadReviews);
  const [form, setForm] = useState(() => ({ ...initialRequest(), client: 'Event organizer', title: 'New event', budget: 50000, location: '', tier: 'Any' }));
  const [bulk, setBulk] = useState(() => ({ ...initialRequest(), frequency: 'weekly', occurrences: 4, mode: 'atomic' }));
  const [reviewForm, setReviewForm] = useState({ venueId: 'A1', rating: 5, text: '' });
  const requestVersion = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async signal => {
    const version = ++requestVersion.current;
    try {
      const state = await bookingApi('/api/state', undefined, { signal });
      if (version === requestVersion.current) {
        setBookings(state.bookings.map(toUiBooking)); setAudit(state.audit); setConnected(true);
      }
    } catch (error) {
      if (version === requestVersion.current && !signal?.aborted) setConnected(false);
      throw error;
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const sync = () => { void refresh(controller.signal).catch(error => {
      if (!controller.signal.aborted) setNotice('Could not refresh bookings: ' + error.message);
    }); };
    sync(); window.addEventListener('focus', sync);
    return () => { controller.abort(); window.removeEventListener('focus', sync); };
  }, [refresh]);
  useEffect(() => { try { localStorage.setItem('eventsync.reviews.v2', JSON.stringify(reviews)); }
    catch { setNotice('Reviews could not be saved in this browser.'); } }, [reviews]);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  // Keep successful writes successful even when the follow-up read loses its connection.
  const refreshAfterWrite = async () => {
    try { await refresh(); } catch { setNotice('Change saved in SQLite. Refresh bookings when the connection returns.'); }
  };
  const mutate = async task => {
    if (busy.current || submitting) return;
    busy.current = true; setSubmitting(true);
    try { return await task(); } catch (error) { setNotice(error.message); return { error: error.message }; }
    finally { busy.current = false; setSubmitting(false); }
  };
  const choose = (venue, requestValues = form) => mutate(async () => {
    if (venue) update('preferredVenue', venue.backendVenue);
    if (!requestValues.client.trim() || !requestValues.title.trim()) { setTab('discover'); setNotice('Enter the client and event details before booking.'); return; }
    const request = toBackendRequest({
      ...requestValues,
      preferredVenue: venue?.backendVenue || requestValues.preferredVenue,
      selectedHall: venue?.selectedHall || requestValues.selectedHall,
    });
    const preview = await postBookingApi('/api/bookings/preview', request);
    if (!preview.decision.ok) {
      setNotice(decisionMessage(preview)); await refreshAfterWrite(); return;
    }
    const hall = VENUES.find(item => item.id === preview.decision.hall);
    setSelected({ ...hall, ...reviewSummary(reviews, hall), price: priceFor(hall, request.date), request,
      fallback: preview.decision.fallback });
  });
  const confirmBooking = () => mutate(async () => {
    const result = await postBookingApi('/api/bookings', { ...selected.request, expectedHall: selected.id });
    setSelected(null);
    setNotice(result.decision.ok ? result.booking.hall + ' confirmed for ' + result.booking.client + '.' : decisionMessage(result));
    setTab('bookings'); await refreshAfterWrite();
  });
  const runBulk = () => mutate(async () => {
    const response = await postBookingApi('/api/bookings/series', { ...toBackendRequest(bulk), frequency: bulk.frequency, occurrences: Number(bulk.occurrences), mode: bulk.mode });
    setNotice(response.committed ? response.results.filter(item => item.booking?.status === 'confirmed').length + ' recurring bookings saved in SQLite.' : response.message);
    await refreshAfterWrite(); return response;
  });
  const submitReview = event => {
    event.preventDefault(); const error = validateReview({ ...reviewForm, reviewerId: 'organizer' }, reviews);
    if (error) { setNotice(error); return; }
    setReviews(old => [...old, { ...reviewForm, id: crypto.randomUUID(), rating: Number(reviewForm.rating), reviewerId: 'organizer', name: 'You', createdAt: new Date().toISOString() }]);
    setReviewForm(old => ({ ...old, text: '' })); setNotice('Review saved in this browser.');
  };
  const bookRecommended = (requestValues, venue) => {
    const bookingRequest = { ...form, ...requestValues, preferredVenue: venue.backendVenue, selectedHall: venue.id };
    setForm(bookingRequest);
    setTab('discover');
    void choose({ ...venue, selectedHall: venue.id }, bookingRequest);
  };
  const nav = [['landing','Home'],['overview','Overview'],['discover','Find a Venue'],['schedule','Schedule'],['bookings','Bookings'],['recurring','Recurring Events'],['bulk','Bulk Booking'],['reviews','Reviews']];
  if (tab === 'landing') {
    return <>
      <Landing
        openWorkspace={() => setTab('overview')}
        openVenues={() => setTab('discover')}
        openReviews={() => setTab('reviews')}
      />
      <RecommendationAssistant bookings={bookings} onBook={bookRecommended} />
    </>;
  }
  return <div className="es-app es-desktop">
    <aside className="es-sidebar"><a className="es-logo" href="/" aria-label="EventSync home"><i>E</i><div><b>EventSync</b><small>VENUE OPERATIONS</small></div></a>
      <nav>{nav.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className="es-status"><span />{connected ? 'SQLite connected' : 'Booking service unavailable'}<small>All bookings use the shared database</small></div>
    </aside>
    <main className="es-main"><header className="es-dashboard-header"><div className="es-search"><input aria-label="Search venues" placeholder="Search venues..." value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="es-header-tools"><button onClick={() => void refresh().catch(error => setNotice(error.message))}>Refresh bookings</button><button className="es-date-button" onClick={() => setTab('schedule')}>{today()}</button><b>Event operations</b></div></header>
      {notice && <div className="es-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>Close</button></div>}
      {!connected && <div className="es-notice" role="alert">Start the booking service and refresh to load the current schedule.</div>}
      {tab === 'overview' && <Overview bookings={bookings.filter(row => row.status === 'confirmed')} reviews={reviews} search={search} showFinder={() => setTab('discover')} showSchedule={() => setTab('schedule')} choose={choose} cancel={setCancelTarget} />}
      {tab === 'discover' && <Discover form={form} update={update} choose={choose} bookings={bookings} reviews={reviews} setNotice={setNotice} view={setViewing} />}
      {tab === 'schedule' && <Schedule bookings={bookings} cancel={setCancelTarget} />}
      {tab === 'bookings' && <Bookings bookings={bookings} cancel={setCancelTarget} reschedule={booking => setEditing({ ...booking, preferredVenue: booking.backendVenue, budget: booking.budget ?? 50000 })} goFind={() => setTab('discover')} audit={audit} />}
      {tab === 'recurring' && <Recurring bulk={bulk} setBulk={setBulk} run={runBulk} submitting={submitting} />}
      {tab === 'bulk' && <Bulk refresh={refreshAfterWrite} submitting={submitting} setSubmitting={setSubmitting} notice={setNotice} />}
      {tab === 'reviews' && <Reviews reviews={reviews} reviewForm={reviewForm} setReviewForm={setReviewForm} submit={submitReview} />}
    </main>
    {selected && <Confirm venue={selected} form={selected.request} submitting={submitting} close={() => setSelected(null)} confirm={confirmBooking} />}
    {viewing && <VenueDetails venue={viewing} close={() => setViewing(null)} book={() => {
      if (viewing.isAvailable === false) return;
      setViewing(null);
      void choose({ ...viewing, selectedHall: viewing.id }, { ...form, selectedHall: viewing.id });
    }} />}
    {cancelTarget && <Cancel booking={cancelTarget} close={() => setCancelTarget(null)} confirm={() => mutate(async () => {
      await postBookingApi('/api/bookings/' + cancelTarget.backendId + '/cancel', {});
      setCancelTarget(null); setNotice('Booking cancelled. Hall and resources released.'); await refreshAfterWrite();
    })} />}
    {editing && <div className="es-modal-wrap" role="dialog" aria-modal="true" aria-label="Reschedule booking"><div className="es-modal">
      <button className="es-x" aria-label="Close rescheduling" onClick={() => setEditing(null)}>Close</button><h2>Reschedule {editing.title}</h2>
      <p>The smallest feasible hall is allocated again. If a change fails, your original booking stays confirmed.</p>
      <form onSubmit={event => { event.preventDefault(); void mutate(async () => {
        const result = await postBookingApi('/api/bookings/' + editing.backendId + '/reschedule', toBackendRequest(editing));
        if (result.preserved) setNotice('Original booking preserved. ' + decisionMessage(result));
        else { setEditing(null); setNotice('Booking rescheduled to ' + result.booking.hall + '.'); }
        await refreshAfterWrite();
      }); }}><RequestFields row={editing} change={(key, value) => setEditing(old => ({ ...old, [key]: value }))} /><Field label="Maximum estimate (INR)"><input required type="number" min="0" value={editing.budget} onChange={event => setEditing(old => ({ ...old, budget: event.target.value }))} /></Field><button disabled={submitting} className="es-primary" type="submit">{submitting ? 'Checking...' : 'Validate and reschedule'}</button></form>
    </div></div>}
    <RecommendationAssistant bookings={bookings} onBook={bookRecommended} />
  </div>;
}

function Landing({ openWorkspace, openVenues, openReviews }) {
  return <main className="es-landing" id="landing">
    <header className="es-landing-header">
      <a className="es-landing-brand" href="/" aria-label="EventSync home">
        <img className="es-landing-logo-mark" src="/assets/logo.png" alt="" /><span className="es-landing-wordmark"><b>EventSync</b><small>VENUE OPERATIONS</small></span>
      </a>
      <nav aria-label="Main navigation">
        <button onClick={openVenues}>Venues</button>
        <a href="#how-it-works">How it works</a>
        <button onClick={openReviews}>Feedback</button>
      </nav>
      <button className="es-landing-workspace" onClick={openWorkspace}>Open workspace <span aria-hidden="true">→</span></button>
    </header>
    <section className="es-landing-hero">
      <div className="es-landing-copy">
        <span className="es-landing-eyebrow"><i /> EVENT PLANNING, MADE SIMPLE</span>
        <h1>Find the right space for <em>what’s next.</em></h1>
        <p>Discover venues, check live availability, and bring every event detail together in one calm, clear workspace.</p>
        <div className="es-landing-actions">
          <button className="es-landing-primary" onClick={openWorkspace}>Plan an event <span aria-hidden="true">→</span></button>
          <button className="es-landing-secondary" onClick={openVenues}>Explore venues</button>
        </div>
      </div>
    </section>
    <section className="es-landing-benefits" id="how-it-works">
      <div><span>01</span><h2>Choose your venue</h2><p>Compare spaces by capacity, location, and what your event needs.</p></div>
      <div><span>02</span><h2>Check availability</h2><p>See scheduling conflicts and resource limits before you commit.</p></div>
      <div><span>03</span><h2>Bring it together</h2><p>Keep bookings, schedules, and event changes in one workspace.</p></div>
    </section>
    <footer className="es-landing-footer"><a className="es-landing-brand" href="/" aria-label="EventSync home"><img className="es-landing-logo-mark" src="/assets/logo.png" alt="" /><span className="es-landing-wordmark"><b>EventSync</b><small>VENUE OPERATIONS</small></span></a><span>Make room for great events.</span></footer>
  </main>;
}

function RequestFields({ row, change, lockVenue = false }) {
  return <div className="es-fields">
    <Field label="Client"><input required maxLength={100} value={row.client} onChange={event => change('client', event.target.value)} /></Field>
    <Field label="Event name"><input required maxLength={140} value={row.title} onChange={event => change('title', event.target.value)} /></Field>
    <Field label="Date"><input required type="date" value={row.date} onChange={event => change('date', event.target.value)} /></Field>
    {lockVenue
      ? <Field label="Selected location"><input value={BACKEND_VENUES.find(venue => venue.id === row.preferredVenue)?.name || ''} disabled /></Field>
      : <Field label="Preferred venue"><select value={row.preferredVenue} onChange={event => change('preferredVenue', event.target.value)}>{BACKEND_VENUES.map(venue => <option key={venue.id} value={venue.id}>{venue.name} / {venue.detail}</option>)}</select></Field>}
    <Field label="Attendees"><input required type="number" min="1" step="1" value={row.attendees} onChange={event => change('attendees', event.target.value)} /></Field>
    {['projectors', 'audio', 'staff'].map(key => <Field key={key} label={{ projectors: 'Projectors', audio: 'Audio systems', staff: 'Support staff' }[key]}><input required type="number" min="0" step="1" value={row[key]} onChange={event => change(key, event.target.value)} /></Field>)}
    <Field label="Start (08:30 or later)"><input required type="time" min="08:30" max="21:29" value={row.start} onChange={event => change('start', event.target.value)} /></Field>
    <Field label="End (21:30 or earlier)"><input required type="time" min="08:31" max="21:30" value={row.end} onChange={event => change('end', event.target.value)} /></Field>
  </div>;
}

function Overview({ bookings, reviews, search, showFinder, showSchedule, choose, cancel }) { const allVenues = VENUES.map(venue => { const rows = reviews.filter(review => review.venueId === venue.id); return { ...venue, average: rows.length ? rows.reduce((sum, review) => sum + review.rating, 0) / rows.length : venue.rating, count: rows.length, price: priceFor(venue, today()) }; }); const visible = allVenues.filter(venue => venue.name.toLowerCase().includes(search.toLowerCase()) || venue.area.toLowerCase().includes(search.toLowerCase())); const carouselVenues = visible.length ? visible : allVenues; const daily = analytics(bookings, today()); const attention = daily.byEquipment.filter(item => item.used / item.capacity >= .75).length; return <section className="es-overview"><div className="es-hero-dashboard"><div className="es-hero-copy"><em>EVENT OPERATIONS</em><h1>Every event,<br />in the <i>right place.</i></h1><p>Discover venues, check real-time availability, and manage your events with confidence.</p><div><button className="es-primary es-hero-primary" onClick={showFinder}>Find a Venue →</button><button className="es-hero-secondary" onClick={showSchedule}>▣ View schedule</button></div></div><VenueCarousel venues={carouselVenues} choose={choose} variant="hero" /></div><div className="es-kpis"><Kpi icon="▣" tone="lavender" value={bookings.filter(row => bookingStatus(row) === 'Upcoming').length} label="Upcoming bookings" /><Kpi icon="◔" tone="peach" value={`${daily.hallUtilization}%`} label="Hall utilization" /><Kpi icon="♟" tone="blue" value={attention} label="Resource constraints" /><Kpi icon="▤" tone="mint" value={reviews.length} label="Stored reviews" /></div><div className="es-operations"><div className="es-overview-schedule"><div className="es-section-title"><h2>Today across your venues</h2><button onClick={showSchedule}>View schedule →</button></div><MiniSchedule bookings={bookings} cancel={cancel} /></div><ResourcePanel metrics={daily} /></div><div className="es-recommended"><div className="es-section-title"><h2>Recommended Venues</h2><button onClick={showFinder}>View all venues →</button></div><VenueCarousel venues={carouselVenues} choose={choose} variant="recommend" /></div></section>; }
function Kpi({ icon, tone, value, label }) { return <article className={`es-kpi ${tone}`}><i>{icon}</i><div><b>{value}</b><span>{label}</span></div></article>; }
function VenueImage({ venue }) { const [missing, setMissing] = useState(false); return missing ? <div className={`es-image-fallback ${venue.color}`}><span>{venue.category}</span></div> : <img src={venue.image} alt={`${venue.name} venue`} loading="lazy" decoding="async" onError={() => setMissing(true)} />; }
function VenueCarousel({ venues, choose, variant }) {
  const [slide, setSlide] = useState(0); const [hovered, setHovered] = useState(false);
  const cards = venues.length ? venues : VENUES.map(venue => ({ ...venue, average: venue.rating, count: 0, price: priceFor(venue, today()) }));
  const slides = Math.max(1, cards.length); const trackCards = [...cards, ...cards.slice(0, Math.min(3, cards.length))];
  const move = amount => setSlide(current => (current + amount + slides) % slides);
  useEffect(() => { if (hovered || slides < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined; const timer = window.setInterval(() => setSlide(current => (current + 1) % slides), 5000); return () => window.clearInterval(timer); }, [hovered, slides]);
  return <div className={`es-carousel es-${variant}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}><button type="button" className="es-carousel-arrow prev" aria-label="Previous venues" title="Previous venues" onClick={() => move(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" /></svg></button><div className="es-carousel-window"><div className="es-carousel-track" style={{ '--slide': slide }}>{trackCards.map((venue, index) => <article className="es-carousel-card" key={`${index}-${venue.id}`}><div className="es-carousel-image"><VenueImage venue={venue} /></div><div className="es-carousel-copy"><h3>{venue.name}</h3><p>⌖ {venue.area}</p><span className="es-tier">{venue.tier}</span>{variant === 'recommend' && <><div className="es-carousel-meta">★ {venue.average?.toFixed(1) || venue.rating} <b>{formatPrice(venue.price?.total || venue.basePrice)}</b> / day</div><small>{venue.capacity} guests · Check availability before booking</small></>}<button onClick={() => choose(venue)}>{variant === 'hero' ? 'View venue →' : 'Start booking →'}</button></div></article>)}</div></div><button type="button" className="es-carousel-arrow next" aria-label="Next venues" title="Next venues" onClick={() => move(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg></button><div className="es-dots">{Array.from({ length: slides }, (_, index) => <button aria-label={`Venue slide ${index + 1}`} className={index === slide ? 'active' : ''} key={index} onClick={() => setSlide(index)} />)}</div></div>;
}
function MiniSchedule({ bookings, cancel }) { const show = bookings.filter(booking => booking.date === today()); return <div className="es-mini-schedule">{VENUES.map(venue => <div className="es-mini-row" key={venue.id}><div><b>{venue.hall}</b><small>{venue.capacity} capacity</small></div><section>{show.filter(booking => booking.venueId === venue.id).map(booking => <article key={booking.id} style={{ left: `${(minutes(booking.start) - 480) / 840 * 100}%`, width: `${(minutes(booking.end) - minutes(booking.start)) / 840 * 100}%` }}><b>{booking.title}</b><small>{booking.start}–{booking.end} · {booking.attendees}</small><button aria-label={`Cancel ${booking.title}`} onClick={() => cancel(booking)}>×</button></article>)}</section></div>)}<div className="es-mini-legend"><span>Available</span><span>Booked</span><span>Setup / cleanup buffer (30 mins)</span></div></div>; }
function ResourcePanel({ metrics }) { const resources = [...metrics.byEquipment, { name: 'Support staff', used: metrics.staff.used, capacity: metrics.staff.capacity }]; return <aside className="es-resource-panel"><div className="es-section-title"><h2>Peak resource allocations</h2></div>{resources.map(resource => { const pct = Math.round(resource.used / resource.capacity * 100); return <article key={resource.name}><div><b>{resource.name}</b><span>{resource.used} / {resource.capacity} / sum of venue peaks</span></div><em><i className={pct >= 90 ? 'critical' : pct >= 75 ? 'limited' : ''} style={{ width: `${pct}%` }} /></em><small>{pct}%</small></article>; })}</aside>; }
function Discover({ form, update, choose, bookings, reviews, setNotice, view }) {
  const [filters, setFilters] = useState({ tier: 'Any', minCapacity: '', maxCapacity: '', minBudget: '', maxBudget: '', minRating: '', amenities: [] });
  const [sort, setSort] = useState('match');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [searched, setSearched] = useState(false);
  const available = costOptimizedRecommendations(VENUES, bookings, reviews, form);
  const availableIds = new Set(available.map(hall => hall.id));
  const visible = VENUES.map(hall => ({
    ...hall,
    ...reviewSummary(reviews, hall),
    price: priceFor(hall, form.date),
    isAvailable: availableIds.has(hall.id),
  })).filter(hall =>
    (!form.location || (hall.region + ' ' + hall.area).toLowerCase().includes(form.location.trim().toLowerCase()))
    &&
    (!filters.tier || filters.tier === 'Any' || hall.tier === filters.tier)
    && (!filters.minCapacity || hall.capacity >= Number(filters.minCapacity))
    && (!filters.maxCapacity || hall.capacity <= Number(filters.maxCapacity))
    && (!filters.minBudget || hall.price.total >= Number(filters.minBudget))
    && (!filters.maxBudget || hall.price.total <= Number(filters.maxBudget))
    && (!filters.minRating || hall.average >= Number(filters.minRating))
    && filters.amenities.every(amenity => hall.equipment.includes(amenity)));
  const results = [...visible].sort((a, b) => sort === 'price'
    ? a.price.total - b.price.total
    : sort === 'capacity'
      ? a.capacity - b.capacity
      : Number(b.isAvailable) - Number(a.isAvailable)
        || Number(b.backendVenue === form.preferredVenue) - Number(a.backendVenue === form.preferredVenue)
        || a.price.total - b.price.total
        || a.capacity - b.capacity);
  const availableCount = results.filter(hall => hall.isAvailable).length;
  const changeFilter = (key, value) => setFilters(old => ({ ...old, [key]: value }));
  const toggleAmenity = amenity => setFilters(old => ({
    ...old,
    amenities: old.amenities.includes(amenity) ? old.amenities.filter(item => item !== amenity) : [...old.amenities, amenity],
  }));
  const resetFilters = () => setFilters({ tier: 'Any', minCapacity: '', maxCapacity: '', minBudget: '', maxBudget: '', minRating: '', amenities: [] });
  const setLocation = location => {
    update('location', location === 'Any' ? '' : location);
    update('selectedHall', null);
    if (location !== 'Any') {
      const venue = BACKEND_VENUES.find(item => VENUE_CITIES[item.id] === location);
      if (venue) update('preferredVenue', venue.id);
    }
  };
  const bookHall = hall => {
    const listing = CATALOGUE_LISTINGS.find(item => item.hall === hall.id);
    void choose({ ...hall, image: listing?.image, selectedHall: hall.id }, { ...form, selectedHall: hall.id });
  };
  const submitSearch = event => {
    event.preventDefault();
    setSearched(true);
    setNotice('');
  };
  return <section className="es-finder-page">
    <header className="es-finder-heading">
      <em>FIND A VENUE</em>
      <h1>Find your <i>perfect</i> venue.</h1>
      <p>Search, compare and book the best venue for your event.</p>
    </header>
    <form className="es-venue-search-bar" onSubmit={submitSearch}>
      <Field label="Location"><select value={form.location || 'Any'} onChange={event => setLocation(event.target.value)}><option value="Any">Any location</option>{Object.values(VENUE_CITIES).map(city => <option key={city}>{city}</option>)}</select></Field>
      <Field label="Event date"><input required type="date" value={form.date} onChange={event => update('date', event.target.value)} /></Field>
      <Field label="Start time"><input required type="time" min="08:30" max="21:29" value={form.start} onChange={event => update('start', event.target.value)} /></Field>
      <Field label="End time"><input required type="time" min="08:31" max="21:30" value={form.end} onChange={event => update('end', event.target.value)} /></Field>
      <Field label="Guests"><input required type="number" min="1" step="1" value={form.attendees} onChange={event => update('attendees', Number(event.target.value))} /></Field>
      <Field label="Budget (₹)"><input required type="number" min="0" value={form.budget} onChange={event => update('budget', Number(event.target.value))} /></Field>
      <button type="submit">Find venues <span aria-hidden="true">→</span></button>
      <details className="es-search-equipment"><summary>Event name, organizer & equipment</summary><div>
        <Field label="Your name"><input maxLength={100} value={form.client} onChange={event => update('client', event.target.value)} placeholder="Name or organization" /></Field>
        <Field label="Event name"><input maxLength={140} value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Annual meetup" /></Field>
        <Field label="Projectors"><input required type="number" min="0" max="100" value={form.projectors} onChange={event => update('projectors', Number(event.target.value))} /></Field>
        <Field label="Audio systems"><input required type="number" min="0" max="100" value={form.audio} onChange={event => update('audio', Number(event.target.value))} /></Field>
        <Field label="Support staff"><input required type="number" min="0" max="100" value={form.staff} onChange={event => update('staff', Number(event.target.value))} /></Field>
      </div></details>
    </form>
    <div className={`es-find-results-layout${filtersCollapsed ? ' filters-collapsed' : ''}`}>
      <aside className="es-find-filters">
        <header><h2>Filters</h2>{!filtersCollapsed && <button type="button" onClick={resetFilters}>Clear all</button>}<button type="button" aria-expanded={!filtersCollapsed} onClick={() => setFiltersCollapsed(value => !value)}>{filtersCollapsed ? 'Show filters' : 'Minimize'}</button></header>
        {!filtersCollapsed && <>
          <FilterGroup title="Venue category"><div className="es-find-tier-options">{['Affordable', 'Premium', 'Luxury'].map(tier => <label key={tier}><input type="checkbox" checked={filters.tier === tier} onChange={() => changeFilter('tier', filters.tier === tier ? 'Any' : tier)} />{tier}</label>)}</div></FilterGroup>
          <FilterGroup title="Capacity"><div className="es-filter-pair"><input aria-label="Minimum capacity" type="number" placeholder="Min" value={filters.minCapacity} onChange={event => changeFilter('minCapacity', event.target.value)} /><input aria-label="Maximum capacity" type="number" placeholder="Max" value={filters.maxCapacity} onChange={event => changeFilter('maxCapacity', event.target.value)} /></div></FilterGroup>
          <FilterGroup title="Budget (₹)"><div className="es-filter-pair"><input aria-label="Minimum venue price" type="number" placeholder="Min" value={filters.minBudget} onChange={event => changeFilter('minBudget', event.target.value)} /><input aria-label="Maximum venue price" type="number" placeholder="Max" value={filters.maxBudget} onChange={event => changeFilter('maxBudget', event.target.value)} /></div></FilterGroup>
          <FilterGroup title="Rating"><select aria-label="Minimum rating" value={filters.minRating} onChange={event => changeFilter('minRating', event.target.value)}><option value="">Any rating</option><option value="4">4.0+ stars</option><option value="4.5">4.5+ stars</option></select></FilterGroup>
          <FilterGroup title="Available amenities"><div className="es-find-tier-options">{['Projector', 'Sound system'].map(amenity => <label key={amenity}><input type="checkbox" checked={filters.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />{amenity}</label>)}</div></FilterGroup>
        </>}
      </aside>
      <div className="es-find-results">
        <div className="es-find-results-heading"><div><h2>Venues for your event</h2><span>{availableCount} available · {results.length} halls shown</span></div><label>Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="match">Best match</option><option value="price">Lowest price</option><option value="capacity">Smallest capacity</option></select></label></div>
        {searched && <p className="es-search-feedback" role="status">Showing {results.length} halls; {availableCount} are available for this request.</p>}
        <div className="es-find-venue-grid">{results.map(hall => {
          const listing = CATALOGUE_LISTINGS.find(item => item.hall === hall.id);
          const venue = { ...hall, image: listing?.image };
          return <VenueTile key={hall.id} venue={venue} choose={() => bookHall(hall)} view={() => view(venue)} />;
        })}</div>
        {!results.length && <div className="es-empty">No halls match these event details. Try another location, increase your budget, or reduce the guest count or equipment needs.</div>}
      </div>
    </div>
  </section>;
}

function VenueTile({ venue, choose, view }) {
  return <article className="es-venue-tile">
    <button className="es-venue-tile-image" type="button" onClick={view} aria-label={`View ${venue.name}`}>
      <VenueImage venue={venue} />
      <span>{venue.tier}</span>
    </button>
    <div className="es-venue-tile-copy">
      <div className="es-venue-tile-title"><h3>{venue.name}</h3><span>{venue.count ? `★ ${venue.average.toFixed(1)}` : 'New'}</span></div>
      <p>{venue.area}</p>
      <div className="es-venue-tile-meta"><span>Up to {venue.capacity} guests</span><strong>{formatPrice(venue.price.total)} <small>/ day</small></strong></div>
      <p className={`es-venue-availability${venue.isAvailable ? ' available' : ''}`}>{venue.isAvailable ? 'Available for this request' : 'Not available for this request'}</p>
      <div className="es-venue-tile-actions">
        <button type="button" className="es-venue-view" onClick={view}>View venue</button>
        <button type="button" className="es-venue-book" disabled={!venue.isAvailable} onClick={choose}>{venue.isAvailable ? 'Book hall' : 'Unavailable'}</button>
      </div>
    </div>
  </article>;
}

function FilterGroup({ title, children }) {
  return <section className="es-find-filter-group"><h3>{title}</h3>{children}</section>;
}

function RecommendationAssistant({ bookings, onBook }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [request, setRequest] = useState(() => ({ ...initialRequest(), attendees: 100, projectors: 0, audio: 0, staff: 0, budget: 50000, location: '', tier: 'Any' }));
  const update = (key, value) => { setRequest(old => ({ ...old, [key]: value })); setSubmitted(false); };
  const suggestions = submitted ? costOptimizedRecommendations(VENUES, bookings, [], request) : [];
  const best = suggestions[0];
  const alternatives = suggestions.slice(1, 5);
  const summary = `${request.attendees} guests · ${request.location || 'Any location'} · ${request.date} · ${request.start}–${request.end} · up to ${formatPrice(Number(request.budget) || 0)}`;
  return <div className="es-assistant">
    {open && <section className="es-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="es-assistant-title">
      <header><div><span>EVENTSYNC VENUE GUIDE</span><h2 id="es-assistant-title">Let’s find your venue</h2></div><button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button></header>
      <div className="es-chat-thread" aria-live="polite">
        <div className="es-chat-message assistant"><b>EventSync assistant</b><p>Tell me about your event. I’ll check every hall for fit and availability, then find the best value.</p></div>
        <form className="es-assistant-form" onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
          <div className="es-chat-form-label">Your event details</div>
          <Field label="Your name"><input required maxLength={100} value={request.client} onChange={event => update('client', event.target.value)} placeholder="Name or organization" /></Field>
          <Field label="Event name"><input required maxLength={140} value={request.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Annual meetup" /></Field>
          <Field label="Location preference"><select value={request.location || 'Any'} onChange={event => {
            const city = event.target.value;
            update('location', city === 'Any' ? '' : city);
            if (city !== 'Any') update('preferredVenue', ({ Pune: 'A', Mumbai: 'B', Bangalore: 'C' })[city]);
          }}><option value="Any">Any location</option><option value="Pune">Pune</option><option value="Mumbai">Mumbai</option><option value="Bangalore">Bangalore</option></select></Field>
          <Field label="Guests"><input required type="number" min="1" max="100000" value={request.attendees} onChange={event => update('attendees', Number(event.target.value))} /></Field>
          <Field label="Date"><input required type="date" value={request.date} onChange={event => update('date', event.target.value)} /></Field>
          <Field label="Budget (INR)"><input required type="number" min="0" value={request.budget} onChange={event => update('budget', Number(event.target.value))} /></Field>
          <Field label="Start time"><input required type="time" min="08:30" max="21:29" value={request.start} onChange={event => update('start', event.target.value)} /></Field>
          <Field label="End time"><input required type="time" min="08:31" max="21:30" value={request.end} onChange={event => update('end', event.target.value)} /></Field>
          <Field label="Projectors"><input required type="number" min="0" max="100" value={request.projectors} onChange={event => update('projectors', Number(event.target.value))} /></Field>
          <Field label="Audio systems"><input required type="number" min="0" max="100" value={request.audio} onChange={event => update('audio', Number(event.target.value))} /></Field>
          <Field label="Support staff"><input required type="number" min="0" max="100" value={request.staff} onChange={event => update('staff', Number(event.target.value))} /></Field>
          <button className="es-assistant-submit" type="submit">Send event details <span aria-hidden="true">↑</span></button>
        </form>
        {submitted && <div className="es-chat-message user"><b>{request.client} · {request.title}</b><p>{summary}</p></div>}
        {submitted && <div className="es-chat-message assistant">
          <b>{best ? 'Here are your best matches' : 'Let’s adjust your search'}</b>
          <p>{best ? 'I checked capacity, budget, equipment and the schedule. The first option is the lowest-cost hall that fits.' : 'I could not find a hall that fits every requirement. Try another location, budget, time, or equipment amount.'}</p>
        </div>}
        {submitted && best && <div className="es-assistant-results">
          <article className="es-best-option">
            <div className="es-best-option-image"><VenueImage venue={{ ...best, image: CATALOGUE_LISTINGS.find(item => item.hall === best.id)?.image }} /><span>BEST VALUE</span></div>
            <div className="es-best-option-copy"><small>{best.area} · up to {best.capacity} guests</small><h3>{best.name}</h3><p>Fits your guest count and budget; best estimated price among available halls.</p><strong>{formatPrice(best.price.total)} <small>/ day estimate</small></strong><button type="button" onClick={() => { setOpen(false); onBook(request, best); }}>Book best value →</button></div>
          </article>
          {alternatives.length > 0 && <><h3 className="es-alternative-heading">Other options that fit</h3>{alternatives.map(hall => <article className="es-alternative-option" key={hall.id}>
            <div className="es-alternative-image"><VenueImage venue={{ ...hall, image: CATALOGUE_LISTINGS.find(item => item.hall === hall.id)?.image }} /></div>
            <div><b>{hall.name}</b><small>{hall.area} · up to {hall.capacity} guests</small><strong>{formatPrice(hall.price.total)} <small>/ day</small></strong></div>
            <button type="button" onClick={() => { setOpen(false); onBook(request, hall); }}>Choose</button>
          </article>)}</>}
          <small className="es-assistant-disclaimer">Prices are estimates. Every option is checked again when you book.</small>
        </div>}
      </div>
    </section>}
    <button className={`es-assistant-launch${open ? ' open' : ''}`} type="button" aria-label={open ? 'Close event recommendation assistant' : 'Open event recommendation assistant'} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {open ? '×' : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 7.4 7.4 0 0 1-3.6-.9L4 20l1.9-4.1a7.5 7.5 0 1 1 14.1-4.4Z" /><path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01" /></svg>}
    </button>
  </div>;
}
function Schedule({ bookings, cancel }) {
  const [date, setDate] = useState(today); const [venueId, setVenueId] = useState('A');
  const metrics = analytics(bookings, date, venueId);
  const hours = Array.from({ length: 14 }, (_, i) => i + 8);
  return <section className="es-page"><div className="es-tools"><div>
    <button aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>Previous</button>
    <input aria-label="Schedule date" type="date" required value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} />
    <button aria-label="Next day" onClick={() => setDate(shiftDate(date, 1))}>Next</button>
    <button onClick={() => setDate(today())}>Today</button>
    <select aria-label="Schedule venue" value={venueId} onChange={event => setVenueId(event.target.value)}>{BACKEND_VENUES.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select>
  </div><p>Confirmed events / 30-minute setup / cleanup</p></div>
  <div className="es-meters"><Meter label="Hall utilization including buffers" used={metrics.hallUtilization} capacity={100} /><Meter label="Peak support staff" used={metrics.staff.used} capacity={metrics.staff.capacity} /><Meter label="Peak resource demand begins" text={metrics.peak} /></div>
  <div className="es-resource-insights">{metrics.byEquipment.map(item => <span key={item.name}>{item.name}: {item.used}/{item.capacity} peak allocation</span>)}</div>
  <div className="es-timeline"><div className="es-time"><span>HALL</span>{hours.map(hour => <span key={hour}>{hour}:00</span>)}</div>
    {VENUES.filter(venue => venue.backendVenue === venueId).map(venue => <div className="es-row" key={venue.id}><div><b>{venue.hall}</b><small>{venue.name}</small></div><section>{metrics.day.filter(booking => booking.venueId === venue.id).map(booking => <article key={booking.id} style={{ left: (minutes(booking.start) - 480) / 840 * 100 + '%', width: (minutes(booking.end) - minutes(booking.start)) / 840 * 100 + '%' }}><i className="left" /><i className="right" /><b>{booking.title}</b><small>{booking.start} - {booking.end}</small><button aria-label={'Cancel ' + booking.title} onClick={() => cancel(booking)}>Close</button></article>)}</section></div>)}
  </div><p>Resources remain allocated during setup and cleanup. Cancelled and rejected requests do not reserve anything.</p></section>;
}
function Meter({ label, used, capacity, text }) { const pct = capacity ? Math.min(100, Math.round(used / capacity * 100)) : 0; return <div><span>{label}</span><b className={pct >= 75 ? 'warn' : ''}>{text || `${pct}%`}</b>{capacity && <em><i style={{ width: `${pct}%` }} /></em>}</div>; }
function Bookings({ bookings, cancel, reschedule, goFind, audit }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('All');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const rows = bookings.filter(booking => (booking.id + ' ' + booking.title + ' ' + booking.client + ' ' + (booking.hall || '')).toLowerCase().includes(query.toLowerCase()) && (status === 'All' || bookingStatus(booking, now) === status));
  return <section className="es-page es-management es-bookings-page"><div className="es-bookings-hero"><div><h1>Your event bookings.</h1><p>Every request, client and allocation from SQLite.</p></div><button className="es-new-booking" onClick={goFind}>New Booking</button></div>
    <div className="es-booking-kpis"><BookingMetric tone="lavender" value={bookings.length} label="Total requests" />{['Upcoming','Completed','Cancelled','Rejected'].map(label => <BookingMetric key={label} tone="blue" value={bookings.filter(row => bookingStatus(row, now) === label).length} label={label} />)}</div>
    <div className="es-management-card"><div className="es-management-tools"><input aria-label="Search bookings" placeholder="Client, event, hall or booking ID" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Booking status" value={status} onChange={event => setStatus(event.target.value)}>{['All','Upcoming','Completed','Cancelled','Rejected'].map(value => <option key={value}>{value}</option>)}</select></div>
    {rows.length ? <div className="es-table-scroll"><table className="es-booking-table"><thead><tr><th>Event / Client</th><th>Allocated hall</th><th>Schedule</th><th>Guests / Resources</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(booking => {
      const state = bookingStatus(booking, now);
      let reason = ''; try { reason = booking.reason ? decisionMessage({ decision: JSON.parse(booking.reason) }) : ''; } catch { reason = booking.reason || ''; }
      return <tr key={booking.id}><td><b>{booking.title}</b><small>{booking.client} / {booking.id}</small></td><td><b>{booking.hall || 'Unallocated'}</b><small>Venue {booking.backendVenue || booking.preferredVenue}</small></td><td><b>{booking.date}</b><small>{booking.start} - {booking.end}</small></td><td>{booking.attendees} guests<small>{booking.projectors} projectors / {booking.audio} audio / {booking.staff} staff</small></td><td><span className={'es-status-badge ' + state.toLowerCase()}>{state}</span>{reason && <details><summary>Conflict reasons</summary><p>{reason}</p></details>}</td><td>{booking.status === 'confirmed' && <div className="es-row-actions"><button onClick={() => reschedule(booking)}>Reschedule</button><button onClick={() => cancel(booking)}>Cancel</button></div>}</td></tr>;
    })}</tbody></table></div> : <div className="es-empty">No matching bookings. <button onClick={goFind}>Create a request</button></div>}</div>
    <details className="es-card"><summary>Booking change log ({audit.length} recent entries)</summary>{audit.map(item => <p key={item.id}>#{item.bookingId} / {item.action} / {item.detail} <small>{item.createdAt} UTC</small></p>)}</details>
  </section>;
}
function BookingMetric({ tone, value, label }) { return <article className={`es-booking-metric ${tone}`}><span>{label}</span><b>{value}</b><small>Live booking data</small></article>; }
function Recurring({ bulk, setBulk, run, submitting }) { const [result, setResult] = useState(null); const change = (key, value) => { setResult(null); setBulk(old => ({ ...old, [key]: value })); }; let preview = []; try { preview = seriesDates(bulk.date, bulk.frequency, Number(bulk.occurrences)).slice(0, 6); } catch { /* Invalid input stays editable. */ } const submit = async () => { const outcome = await run(); if (outcome) setResult(outcome); }; const modeNote = bulk.mode === 'atomic' ? 'Every occurrence must pass server validation before any reservation is saved.' : 'Available occurrences are saved; unavailable dates remain visible for review.'; return <section className="es-page es-management es-recurring-page"><div className="es-management-heading"><em>RECURRING EVENTS</em><h1>Plan events that repeat <i>beautifully.</i></h1><p>Create a recurring schedule, check availability, and manage every occurrence from one place.</p></div><div className="es-recurring-layout"><div className="es-card es-recurring-config"><div className="es-form-card-heading"><div><b>Recurring event details</b><small>Availability is validated against the connected booking service.</small></div><span>Step 1 of 1</span></div><div className="es-form-section"><b>Schedule</b><div className="es-fields"><Field label="Client"><input value={bulk.client} maxLength={100} onChange={event => change('client', event.target.value)} /></Field><Field wide={true} label="Event name"><input value={bulk.title} onChange={event => change('title', event.target.value)} /></Field><Field label="First event date"><input type="date" value={bulk.date} onChange={event => change('date', event.target.value)} /></Field><Field label="Frequency"><select value={bulk.frequency} onChange={event => change('frequency', event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></Field><Field label="Occurrences"><input type="number" min="2" max="12" value={bulk.occurrences} onChange={event => change('occurrences', event.target.value)} /></Field></div></div><div className="es-form-section"><b>Venue and resources</b><div className="es-fields"><Field label="Preferred venue"><select value={bulk.preferredVenue} onChange={event => change('preferredVenue', event.target.value)}>{BACKEND_VENUES.map(venue => <option key={venue.id} value={venue.id}>{venue.name} · {venue.detail}</option>)}</select></Field><Field label="Attendees"><input type="number" min="1" value={bulk.attendees} onChange={event => change('attendees', event.target.value)} /></Field><Field label="Projectors"><input type="number" min="0" value={bulk.projectors} onChange={event => change('projectors', event.target.value)} /></Field><Field label="Audio systems"><input type="number" min="0" value={bulk.audio} onChange={event => change('audio', event.target.value)} /></Field><Field label="Support staff"><input type="number" min="0" value={bulk.staff} onChange={event => change('staff', event.target.value)} /></Field><Field label="Start time"><input type="time" value={bulk.start} onChange={event => change('start', event.target.value)} /></Field><Field label="End time"><input type="time" value={bulk.end} onChange={event => change('end', event.target.value)} /></Field><Field wide={true} label="Booking mode"><select value={bulk.mode} onChange={event => change('mode', event.target.value)}><option value="atomic">Atomic — reserve every occurrence or save none</option><option value="feasible">Feasible only — save available occurrences and report the rest</option></select></Field></div><div className="es-mode-note"><b>{bulk.mode === 'atomic' ? 'Atomic booking' : 'Feasible-only booking'}</b><span>{modeNote}</span></div></div><button disabled={submitting} className="es-primary es-full es-lavender-action" onClick={submit}>{submitting ? 'Validating with booking service…' : 'Validate & create series'}</button>{result && <ResultPanel result={result} />}</div><aside className="es-series-preview"><div className="es-preview-heading"><div><b>Occurrence preview</b><small>{bulk.frequency} schedule</small></div><span>{preview.length} of {bulk.occurrences}</span></div><div className="es-preview-list">{preview.map((date, index) => <div className="es-preview-row" key={`${date}-${index}`}><i>{index + 1}</i><div><b>{date}</b><small>{bulk.start}–{bulk.end}</small></div></div>)}</div><p>{modeNote}</p></aside></div></section>; }
function ResultPanel({ result }) { const outcomes = result.results || []; if (result.error) return <div className="es-result-panel error">{result.error}</div>; return <div className={`es-result-panel ${result.committed ? 'success' : 'error'}`}><b>{result.committed ? 'Booking decision complete' : 'Nothing was saved'}</b><p>{result.message || `${outcomes.filter(item => item.booking?.status === 'confirmed').length} request(s) confirmed.`}</p>{outcomes.filter(item => !item.ok).slice(0, 3).map(item => <small key={item.index}>Occurrence {item.index + 1}: {item.error || decisionMessage(item)}</small>)}</div>; }
function Bulk({ refresh, submitting, setSubmitting, notice }) {
  const fresh = () => ({ ...initialRequest(), key: crypto.randomUUID() });
  const [rows, setRows] = useState(() => [fresh()]); const [mode, setMode] = useState('atomic'); const [result, setResult] = useState(null);
  const inFlight = useRef(false);
  const update = (index, key, value) => { setResult(null); setRows(old => old.map((row, position) => position === index ? { ...row, [key]: value } : row)); };
  const submit = async event => {
    event.preventDefault(); if (submitting || inFlight.current) return; inFlight.current = true; setSubmitting(true); setResult(null);
    try {
      const response = await postBookingApi('/api/bookings/batch', { requests: rows.map(toBackendRequest), mode }); setResult(response);
      notice(response.committed ? response.results.filter(item => item.booking?.status === 'confirmed').length + ' of ' + rows.length + ' booking requests confirmed in SQLite.' : response.message);
      await refresh();
    } catch (error) { notice(error.message); } finally { inFlight.current = false; setSubmitting(false); }
  };
  return <section className="es-page es-management es-bulk-page"><div className="es-management-heading"><h1>Bulk booking</h1><p>Validate several client requests in one transaction.</p></div>
    <form className="es-bulk-workspace" onSubmit={submit}><div className="es-bulk-toolbar"><b>{rows.length} booking requests</b><label>Booking mode<select value={mode} onChange={event => setMode(event.target.value)}><option value="atomic">Atomic ? all or none</option><option value="feasible">Feasible only</option></select></label><button disabled={submitting || rows.length >= 20} type="button" onClick={() => setRows(old => [...old, fresh()])}>Add request</button><button type="button" disabled={submitting} onClick={() => { setRows([fresh()]); setResult(null); }}>Clear requests</button></div>
    {rows.map((row, index) => <article className="es-bulk-request" key={row.key}><div className="es-request-heading"><b>Request {index + 1}</b><button type="button" disabled={rows.length === 1 || submitting} onClick={() => { setRows(old => old.filter(item => item.key !== row.key)); setResult(null); }}>Remove</button></div><RequestFields row={row} change={(key, value) => update(index, key, value)} /></article>)}
    <div className="es-bulk-submit"><button className="es-primary" disabled={submitting} type="submit">{submitting ? 'Validating...' : 'Submit bulk booking'}</button></div>{result && <ResultPanel result={result} />}</form></section>;
}
function Reviews({ reviews, reviewForm, setReviewForm, submit }) { const venue = VENUES.find(item => item.id === reviewForm.venueId); const venueReviews = reviews.filter(item => item.venueId === venue.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const average = venueReviews.length ? venueReviews.reduce((sum, item) => sum + item.rating, 0) / venueReviews.length : 0; return <section className="es-page"><div className="es-intro"><div><em>VENUE FEEDBACK</em><h2>Venue ratings from stored reviews.</h2><p>Share your experience and rate the venue. Reviews are saved in this browser.</p></div></div><div className="es-review-grid"><div className="es-card"><div className="es-card-title"><b>Share your experience</b><small>One review per venue</small></div><form className="es-review-form" onSubmit={submit}><Field label="Venue"><select value={reviewForm.venueId} onChange={e => setReviewForm(old => ({ ...old, venueId: e.target.value }))}>{VENUES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Rating"><select value={reviewForm.rating} onChange={e => setReviewForm(old => ({ ...old, rating: e.target.value }))}>{[5,4,3,2,1].map(item => <option key={item} value={item}>{item} star{item > 1 ? 's' : ''}</option>)}</select></Field><Field label="Review (20–500 characters)"><textarea value={reviewForm.text} maxLength="500" onChange={e => setReviewForm(old => ({ ...old, text: e.target.value }))} placeholder="Tell other organizers what worked well…" /></Field><small>{reviewForm.text.length}/500 · 20 characters minimum.</small><button className="es-primary" type="submit">Save review →</button></form></div><div className="es-review-summary"><div className="es-rating-big"><b>{venueReviews.length ? average.toFixed(1) : 'No ratings'}</b><span>★★★★★</span><small>{venueReviews.length} stored reviews</small></div><h3>{venue.name}</h3>{venueReviews.map(review => <article key={review.id}><b>{review.reviewerId === 'organizer' ? 'You' : review.name} <span>{'★'.repeat(review.rating)}</span></b><small>{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small><p>{review.text}</p></article>)}</div></div></section>; }
function VenueDetails({ venue, close, book }) { return <div className="es-modal-wrap" role="dialog" aria-modal="true" aria-label="Venue details"><div className="es-modal es-details"><button className="es-x" aria-label="Close venue details" onClick={close}>×</button><div className="es-details-image"><VenueImage venue={venue} /></div><em>{venue.tier.toUpperCase()} VENUE</em><h2>{venue.name}</h2><p>⌖ {venue.area} · {venue.hall}</p><dl><dt>Rating</dt><dd>★ {venue.average.toFixed(1)} ({venue.count} reviews)</dd><dt>Capacity</dt><dd>{venue.capacity} guests</dd><dt>Estimate</dt><dd>{formatPrice(venue.price.total)} / day</dd><dt>Resources</dt><dd>{venue.equipment.join(', ')}</dd></dl>{venue.isAvailable === false && <p className="es-venue-availability">Not available for this request</p>}<button disabled={venue.isAvailable === false} className="es-primary es-full" onClick={book}>{venue.isAvailable === false ? 'Unavailable for this request' : 'Book this venue →'}</button></div></div>; }
function Confirm({ venue, form, submitting, close, confirm }) { return <div className="es-modal-wrap" role="dialog" aria-modal="true" aria-label="Confirm booking"><div className="es-modal"><button className="es-x" aria-label="Close confirmation" onClick={close}>×</button><em>FINAL CONFIRMATION</em><h2>Reserve {venue.hall}?</h2>{venue.fallback && <p>Your preferred venue could not accommodate this request. This is a fallback allocation.</p>}<p>{form.client} / {form.title}</p><p>{form.date} · {form.start}–{form.end} · {form.attendees} guests</p><dl><dt>Venue</dt><dd>{venue.name}</dd><dt>Original estimate</dt><dd>{formatPrice(venue.price.original)}</dd><dt>Offer discount</dt><dd>−{formatPrice(venue.price.discount)}</dd><dt>Final estimated total</dt><dd>{formatPrice(venue.price.total)}</dd><dt>Requested resources</dt><dd>{form.projectors} projectors / {form.audio} audio / {form.staff} staff</dd><dt>Protected time</dt><dd>{addMinutes(form.start, -30)}–{addMinutes(form.end, 30)}</dd></dl><p className="es-muted">The server rechecks this allocation before saving. If availability changes, please validate again. Prices are illustrative estimates.</p><button disabled={submitting} className="es-primary es-full" onClick={confirm}>{submitting ? 'Validating booking…' : 'Confirm and validate booking →'}</button></div></div>; }
function Cancel({ booking, close, confirm }) { return <div className="es-modal-wrap" role="dialog" aria-modal="true" aria-label="Cancel booking"><div className="es-modal"><button className="es-x" aria-label="Close cancellation" onClick={close}>×</button><em>CONFIRM CANCELLATION</em><h2>Cancel this booking?</h2><p><b>{booking.title}</b> · {booking.date} · {booking.start}–{booking.end}</p><p className="es-muted">This releases the hall and any assigned resources. The cancelled record remains in booking history.</p><div className="es-modal-actions"><button className="es-secondary" onClick={close}>Keep booking</button><button className="es-danger" onClick={confirm}>Cancel booking</button></div></div></div>; }
