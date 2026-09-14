import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  return supabase;
}

export async function signInWithPassword(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string) {
  return requireSupabase().auth.signUp({ email, password });
}

export async function signOut() {
  return requireSupabase().auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) {
    throw error;
  }

  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return requireSupabase().auth.onAuthStateChange(callback);
}
