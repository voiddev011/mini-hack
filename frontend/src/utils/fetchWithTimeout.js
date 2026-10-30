// Keep stalled network requests from leaving account screens waiting indefinitely.
export function fetchWithTimeout(input, init = {}) {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}
