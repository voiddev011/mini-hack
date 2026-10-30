import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'output/phase4');
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function markdown(text) {
  const lines = text.split(/\r?\n/); let html = ''; let table = false; let list = false;
  for (const line of lines) {
    if (line.startsWith('|')) {
      if (list) { html += '</ul>'; list = false; }
      const cells = line.split('|').slice(1,-1).map(x => x.trim());
      if (cells.every(x => /^[- :]+$/.test(x))) continue;
      if (!table) { html += '<table><thead><tr>' + cells.map(x => '<th>' + escape(x) + '</th>').join('') + '</tr></thead><tbody>'; table = true; }
      else html += '<tr>' + cells.map(x => '<td>' + escape(x) + '</td>').join('') + '</tr>';
      continue;
    }
    if (table) { html += '</tbody></table>'; table = false; }
    if (line.startsWith('- ')) { if (!list) { html += '<ul>'; list = true; } html += '<li>' + escape(line.slice(2)) + '</li>'; continue; }
    if (list) { html += '</ul>'; list = false; }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) html += '<h' + heading[1].length + '>' + escape(heading[2]) + '</h' + heading[1].length + '>';
    else if (line.trim()) html += '<p>' + escape(line).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>') + '</p>';
  }
  return html + (table ? '</tbody></table>' : '') + (list ? '</ul>' : '');
}
const reportStyle = 'body{max-width:900px;margin:48px auto;padding:0 28px;color:#172820;background:#fff;font:16px/1.65 Arial,sans-serif}h1{font-size:36px;line-height:1.15}h2{font-size:23px;margin:34px 0 12px}table{border-collapse:collapse;width:100%;font-size:13px;margin:20px 0}th,td{border:1px solid #cddbd1;padding:10px;text-align:left;vertical-align:top}th{background:#edf4ed}tr{break-inside:avoid}a{color:#256d49}.toolbar{font-size:13px;padding:16px 0}.results{padding:20px;background:#edf4ed} @media print{body{max-width:none;margin:0;padding:0;font-size:11pt}h2{break-after:avoid}p{orphans:3;widows:3}.toolbar{display:none}@page{size:A4;margin:20mm}}';
const verification = JSON.parse(readFileSync(resolve(output,'evidence/verification.json'),'utf8'));
const summary = '<section class="results"><h2>Automated verification result</h2><p>' + escape(verification.checkedAt) + '</p><p>' + verification.tests.passed + ' of ' + verification.tests.total + ' tests passed.</p><ul>' + verification.checks.map(x => '<li>' + escape(x.name) + ': ' + escape(x.status) + ', ' + x.durationMs + ' ms</li>').join('') + '</ul><p>' + escape(verification.scope) + '</p></section>';
for (const name of ['REPORT','TESTING','DEMO_GUIDE']) {
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrustCarbon ' + name + '</title><style>' + reportStyle + '</style><body><nav class="toolbar"><a href="PRESENTATION.html">Presentation</a> / <a href="REPORT.html">Report</a> / <a href="TESTING.html">Testing</a> / <a href="DEMO_GUIDE.html">Demo guide</a> / <button onclick="print()">Print / Save as PDF</button></nav><main>' + markdown(readFileSync(resolve(output,name+'.md'),'utf8')) + (name === 'REPORT' ? summary : '') + '</main></body></html>';
  writeFileSync(resolve(output,name+'.html'),html);
}
const slides = JSON.parse(readFileSync(resolve(output,'slides.json'),'utf8'));
const sections = slides.map((s,i) => '<section class="slide" aria-label="Slide '+(i+1)+'" '+(i?'hidden':'')+'><div class="label">TRUSTCARBON / PHASE IV</div><h1>'+escape(s.title)+'</h1>'+(s.subtitle?'<p class="subtitle">'+escape(s.subtitle)+'</p>':'')+'<ul>'+s.points.map(p=>'<li>'+escape(p)+'</li>').join('')+'</ul><aside class="notes" hidden><strong>Presenter notes</strong><p>'+escape(s.notes)+'</p></aside><div class="number">'+(i+1)+' / '+slides.length+'</div></section>').join('');
const slideStyle = '*{box-sizing:border-box}body{margin:0;background:#102c22;color:#f6f9f3;font-family:Arial,sans-serif}.slide{position:relative;min-height:100vh;padding:8vh 9vw 100px;max-width:1500px;margin:auto}.slide[hidden]{display:none}.label{font-size:14px;color:#a8df62;letter-spacing:.15em;margin-bottom:7vh}h1{font-size:clamp(32px,4.3vw,64px);line-height:1.06;max-width:1100px;margin:0 0 5vh;font-weight:700;letter-spacing:-.035em}.subtitle{font-size:clamp(20px,2.5vw,36px);max-width:1000px;color:#c9ddcf;margin-bottom:5vh}ul{padding-left:1.1em;max-width:1100px;font-size:clamp(20px,2.4vw,34px);line-height:1.45}li{margin-bottom:3vh;padding-left:.3em}.number{margin-top:5vh;color:#a8bdae;font-size:14px}.notes{background:#f3f6f1;color:#173323;padding:18px;font-size:17px;line-height:1.5;max-width:1000px}.controls{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 3vw;background:#0b2119;font-size:13px}button,a{font:inherit;color:inherit}button{background:transparent;border:1px solid #708b77;border-radius:3px;padding:8px 12px;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #a8df62;outline-offset:3px}a{color:#c7e4b6} @media print{body{background:#fff;color:#172820}.slide,.slide[hidden]{display:block;min-height:0;height:185mm;padding:15mm;break-after:page}.controls,.notes{display:none!important}.label,.number{color:#26633e}h1{font-size:32pt;margin:0 0 12mm}ul{font-size:21pt}.label{margin-bottom:12mm}.subtitle{color:#31523d}@page{size:A4 landscape;margin:10mm}}';
const script = "const slides=[...document.querySelectorAll('.slide')];let index=0;let notes=false;function show(n){index=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,i)=>{s.hidden=i!==index;s.querySelector('.notes').hidden=!notes});location.hash=String(index+1);document.getElementById('counter').textContent=(index+1)+' / '+slides.length;window.scrollTo(0,0)}document.getElementById('previous').onclick=()=>show(index-1);document.getElementById('next').onclick=()=>show(index+1);document.getElementById('notes').onclick=()=>{notes=!notes;show(index)};document.getElementById('print').onclick=()=>print();document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();show(index+1)}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();show(index-1)}if(e.key==='n'||e.key==='N'){notes=!notes;show(index)}});show((Number(location.hash.slice(1))||1)-1);";
writeFileSync(resolve(output,'PRESENTATION.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TrustCarbon Phase IV Presentation</title><style>'+slideStyle+'</style><body><main>'+sections+'</main><nav class="controls" aria-label="Slide controls"><button id="previous">Previous</button><span id="counter"></span><button id="next">Next</button><button id="notes">Notes (N)</button><button id="print">Print / Save as PDF</button><a href="REPORT.html">Project report</a><span>Arrow keys change slides</span></nav><script>'+script+'</script></body></html>');
console.log('Generated printable report, testing record, demo guide and 10-slide browser presentation.');
