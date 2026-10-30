import { it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout } from '../fetchWithTimeout';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('preserves request headers and attaches a timeout signal', async () => {
  const fetcher = vi.fn(async () => ({ ok: true })); vi.stubGlobal('fetch', fetcher);
  await fetchWithTimeout('/example', { headers: { test: 'value' } });
  expect(fetcher.mock.calls[0][1].headers).toEqual({ test: 'value' });
  expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});
it('retains caller cancellation', async () => {
  const caller = new AbortController(); caller.abort();
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => { options.signal.throwIfAborted(); }));
  await expect(fetchWithTimeout('/example', { signal: caller.signal })).rejects.toThrow();
});
