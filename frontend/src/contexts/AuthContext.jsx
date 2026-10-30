import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getProfile,
  signIn,
  signOut,
  signUp,
} from '../services/authService';
import { isSupabaseConfigured, supabase } from '../config/supabase';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const syncId = useRef(0);

  const syncSession = useCallback(async (nextSession, isActive) => {
    const currentSyncId = ++syncId.current;
    setSession(nextSession);
    setError('');

    if (!nextSession?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextProfile = await getProfile(nextSession.user.id);
      if (isActive() && currentSyncId === syncId.current) {
        setProfile(nextProfile);
      }
    } catch (profileError) {
      if (isActive() && currentSyncId === syncId.current) {
        setProfile(null);
        setError(profileError.message || 'Unable to load your account profile.');
      }
    } finally {
      if (isActive() && currentSyncId === syncId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const isActive = () => active;

    if (!supabase) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queueMicrotask(() => {
        if (active) void syncSession(nextSession, isActive);
      });
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      void syncSession(data.session, isActive);
    }).catch((sessionError) => {
      if (active) {
        setError(sessionError.message || 'Unable to restore your session.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    error,
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
  }), [session, profile, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
