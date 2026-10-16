import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  async function loadProfile(user) {
    if (!user || !supabase) { setProfile(null); return null; }
    const { data, error } = await supabase.from('profiles')
      .select('id,full_name,university_email,role,account_status,avatar_url')
      .eq('id', user.id).single();
    if (error) throw error;
    if (data.role !== 'administrator' || data.account_status !== 'active') {
      await supabase.auth.signOut();
      throw new Error('Access denied. An active administrator account is required.');
    }
    setProfile(data);
    return data;
  }
  useEffect(() => {
    if (!supabase) { setAuthError('Supabase is not configured. Add your .env values.'); setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      if (error) setAuthError(error.message);
      setSession(data?.session || null);
      if (data?.session?.user) {
        try { await loadProfile(data.session.user); } catch (e) { if (alive) setAuthError(e.message); }
      }
      if (alive) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) { setProfile(null); setLoading(false); }
      else {
        // Defer Supabase queries to avoid running them inside the auth callback.
        setTimeout(() => loadProfile(nextSession.user).catch(e => setAuthError(e.message)), 0);
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  async function signIn(email, password) {
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try { await loadProfile(data.user); }
    catch (e) { await supabase.auth.signOut(); throw e; }
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); setProfile(null); setSession(null); }
  return <AuthContext.Provider value={{ session, profile, loading, authError, signIn, signOut, setAuthError }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
