import { supabase } from './supabase';
import type { Profile } from '../types/annonce';

// --- Auth helpers (cote client, anon key) ---

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  return { data, error };
}

// --- Helpers Espace pro audioprothésiste ---
// Ces helpers ciblent /audioprothesiste-pro/ — le redirect pointe vers
// /auth/callback-pro qui route ensuite vers l'espace pro.

export async function signInProWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback-pro` },
  });
  return { data, error };
}

export async function signInProWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signInProWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback-pro`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function linkGoogleIdentity() {
  // linkIdentity n'est supporté que si l'utilisateur est déjà connecté.
  // Supabase redirige vers Google puis revient sur redirectTo avec la nouvelle
  // identité liée au compte actuel.
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback-pro`,
    },
  });
  return { data, error };
}

export async function unlinkIdentity(identityId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const identity = user?.identities?.find((i) => i.identity_id === identityId);
  if (!identity) return { error: new Error('Identité introuvable.') };
  const { error } = await supabase.auth.unlinkIdentity(identity);
  return { error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

// --- Profil ---

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as Profile | null;
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  return { data: data as Profile | null, error };
}

// --- Slug ---

export function generateSlug(titre: string): string {
  const base = titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
