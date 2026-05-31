import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user,    setUser]    = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchProfile(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('audit_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, hotelName) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      // upsert — o trigger pode já ter criado o perfil com hotel vazio
      await supabase.from('audit_profiles').upsert({
        id:                  data.user.id,
        email:               email,
        hotel_name:          hotelName,
        subscription_status: 'trial',
      }, { onConflict: 'id', ignoreDuplicates: false });
    }
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isActive = profile?.subscription_status === 'active' || profile?.subscription_status === 'trial';

  return { user, profile, isActive, signIn, signUp, signOut };
}
