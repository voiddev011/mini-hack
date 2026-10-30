import { describe, it, expect, vi } from 'vitest';
vi.mock('../../config/supabase', () => ({ isSupabaseConfigured: false, supabaseConfigurationError: 'Missing configuration', getSupabaseClient: vi.fn() }));
import { runSystemChecks } from '../systemCheckService';
describe('connection diagnostics', () => {
  it('reports missing configuration', async () => { expect((await runSystemChecks(null))[0].status).toBe('fail'); });
  it('does not claim database connectivity for guests', async () => {
    const client = { from: vi.fn() }; const results = await runSystemChecks(null, client);
    expect(results.at(-1).status).toBe('skip'); expect(client.from).not.toHaveBeenCalled();
  });
  it('stops when backend cannot verify identity', async () => {
    const client = { auth: { getUser: async () => ({ error: { message: 'Expired' } }) }, from: vi.fn() };
    expect((await runSystemChecks({ id: 'a' }, client)).at(-1).status).toBe('fail'); expect(client.from).not.toHaveBeenCalled();
  });
  it('reports a missing table alongside successful reads', async () => {
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'a' } } }) }, from: table => ({ select: () => ({ limit: () => ({ abortSignal: async () => ({ error: table === 'alert_events' ? { message: 'Apply alert migration' } : null }) }) }) }) };
    const results = await runSystemChecks({ id: 'a' }, client);
    expect(results.filter(r => r.status === 'pass')).toHaveLength(6);
    expect(results.at(-1)).toMatchObject({ name: 'alert_events', status: 'fail' });
  });
});
