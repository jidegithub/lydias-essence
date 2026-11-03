import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { FriendlyError, checkIsAdmin, toFriendlyError, type SupabaseClient } from "@lydias-essence/supabase";

export type AuthStatus = "loading" | "signedOut" | "noAccess" | "admin";

interface AuthValue {
  client: SupabaseClient;
  status: AuthStatus;
  user: User | null;
  /** Set when a signed-in session ended without the user asking (expiry/revocation). */
  notice: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const wasAdmin = useRef(false);
  const userInitiatedSignOut = useRef(false);

  const evaluate = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setUser(null);
        setStatus("signedOut");
        if (wasAdmin.current && !userInitiatedSignOut.current) {
          setNotice("Your session has ended. Please sign in again.");
        }
        wasAdmin.current = false;
        userInitiatedSignOut.current = false;
        return;
      }
      setUser(session.user);
      const ok = await checkIsAdmin(client);
      wasAdmin.current = ok;
      setStatus(ok ? "admin" : "noAccess");
    },
    [client]
  );

  useEffect(() => {
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) void evaluate(data.session);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      // Never await Supabase calls inside this callback; defer to avoid auth deadlocks.
      window.setTimeout(() => {
        if (active) void evaluate(session);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client, evaluate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setNotice("");
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw toFriendlyError(error, "We couldn’t sign you in.");
      const ok = await checkIsAdmin(client);
      if (!ok) {
        userInitiatedSignOut.current = true;
        await client.auth.signOut();
        throw new FriendlyError(
          "You’re signed in, but this account doesn’t have admin access. Ask the site owner to add you as an administrator.",
          "permission"
        );
      }
      wasAdmin.current = true;
      setUser(data.user);
      setStatus("admin");
    },
    [client]
  );

  const signOut = useCallback(async () => {
    userInitiatedSignOut.current = true;
    await client.auth.signOut();
    setUser(null);
    setStatus("signedOut");
    wasAdmin.current = false;
  }, [client]);

  const value = useMemo<AuthValue>(
    () => ({ client, status, user, notice, signIn, signOut, clearNotice: () => setNotice("") }),
    [client, status, user, notice, signIn, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useClient(): SupabaseClient {
  return useAuth().client;
}
