import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "../services/auth";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const { data } = onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
