import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStore, InputError, VENUES } from './engine.mjs';
const root = dirname(fileURLToPath(import.meta.url));
export function app(store, { allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173').split(',').map(value => value.trim()) } = {}) {
  return createServer(async (req, res) => {
    const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host && !allowedOrigins.includes(req.headers.origin)) return send(403, { error: 'Cross-origin requests are not allowed.' });
        if (req.method === 'GET' && url.pathname === '/api/state') return send(200, { bookings: store.list(), venues: VENUES, audit: store.audit() });
        if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 65536) return send(413, { error: 'Request is too large.' }); }
        let input; try { input = JSON.parse(body || '{}'); } catch { throw new InputError('Send valid JSON.'); }
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Provide a request object.');
        if (url.pathname === '/api/check') return send(200, store.evaluate(input, Number.isSafeInteger(input.excludeId) ? input.excludeId : undefined));
        if (url.pathname === '/api/bookings/preview') return send(200, store.preview(input));
        if (url.pathname === '/api/bookings') return send(201, store.book(input));
        if (url.pathname === '/api/bookings/batch') return send(200, store.bookMany(input.requests, input.mode));
        if (url.pathname === '/api/bookings/series') return send(200, store.bookSeries(input));
        const match = url.pathname.match(/^\/api\/bookings\/(\d+)\/(cancel|reschedule)$/);
        if (match) return send(200, match[2] === 'cancel' ? store.cancel(Number(match[1])) : store.reschedule(Number(match[1]),input));
        return send(404, { error: 'Endpoint not found.' });
      }
      const assets = { '/': ['index.html','text/html; charset=utf-8'], '/app.js': ['app.js','text/javascript; charset=utf-8'], '/styles.css': ['styles.css','text/css; charset=utf-8'] };
      if (req.method !== 'GET' || !assets[url.pathname]) { res.writeHead(404); return res.end('Not found'); }
      const [file, type] = assets[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'" });
      res.end(readFileSync(join(root,'public',file)));
    } catch (error) { if (!(error instanceof InputError)) console.error(error); send(error instanceof InputError ? 400 : 500, { error: error instanceof InputError ? error.message : 'An unexpected error occurred.' }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync(join(root,'data'), { recursive: true });
  const store = createStore(join(root,'data','eventsync.sqlite'));
  const server = app(store), port = Number(process.env.PORT || 3000);
  server.listen(port,'127.0.0.1',() => console.log('EventSync running at http://localhost:' + port));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { store.close(); process.exit(0); }));
}
