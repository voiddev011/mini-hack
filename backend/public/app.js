// Local SVG fallbacks keep navigation legible when the optional icon CDN is offline.
const fallbackPaths={
  'calendar-range':'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M14 17h3',
  'list-filter':'M4 6h16 M7 12h10 M10 18h4',
  'map':'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
  'history':'M3 10a9 9 0 1 1 2 8 M3 4v6h6 M12 7v6l4 2',
  'plus':'M12 5v14 M5 12h14',
  'ticket-check':'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4z M8 12l3 3 5-6',
  'users':'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a6 6 0 0 1 12 0v2 M17 4a4 4 0 0 1 0 8 M17 15a5 5 0 0 1 5 5v1',
  'building-2':'M4 22V4h10v18 M14 9h6v13 M8 8h2 M8 12h2 M8 16h2 M17 13h1 M17 17h1 M2 22h20',
  'chevron-left':'M15 5l-7 7 7 7',
  'chevron-right':'M9 5l7 7-7 7',
  'route':'M4 4h12a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h12 M17 17l3 3-3 3',
  'info':'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 10v7 M12 6v1',
  'repeat':'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
  'layers':'M12 2l10 6-10 6L2 8z M2 14l10 6 10-6'
};
for(const icon of document.querySelectorAll('[data-lucide]')){const path=fallbackPaths[icon.dataset.lucide];if(path){icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';}}
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const minute = t => Number(t.slice(0,2))*60 + Number(t.slice(3));
const clock = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const localToday = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
let state={bookings:[],venues:[],audit:[]}, editing=null, result=null, toastTimer, bulkRequests=[], bulkMode='atomic';
$('#timeline-date').value=localToday();
async function api(path, body) {
  const response=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok)throw new Error(data.error || 'Request failed.'); return data;
}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
async function refresh(){try{state=await api('state');$('#load-error').hidden=true;document.querySelector('.local-badge').innerHTML='<span class="live-dot"></span> Connected';render();}catch(e){document.querySelector('.local-badge').textContent='Connection unavailable';$('#load-error').textContent='Could not load workspace: '+e.message;$('#load-error').hidden=false;throw e;}}
const pill=b=>'<span class="pill '+esc(b.status)+'">'+esc(b.status)+'</span>';
function render(){
  const confirmed=state.bookings.filter(b=>b.status==='confirmed');
  $('#stat-events').textContent=confirmed.length;$('#stat-guests').textContent=confirmed.reduce((n,b)=>n+b.attendees,0).toLocaleString();$('#nav-count').textContent=state.bookings.length;
  renderTimeline();renderBookings();
  window.lucide?.createIcons();
  $('#venue-cards').innerHTML=state.venues.map(v=>'<article class="venue-card"><div class="venue-monogram">'+v.id+'</div><div class="venue-kicker">Venue '+v.id+'</div><h2>'+esc(v.name)+'</h2><p>Two halls, one shared resource pool.</p>'+v.halls.map(h=>'<div class="hall-chip"><strong>Hall '+h.id+'</strong><span>'+h.capacity+' seats</span></div>').join('')+'<div class="resource-list"><div>Projectors<strong>'+v.projectors+'</strong></div><div>Audio systems<strong>'+v.audio+'</strong></div><div>Support staff<strong>'+v.staff+'</strong></div></div></article>').join('');
  $('#activity-list').innerHTML=state.audit.length?state.audit.map(a=>'<article class="audit-item"><div class="audit-icon">'+(a.action==='cancelled'?'−':'↗')+'</div><div><strong>'+esc(a.action)+' · Booking #'+a.bookingId+'</strong><p>'+esc(a.detail)+'</p><small>'+esc(a.createdAt)+' UTC</small></div></article>').join(''):'<div class="empty-state"><strong>No changes recorded yet.</strong>Booking decisions and schedule changes will appear here.</div>';
}
function renderTimeline(){
  const date=$('#timeline-date').value,bookings=state.bookings.filter(b=>b.status==='confirmed'&&b.date===date);
  let html='<div class="timeline-axis"><div>Hall and seats</div><div class="axis-hours">'+Array.from({length:15},(_,i)=>'<span style="left:'+(i/14*100)+'%">'+String(i+8).padStart(2,'0')+'</span>').join('')+'</div></div>';
  for(const v of state.venues)for(const h of v.halls){
    html+='<div class="timeline-row '+(h.id.endsWith('1')?'venue-start':'')+'"><div class="hall-label"><div>'+h.id+'<small>'+h.capacity+' seats</small></div></div><div class="track '+(bookings.some(b=>b.hall===h.id)?'':'is-empty')+'">';
    for(const b of bookings.filter(b=>b.hall===h.id)){
      const showBuffers = !document.querySelector('.schedule').classList.contains('hide-buffers');
      const from=showBuffers?b.reservedStart:minute(b.start),to=showBuffers?b.reservedEnd:minute(b.end);
      const total=to-from,buffer=showBuffers?30/total*100:0;
      html+='<button class="event-slot venue-'+v.id+'" data-details="'+b.id+'" style="left:'+((from-480)/840*100)+'%;width:'+(total/840*100)+'%" aria-label="'+esc(b.title+', '+b.start+' to '+b.end+', reserved '+clock(b.reservedStart)+' to '+clock(b.reservedEnd))+'"><span style="width:'+buffer+'%;flex-shrink:0"></span><span class="event-center" style="width:'+(100-2*buffer)+'%">'+esc(b.title)+'<small>'+esc(b.start)+'–'+esc(b.end)+'</small></span></button>';
    }
    html+='</div></div>';
  }
  $('#timeline').innerHTML=html;
  $('#upcoming').innerHTML=bookings.length?bookings.slice(0,4).map(b=>'<div class="upcoming-item" role="button" tabindex="0" data-details="'+b.id+'"><div class="event-date"><small>'+esc(new Date(b.date+'T12:00').toLocaleDateString('en',{month:'short'}).toUpperCase())+'</small>'+b.date.slice(8)+'</div><div><strong>'+esc(b.title)+'</strong><p>'+esc(b.start)+'–'+esc(b.end)+' · Hall '+b.hall+' · '+b.attendees+' guests</p></div>'+pill(b)+'</div>').join(''):'<div class="empty-state"><strong>No events on this date.</strong>The floor is clear. Add a request or load the sample scenario.</div>';
}
function renderBookings(){
  const search=$('#search').value.toLowerCase(),status=$('#status-filter').value;
  const bookings=state.bookings.filter(b=>(status==='all'||b.status===status)&&(b.title+' '+b.client).toLowerCase().includes(search));
  $('#booking-rows').innerHTML=bookings.length?bookings.map(b=>'<tr><td><strong>'+esc(b.title)+'</strong><small>'+esc(b.client)+' · '+b.attendees+' guests</small></td><td>'+esc(b.date)+'<small>'+esc(b.start)+'–'+esc(b.end)+'</small></td><td>'+(b.hall?'Hall '+b.hall:'Unallocated')+'<small>Preferred: Venue '+esc(b.preferredVenue)+'</small></td><td>'+b.projectors+' projector(s)<small>'+b.audio+' audio · '+b.staff+' staff</small></td><td>'+pill(b)+'</td><td><button data-details="'+b.id+'">Details</button>'+(b.status==='confirmed'?'<button data-edit="'+b.id+'">Reschedule</button><button class="danger" data-cancel="'+b.id+'">Cancel</button>':'')+'</td></tr>').join(''):'<tr><td colspan="6" class="empty-table">No bookings match this view.</td></tr>';
}
function navigate(view){
  const headings={overview:['Schedule','Manage halls, equipment and crew in one place.'],bookings:['Bookings','View requests, allocations and booking changes.'],recurring:['Recurring events','Book a related series on a repeating schedule. Every date uses the same hall, buffer and resource checks.'],bulk:['Bulk booking','Send several independent event requests together, then review what was confirmed or declined.'],venues:['Spaces & crew','Hall capacity and shared resources at each venue.'],activity:['Change log','Recent booking decisions and schedule changes.']};
  if(!headings[view])return;
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==view+'-view');document.querySelectorAll('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('#page-title').textContent=headings[view][0];$('#page-subtitle').textContent=headings[view][1];
  $('.heading-action').hidden=view==='recurring'||view==='bulk';
  if(view==='recurring')renderSeriesPreview();
  if(view==='bulk')renderBulk();
}
function formInput(){const values=Object.fromEntries(new FormData($('#booking-form')));for(const k of ['attendees','projectors','audio','staff'])values[k]=Number(values[k]);return values;}
function bufferPreview(){const f=$('#booking-form');const a=minute(f.elements.start.value),b=minute(f.elements.end.value);$('#buffer-preview').textContent=Number.isFinite(a)&&Number.isFinite(b)?clock(a-30)+'–'+clock(b+30):'Choose event times';}
function openForm(booking){
  editing=booking?.id||null;result=null;$('#booking-form').reset();$('#form-result').innerHTML='';
  const f=$('#booking-form'); f.elements.date.value=$('#timeline-date').value||localToday();
  if(booking)for(const [key,value]of Object.entries(booking))if(f.elements[key])f.elements[key].value=value;
  $('#form-title').textContent=editing?'Change the plan':'New event request';$('#submit-booking').textContent=editing?'Save reschedule ↗':'Confirm booking ↗';bufferPreview();$('#booking-dialog').showModal();
}
function diagnosticsHTML(diagnostics){return '<details><summary>See hall-by-hall checks</summary>'+diagnostics.map(d=>'<div class="diagnostic"><b>Hall '+esc(d.hall)+'</b><ul>'+d.reasons.map(r=>'<li>'+esc(r)+'</li>').join('')+(d.reasons.length?'':'<li>All checks passed.</li>')+'</ul></div>').join('')+'</details>';}
function showResult(data,saved=false){
  result=data;const d=data.decision;
  let html='<div class="result-box '+(d.ok?'':'conflict')+'"><strong>'+(d.ok?(saved?'Booking confirmed':'Allocation available'):'This request has a conflict')+'</strong>';
  if(d.ok)html+='<p>Hall '+esc(d.hall)+' · '+d.capacity+' seats · Venue '+esc(d.venue)+'. '+(d.fallback?'Your preferred venue was unavailable; this is the smallest feasible hall at another venue.':'The smallest feasible hall at your preferred venue.')+'</p><p>Reserved '+clock(data.request.reservedStart)+'–'+clock(data.request.reservedEnd)+' with all requested resources.</p>';
  else html+='<p>'+esc(d.message)+'</p>'+(data.preserved?'<p><b>Your original confirmed booking is unchanged.</b></p>':'');
  html+=diagnosticsHTML(d.diagnostics);
  if(data.suggestions.length)html+='<div class="alternatives"><b>Checked alternatives</b><p>Select one to fill the form, then confirm. Availability is checked again when saved.</p>'+data.suggestions.map((s,i)=>'<button type="button" class="alternative" data-alternative="'+i+'">Hall '+esc(s.hall)+' · '+esc(s.start)+'–'+esc(s.end)+'<small>'+esc(s.kind)+' · Venue '+esc(s.venue)+' · Same date and duration</small></button>').join('')+'</div>';
  $('#form-result').innerHTML=html+'</div>';
}
async function submit(checkOnly){
  if(!$('#booking-form').reportValidity())return;
  const input=formInput();const buttons=[$('#check-booking'),$('#submit-booking')];buttons.forEach(b=>b.disabled=true);
  try{
    const data=await api(checkOnly?'check':editing?'bookings/'+editing+'/reschedule':'bookings',checkOnly?{...input,excludeId:editing}:input);showResult(data,!checkOnly);
    if(!checkOnly){await refresh();if(data.decision.ok){$('#timeline-date').value=input.date;renderTimeline();$('#booking-dialog').close();toast(editing?'Event rescheduled. All constraints rechecked.':'Confirmed in Hall '+data.decision.hall+'. Every detail checked.');}else toast(data.preserved?'Reschedule declined. Original booking preserved.':'Request saved as rejected. Explore checked alternatives.');}
  }catch(e){$('#form-result').innerHTML='<div class="error-box" role="alert">'+esc(e.message)+'</div>';}
  finally{buttons.forEach(b=>b.disabled=false);}
}
function details(id){
  const b=state.bookings.find(x=>x.id===id);if(!b)return;
  const pairs=[['Event',b.title],['Client',b.client],['Date',b.date],['Event time',b.start+'–'+b.end],['Reserved interval',clock(b.reservedStart)+'–'+clock(b.reservedEnd)],['Hall',b.hall||'Unallocated'],['Guests',b.attendees],['Resources',b.projectors+' projector(s), '+b.audio+' audio, '+b.staff+' staff']];
  let html='<p>'+pill(b)+'</p><div class="detail-grid">'+pairs.map(([label,value])=>'<div><small>'+esc(label)+'</small>'+esc(value)+'</div>').join('')+'</div>';
  if(b.reason){const reason=JSON.parse(b.reason);html+='<div class="result-box conflict"><strong>Why this request was declined</strong><p>'+esc(reason.message)+'</p>'+diagnosticsHTML(reason.diagnostics)+'</div>';}
  $('#details-content').innerHTML=html;$('#details-dialog').showModal();
}
async function cancelBooking(id){
  const b=state.bookings.find(x=>x.id===id);if(!b)return;
  // A concrete confirmation prevents accidental cancellation from the register.
  if(!window.confirm('Cancel “'+b.title+'”? Its hall and resources will be released.'))return;
  try{await api('bookings/'+id+'/cancel',{});await refresh();toast('Booking cancelled. Hall and resources released.');}catch(e){toast(e.message);}
}
document.addEventListener('click',e=>{
  const target=e.target.closest('button,[data-details]');if(!target)return;
  if(target.dataset.view)navigate(target.dataset.view);
  if(target.dataset.details)details(Number(target.dataset.details));
  if(target.dataset.edit)openForm(state.bookings.find(b=>b.id===Number(target.dataset.edit)));
  if(target.dataset.cancel)cancelBooking(Number(target.dataset.cancel));
  if(target.classList.contains('close-dialog'))target.closest('dialog').close();
  if(target.dataset.alternative!==undefined){const s=result.suggestions[Number(target.dataset.alternative)];for(const key of ['date','start','end','preferredVenue'])$('#booking-form').elements[key].value=s[key];result=null;$('#form-result').innerHTML='<div class="buffer-note">Alternative selected. Confirm to reserve it; all checks will run again.</div>';bufferPreview();}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.upcoming-item')){e.preventDefault();details(Number(e.target.dataset.details));}});
$('#new-booking').onclick=()=>openForm();$('#check-booking').onclick=()=>submit(true);$('#booking-form').onsubmit=e=>{e.preventDefault();submit(false);};
$('#booking-form').addEventListener('input',()=>{bufferPreview();if(result){result=null;$('#form-result').innerHTML='';}});
$('#timeline-date').onchange=renderTimeline;$('#search').oninput=renderBookings;$('#status-filter').onchange=renderBookings;
$('#try-scenario').onclick=async()=>{
  const date=$('#timeline-date').value, button=$('#try-scenario');button.disabled=true;
  try{
    if(!state.bookings.some(b=>b.date===date)){
      const base={date,preferredVenue:'A',projectors:1,audio:0};
      await api('bookings',{...base,title:'Annual conference',client:'Northstar Co.',start:'10:00',end:'13:00',attendees:120,staff:3});
      await api('bookings',{...base,title:'Design workshop',client:'Studio Collective',start:'11:00',end:'14:00',attendees:50,staff:2});
      await refresh();toast('Two sample events added. Explore the third request.');
    }
    openForm();const f=$('#booking-form');for(const [key,value]of Object.entries({title:'Product launch',client:'Horizon Labs',attendees:100,start:'13:15',end:'15:00',staff:2}))f.elements[key].value=value;bufferPreview();
  }catch(e){toast(e.message);}finally{button.disabled=false;}
};
function shiftDate(days){
  const input=$('#timeline-date'), d=new Date((input.value||localToday())+'T12:00:00');
  d.setDate(d.getDate()+days);
  input.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');renderTimeline();
}
$('#previous-day').onclick=()=>shiftDate(-1);
$('#next-day').onclick=()=>shiftDate(1);
$('#today-button').onclick=()=>{$('#timeline-date').value=localToday();renderTimeline();};
const fallback=$('#buffer-fallback'), component=$('#buffer-toggle');
function setBufferVisibility(checked){document.querySelector('.schedule').classList.toggle('hide-buffers',!checked);renderTimeline();}
fallback.querySelector('input').addEventListener('change',e=>setBufferVisibility(e.target.checked));
customElements.whenDefined('sl-switch').then(()=>{
  component.checked=fallback.querySelector('input').checked;
  fallback.hidden=true;
  component.addEventListener('sl-change',()=>{fallback.querySelector('input').checked=component.checked;setBufferVisibility(component.checked);});
});
window.addEventListener('load',()=>window.lucide?.createIcons());
const FREQUENCIES={daily:1,weekly:7,fortnightly:14};
function seriesDates(startDate,frequency,occurrences){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isSafeInteger(occurrences)||occurrences<2||occurrences>12)return [];
  const dates=[];
  for(let i=0;i<occurrences;i++){
    if(frequency==='monthly'){
      const [year,month,day]=startDate.split('-').map(Number);
      const shifted=month-1+i,y=year+Math.floor(shifted/12),m=((shifted%12)+12)%12;
      const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
      dates.push(y+'-'+String(m+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0'));
    }else if(FREQUENCIES[frequency]){
      const d=new Date(startDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i*FREQUENCIES[frequency]);dates.push(d.toISOString().slice(0,10));
    }else return [];
  }
  return dates;
}
function weekdayLabel(date){return new Date(date+'T12:00:00').toLocaleDateString('en',{weekday:'long',day:'numeric',month:'short',year:'numeric'});}
function setModeCards(selector,mode){
  document.querySelectorAll(selector).forEach(button=>{
    const on=button.dataset.recurringMode===mode||button.dataset.bulkMode===mode;
    button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
  });
}
function recurringInput(){const values=Object.fromEntries(new FormData($('#recurring-form')));for(const k of ['attendees','projectors','audio','staff','occurrences'])values[k]=Number(values[k]);return values;}
function renderSeriesPreview(){
  const f=$('#recurring-form');if(!f)return;
  const start=minute(f.elements.start.value),end=minute(f.elements.end.value);
  const reserved=Number.isFinite(start)&&Number.isFinite(end)?clock(start-30)+'–'+clock(end+30):'Choose event times';
  $('#recurring-buffer').textContent=reserved;
  const dates=seriesDates(f.elements.date.value,f.elements.frequency.value,Number(f.elements.occurrences.value));
  const freqLabel={daily:'daily',weekly:'weekly',fortnightly:'fortnightly',monthly:'monthly'}[f.elements.frequency.value]||'repeating';
  $('#series-summary').textContent=dates.length?dates.length+' '+freqLabel+' occurrences · '+f.elements.start.value+'–'+f.elements.end.value:'Add a first date, frequency and between 2 and 12 occurrences.';
  const facts=$('#series-facts');
  if(facts)facts.innerHTML=dates.length?'<div>Frequency<strong>'+esc(freqLabel)+'</strong></div><div>Dates<strong>'+dates.length+'</strong></div><div>Reserved<strong>'+esc(reserved)+'</strong></div>':'';
  $('#series-timeline').innerHTML=dates.length?dates.map((date,i)=>'<div class="upcoming-item"><div class="event-date"><small>'+esc(new Date(date+'T12:00').toLocaleDateString('en',{month:'short'}).toUpperCase())+'</small>'+date.slice(8)+'</div><div><strong>Occurrence '+(i+1)+'</strong><p>'+esc(weekdayLabel(date))+' · '+esc(f.elements.start.value)+'–'+esc(f.elements.end.value)+'</p></div></div>').join(''):'<div class="empty-state"><strong>No dates to preview yet.</strong>The series timeline appears once the schedule is complete.</div>';
}
async function submitRecurring(){
  if(!$('#recurring-form').reportValidity())return;
  const input=recurringInput();const button=$('#submit-recurring');button.disabled=true;
  try{
    const data=await api('bookings/series',input);
    $('#recurring-result').innerHTML=batchResultHTML(data,'series');
    if(data.committed){await refresh();toast(data.results.every(r=>r.booking?.status==='confirmed')?'Series confirmed. Every date was checked.':'Series saved. Review confirmed and declined dates.');}
    else toast(data.message);
  }catch(e){$('#recurring-result').innerHTML='<div class="error-box" role="alert">'+esc(e.message)+'</div>';}
  finally{button.disabled=false;}
}
function emptyBulk(){return {title:'',client:'',date:localToday(),start:'10:00',end:'13:00',attendees:50,preferredVenue:'A',projectors:1,audio:0,staff:2,error:'',outcome:''};}
function bulkPill(r){
  if(r.outcome==='confirmed')return pill({status:'confirmed'});
  if(r.outcome==='declined')return pill({status:'rejected'});
  if(r.outcome==='conflict')return '<span class="pill rejected">conflict</span>';
  if(r.outcome==='blocked')return '<span class="pill cancelled">not saved</span>';
  if(r.error||bulkIssues(r).length)return '<span class="pill rejected">needs attention</span>';
  return '<span class="pill cancelled">ready</span>';
}
function bulkCardClass(r){
  if(r.outcome==='confirmed')return ' is-confirmed';
  if(r.outcome==='declined')return ' is-declined';
  if(r.outcome==='conflict')return ' is-conflict';
  if(r.outcome==='blocked')return ' is-blocked';
  if(r.error||bulkIssues(r).length)return ' needs-attention';
  return ' is-ready';
}
function bulkIssues(r){
  const issues=[];
  if(!String(r.title||'').trim())issues.push('Add an event name.');
  if(!String(r.client||'').trim())issues.push('Add a client name.');
  if(!r.date)issues.push('Choose a date.');
  const a=minute(r.start||''),b=minute(r.end||'');
  if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b)issues.push('End time must be after start time.');
  else if(a-30<480||b+30>1320)issues.push('With setup and cleanup, events must start at or after 08:30 and end at or before 21:30.');
  if(!Number.isSafeInteger(Number(r.attendees))||Number(r.attendees)<1)issues.push('Guests must be a whole number greater than zero.');
  return issues;
}
function renderBulk(){
  $('#bulk-cards').innerHTML=bulkRequests.map((r,i)=>'<article class="bulk-card" data-bulk-index="'+i+'"><div class="bulk-card-head"><h3>Request '+(i+1)+'</h3>'+(bulkRequests.length>1?'<button type="button" class="text-button" data-remove-bulk="'+i+'">Remove</button>':'')+'</div><div class="form-grid"><label class="span-2">Event name<input data-bulk-field="title" maxlength="140" value="'+esc(r.title)+'" placeholder="e.g. Product briefing"></label><label class="span-2">Client name<input data-bulk-field="client" maxlength="100" value="'+esc(r.client)+'" placeholder="e.g. Horizon Labs"></label><label>Venue<select data-bulk-field="preferredVenue"><option value="A"'+(r.preferredVenue==='A'?' selected':'')+'>Venue A · Atrium</option><option value="B"'+(r.preferredVenue==='B'?' selected':'')+'>Venue B · Boulevard</option><option value="C"'+(r.preferredVenue==='C'?' selected':'')+'>Venue C · Crescent</option></select></label><label>Date<input data-bulk-field="date" type="date" value="'+esc(r.date)+'"></label><label>Starts at<input data-bulk-field="start" type="time" min="08:30" max="21:29" value="'+esc(r.start)+'"></label><label>Ends at<input data-bulk-field="end" type="time" min="08:31" max="21:30" value="'+esc(r.end)+'"></label><label>Guests<input data-bulk-field="attendees" type="number" min="1" max="100000" value="'+esc(r.attendees)+'"></label><label>Projectors<input data-bulk-field="projectors" type="number" min="0" max="100000" value="'+esc(r.projectors)+'"></label><label>Audio systems<input data-bulk-field="audio" type="number" min="0" max="100000" value="'+esc(r.audio)+'"></label><label>Support staff<input data-bulk-field="staff" type="number" min="0" max="100000" value="'+esc(r.staff)+'"></label></div><div class="bulk-card-error">'+(r.error?('<div class="result-box conflict"><strong>Needs attention</strong><p>'+esc(r.error)+'</p></div>'):'')+'</div></article>').join('');
  const attention=bulkRequests.filter(r=>bulkIssues(r).length||r.error).length;
  $('#bulk-total').textContent=bulkRequests.length;$('#bulk-attention').textContent=attention;
  $('#bulk-mode-label').textContent=bulkMode==='atomic'?'Atomic':'Feasible-only';
  $('#bulk-mode-hint').textContent=bulkMode==='atomic'?'All succeed, or none are saved':'Valid requests proceed independently';
}
function readBulkFields(){
  document.querySelectorAll('.bulk-card').forEach(card=>{
    const index=Number(card.dataset.bulkIndex),row=bulkRequests[index];if(!row)return;
    card.querySelectorAll('[data-bulk-field]').forEach(field=>{
      const key=field.dataset.bulkField;row[key]=['attendees','projectors','audio','staff'].includes(key)?Number(field.value):field.value;
    });
  });
}
function batchResultHTML(data,kind){
  const rows=data.results.map((item,i)=>{
    const label=(kind==='series'?'Occurrence ':'Request ')+(i+1);
    if(item.error)return '<li><strong>'+label+' · not saved</strong><small>'+esc(item.error)+'</small></li>';
    if(!item.ok)return '<li><strong>'+label+' · conflict</strong><small>'+esc(item.decision?.message||'No hall could satisfy this request.')+'</small></li>';
    const booking=item.booking;
    return '<li><strong>'+label+' · '+esc(booking?.status||'confirmed')+'</strong><small>'+esc(item.request?.date||booking?.date)+' · '+esc(item.request?.start||booking?.start)+'–'+esc(item.request?.end||booking?.end)+(booking?.hall?' · Hall '+esc(booking.hall):'')+'</small></li>';
  }).join('');
  if(!data.committed)return '<div class="result-box conflict batch-result"><strong>Nothing was saved</strong><p>'+esc(data.message)+'</p><ul class="batch-list">'+rows+'</ul></div>';
  const confirmed=data.results.filter(item=>item.booking?.status==='confirmed').length;
  const declined=data.results.filter(item=>item.booking?.status==='rejected'||(!item.ok&&item.booking)).length;
  return '<div class="result-box '+(declined?'conflict':'')+' batch-result"><strong>'+confirmed+' confirmed'+(declined?', '+declined+' declined':'')+'</strong><p>'+(kind==='series'?'Each date used the same allocation rules as a single booking.':'Each request was checked on its own date, hall and resource pool.')+'</p><ul class="batch-list">'+rows+'</ul></div>';
}
async function submitBulk(){
  readBulkFields();
  let blocked=false;
  bulkRequests=bulkRequests.map(r=>{const issues=bulkIssues(r);if(issues.length){blocked=true;return {...r,error:issues.join(' ')};}return {...r,error:''};});
  renderBulk();if(blocked){toast('Resolve the highlighted requests before submitting.');return;}
  const button=$('#submit-bulk');button.disabled=true;
  try{
    const data=await api('bookings/batch',{mode:bulkMode,requests:bulkRequests.map(({error,...rest})=>rest)});
    $('#bulk-result').innerHTML=batchResultHTML(data,'bulk');
    bulkRequests=bulkRequests.map((r,i)=>{
      const item=data.results[i];
      if(!item)return r;
      if(item.error)return {...r,error:item.error};
      if(!item.ok)return {...r,error:item.decision?.message||'No hall could satisfy this request.'};
      if(!data.committed)return {...r,error:'Not saved because the batch did not pass every check.'};
      return {...r,error:''};
    });
    renderBulk();
    if(data.committed){await refresh();toast(data.results.every(item=>item.booking?.status==='confirmed')?'Bulk booking confirmed.':'Bulk booking finished. Review the summary.');}
    else toast(data.message);
  }catch(e){$('#bulk-result').innerHTML='<div class="error-box" role="alert">'+esc(e.message)+'</div>';}
  finally{button.disabled=false;}
}
$('#recurring-form').elements.date.value=localToday();
renderSeriesPreview();
bulkRequests=[emptyBulk()];renderBulk();
$('#recurring-form').addEventListener('input',()=>{$('#recurring-result').innerHTML='';renderSeriesPreview();});
$('#recurring-form').addEventListener('submit',e=>{e.preventDefault();submitRecurring();});
$('#add-bulk').onclick=()=>{readBulkFields();bulkRequests.push(emptyBulk());$('#bulk-result').innerHTML='';renderBulk();};
$('#clear-bulk').onclick=()=>{bulkRequests=[emptyBulk()];$('#bulk-result').innerHTML='';renderBulk();};
$('#submit-bulk').onclick=submitBulk;
document.addEventListener('click',e=>{
  const rec=e.target.closest('[data-recurring-mode]');
  if(rec){$('#recurring-form').elements.mode.value=rec.dataset.recurringMode;setModeCards('[data-recurring-mode]',rec.dataset.recurringMode);$('#recurring-result').innerHTML='';}
  const bulk=e.target.closest('[data-bulk-mode]');
  if(bulk){bulkMode=bulk.dataset.bulkMode;setModeCards('[data-bulk-mode]',bulkMode);$('#bulk-result').innerHTML='';renderBulk();}
  const remove=e.target.closest('[data-remove-bulk]');
  if(remove){readBulkFields();bulkRequests.splice(Number(remove.dataset.removeBulk),1);if(!bulkRequests.length)bulkRequests=[emptyBulk()];$('#bulk-result').innerHTML='';renderBulk();}
});
document.addEventListener('input',e=>{
  if(!e.target.closest('#bulk-cards'))return;
  readBulkFields();
  const index=Number(e.target.closest('.bulk-card')?.dataset.bulkIndex);
  if(Number.isInteger(index)&&bulkRequests[index])bulkRequests[index].error='';
  const attention=bulkRequests.filter(r=>bulkIssues(r).length||r.error).length;
  $('#bulk-total').textContent=bulkRequests.length;$('#bulk-attention').textContent=attention;
});
refresh().catch(()=>{});
