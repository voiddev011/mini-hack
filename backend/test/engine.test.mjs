import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore, validate, allocate, alternatives, seriesDates } from '../engine.mjs';
import { app } from '../server.mjs';
const request = (changes={}) => ({client:'Test client',title:'Test event',date:'2026-10-30',start:'10:00',end:'13:00',attendees:50,preferredVenue:'A',projectors:1,audio:0,staff:2,...changes});
function storeTest(name, fn){test(name,()=>{const s=createStore();try{fn(s);}finally{s.close();}});}
storeTest('selects smallest preferred hall and records client',s=>{const r=s.book(request());assert.equal(r.booking.hall,'A1');assert.equal(s.db.prepare('SELECT count(*) AS n FROM clients').get().n,1);});
storeTest('prefers preferred venue even when another venue has a smaller hall',s=>{assert.equal(s.book(request({attendees:100})).booking.hall,'A2');});
storeTest('honors an explicitly selected hall and rejects it if it cannot fit',s=>{
  assert.equal(s.book(request({selectedHall:'A2'})).booking.hall,'A2');
  assert.equal(s.evaluate(request({attendees:200,selectedHall:'A1'})).decision.ok,false);
  assert.throws(()=>s.evaluate(request({selectedHall:'B1'})),/belongs to the selected venue/);
});
storeTest('PDF sample permits two events but third must leave venue A because of buffers',s=>{
  assert.equal(s.book(request({title:'Conference',attendees:120,staff:3})).booking.hall,'A2');
  assert.equal(s.book(request({title:'Workshop',start:'11:00',end:'14:00',staff:2})).booking.hall,'A1');
  const third=s.book(request({title:'Launch',attendees:100,start:'13:15',end:'15:00'}));
  assert.equal(third.booking.hall,'B1');assert.equal(third.decision.fallback,true);
});
storeTest('touching reserved endpoints are valid; one minute overlap is not',s=>{
  s.book(request({attendees:250,preferredVenue:'C'}));
  assert.equal(s.evaluate(request({attendees:250,preferredVenue:'C',start:'13:59',end:'15:00'})).decision.ok,false);
  assert.equal(s.evaluate(request({attendees:250,preferredVenue:'C',start:'14:00',end:'15:00'})).decision.hall,'C2');
});
test('operating hours include both buffers',()=>{
  assert.equal(validate(request({start:'08:30',end:'21:30'})).reservedStart,480);
  for(const patch of [{start:'08:29'},{end:'21:31'},{start:'13:00',end:'13:00'},{date:'2026-02-30'},{projectors:-1},{staff:1.5},{attendees:0},{start:'9:00'}])assert.throws(()=>validate(request(patch)));
});
storeTest('venue resource exhaustion causes fallback despite a free hall',s=>{
  s.book(request({attendees:120,projectors:2,staff:5}));
  const r=s.book(request());assert.equal(r.booking.hall,'C1');
  assert.ok(r.decision.diagnostics.find(d=>d.hall==='A1').reasons.some(r=>r.includes('projectors:')));
});
test('sweep checks peak usage rather than sum of all intersecting bookings',()=>{
  const r=validate(request({start:'10:00',end:'16:00',projectors:1,staff:0}));
  const existing=[{...validate(request({start:'09:00',end:'11:00',staff:0})),hall:'A2',venue:'A',status:'confirmed'}, {...validate(request({start:'12:00',end:'15:00',staff:0})),hall:'A2',venue:'A',status:'confirmed'}];
  assert.equal(allocate(r,existing).hall,'A1');
});
test('sweep detects a resource peak occurring inside a reservation',()=>{
  const r=validate(request({start:'10:00',end:'16:00',staff:3,projectors:0}));
  const existing=[{...validate(request({start:'12:00',end:'13:00',staff:3,projectors:0})),hall:'A2',venue:'A',status:'confirmed'}];
  const d=allocate(r,existing);assert.notEqual(d.venue,'A');assert.ok(d.diagnostics[0].reasons.some(r=>r.includes('staff: needs 6')));
});
storeTest('failed reschedule leaves original row exactly unchanged',s=>{
  const original=s.book(request({attendees:250,preferredVenue:'C'})).booking;
  s.book(request({attendees:250,preferredVenue:'C',start:'15:00',end:'17:00'}));
  const result=s.reschedule(original.id,{start:'15:00',end:'17:00'});
  assert.equal(result.preserved,true);assert.deepEqual(s.list().find(b=>b.id===original.id),original);
});
storeTest('rescheduling excludes own resources and can retain current hall',s=>{
  const r=s.book(request({staff:5}));assert.equal(s.reschedule(r.booking.id,{start:'10:15',end:'13:15'}).decision.hall,'A1');
});
storeTest('cancellation releases hall and resource capacity',s=>{
  const r=s.book(request({attendees:250,preferredVenue:'C',staff:6}));
  assert.equal(s.evaluate(request({attendees:250,preferredVenue:'C'})).decision.ok,false);
  s.cancel(r.booking.id);assert.equal(s.book(request({attendees:250,preferredVenue:'C'})).decision.ok,true);
});
storeTest('rejected requests persist but reserve no resources',s=>{
  const r=s.book(request({attendees:251}));assert.equal(r.booking.status,'rejected');assert.equal(s.book(request()).booking.hall,'A1');
});
storeTest('every suggested alternative is actually feasible and preserves duration',s=>{
  s.book(request({attendees:250,preferredVenue:'C'}));const r=validate(request({attendees:250,preferredVenue:'C',start:'11:00',end:'13:00'}));
  const suggestions=alternatives(r,s.list());assert.equal(suggestions.length,3);
  for(const a of suggestions){const next=validate({...r,...a});assert.equal(allocate(next,s.list()).ok,true);assert.equal(next.reservedEnd-next.reservedStart,r.reservedEnd-r.reservedStart);}
});
storeTest('different dates do not conflict and fallback is deterministic',s=>{
  s.book(request({attendees:250,preferredVenue:'C'}));assert.equal(s.book(request({attendees:250,preferredVenue:'C',date:'2026-10-31'})).booking.hall,'C2');
});
test('data persists after reopening SQLite',()=>{
  const dir=mkdtempSync(join(tmpdir(),'eventsync-'));try{const path=join(dir,'test.sqlite');let s=createStore(path);s.book(request());s.close();s=createStore(path);assert.equal(s.list().length,1);assert.equal(s.audit().length,1);s.close();}finally{rmSync(dir,{recursive:true,force:true});}
});
test('series dates expand weekly, fortnightly and clamp monthly ends',()=>{
  assert.deepEqual(seriesDates('2026-10-30', 'weekly', 4), ['2026-10-30','2026-11-06','2026-11-13','2026-11-20']);
  assert.deepEqual(seriesDates('2026-01-31', 'monthly', 3), ['2026-01-31','2026-02-28','2026-03-31']);
  assert.equal(seriesDates('2026-10-30', 'fortnightly', 3)[2], '2026-11-27');
});
storeTest('atomic batch writes nothing when a later request cannot be allocated',s=>{
  const first=request({title:'Large A',attendees:250,preferredVenue:'C'});
  const second=request({title:'Large B',attendees:250,preferredVenue:'C',start:'10:15',end:'13:15'});
  const result=s.bookMany([first,second],'atomic');
  assert.equal(result.committed,false);assert.equal(s.list().length,0);assert.equal(result.results[0].ok,true);assert.equal(result.results[1].ok,false);
});
storeTest('feasible batch confirms valid requests and records the rest as rejected',s=>{
  const result=s.bookMany([request({title:'Fits'}),request({title:'Too large',attendees:251})],'feasible');
  assert.equal(result.committed,true);assert.equal(result.results[0].booking.status,'confirmed');assert.equal(result.results[1].booking.status,'rejected');assert.equal(s.list().length,2);
});
storeTest('atomic series books every occurrence or none',s=>{
  const ok=s.bookSeries({...request({title:'Weekly review'}),frequency:'weekly',occurrences:3,mode:'atomic'});
  assert.equal(ok.committed,true);assert.equal(ok.results.length,3);assert.ok(ok.results.every(r=>r.booking.status==='confirmed'));
  const blocked=s.bookSeries({...request({title:'Impossible',attendees:251,date:'2026-11-01'}),frequency:'weekly',occurrences:2,mode:'atomic'});
  assert.equal(blocked.committed,false);assert.equal(s.list().filter(b=>b.title==='Impossible').length,0);
});
test('HTTP workflow validates, books, checks own reschedule, cancels, and rejects malformed JSON',async()=>{
  const s=createStore(),server=app(s);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const post=(path,body)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/app.js')).status,200);
    const response=await post('/api/bookings',request());assert.equal(response.status,201);const r=await response.json();assert.equal(r.booking.status,'confirmed');
    const check=await post('/api/check',{...request(),excludeId:r.booking.id});assert.equal((await check.json()).decision.hall,'A1');
    const cancelled=await post('/api/bookings/'+r.booking.id+'/cancel',{});assert.equal(cancelled.status,200);
    const state=await (await fetch(url+'/api/state')).json();assert.equal(state.bookings[0].status,'cancelled');
    assert.equal((await post('/api/bookings',request({date:'bad'}))).status,400);
    assert.equal((await fetch(url+'/api/bookings',{method:'POST',body:'{'})).status,400);
    assert.equal((await fetch(url+'/api/bookings',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'})).status,403);
    assert.equal((await fetch(url+'/not-a-file')).status,404);
    const series=await post('/api/bookings/series',{...request({title:'API series',date:'2026-11-02'}),frequency:'daily',occurrences:2,mode:'feasible'});
    assert.equal(series.status,200);const seriesBody=await series.json();assert.equal(seriesBody.committed,true);assert.equal(seriesBody.results.length,2);
  }finally{await new Promise(resolve=>server.close(resolve));s.close();}
});
