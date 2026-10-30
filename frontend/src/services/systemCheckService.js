import { getSupabaseClient, isSupabaseConfigured, supabaseConfigurationError } from '../config/supabase';

// Read-only probes. A successful read proves reachability, not write permissions or RLS isolation.
export async function runSystemChecks(user, client = isSupabaseConfigured ? getSupabaseClient() : null) {
  if (!client) return [{ name: 'Backend configuration', status: 'fail', detail: supabaseConfigurationError || 'Supabase is not configured.' }];
  const checks = [{ name: 'Backend configuration', status: 'pass', detail: 'Supabase client configured.' }];
  if (!user) return [...checks, { name: 'Account and database', status: 'skip', detail: 'Sign in to check your session and database tables. Configuration alone does not prove connectivity.' }];
  const start = performance.now();
  try {
    const { data, error } = await client.auth.getUser();
    if (error || data?.user?.id !== user.id) throw new Error(error?.message || 'Session could not be verified. Sign in again.');
    checks.push({ name: 'Authenticated backend', status: 'pass', durationMs: Math.round(performance.now() - start), detail: 'Supabase Auth verified the current account.' });
  } catch (error) {
    return [...checks, { name: 'Authenticated backend', status: 'fail', detail: error.message }];
  }
  const tables = ['profiles', 'activities', 'datasets', 'alert_rules', 'alert_events'];
  const results = await Promise.all(tables.map(async (table) => {
    const began = performance.now();
    try {
      const { error } = await client.from(table).select('id').limit(1).abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return { name: table, status: 'pass', durationMs: Math.round(performance.now() - began), detail: 'Authenticated SELECT completed under database access policies.' };
    } catch (error) {
      return { name: table, status: 'fail', durationMs: Math.round(performance.now() - began), detail: error.message || 'Database request failed.' };
    }
  }));
  return [...checks, ...results];
}
