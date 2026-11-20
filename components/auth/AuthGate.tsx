"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { reconcileOnLogin, startAutoSync } from "@/lib/sync";
import { LoginScreen } from "./LoginScreen";
import { NewPasswordScreen } from "./NewPasswordScreen";

type Phase = "init" | "anon" | "syncing" | "error" | "ready";

/**
 * Gates the app behind Supabase auth when configured. If Supabase isn't set up
 * (no env vars), it's a no-op and the app runs in local-only mode.
 *
 * Critically: if the initial cloud load FAILS, this does not drop the user into
 * the app. An empty-looking workspace is indistinguishable from a real one, and
 * anything typed into it would be pushed up over the real records. The failure
 * is shown instead, with an explicit choice.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** Set when the user arrives via a password-reset email. */
  const [recovering, setRecovering] = useState(false);

  // Track the auth session.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setPhase("anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // A reset link signs the user in with a recovery session; they must set
      // a new password before the app is useful to them.
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(s);
      if (!s) setPhase("anon");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Once signed in, reconcile local ⇄ cloud, then start auto-sync.
  useEffect(() => {
    if (!supabase || !session) return;
    let cancelled = false;
    setPhase("syncing");
    setError(null);
    (async () => {
      try {
        await reconcileOnLogin(session.user.id);
        if (cancelled) return;
        startAutoSync(session.user.id);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("Initial sync failed:", e);
        setError(
          e instanceof Error ? e.message : "Your saved data couldn't be loaded.",
        );
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Enter the app knowing the cloud copy never loaded. Auto-sync is started so
   * edits still save locally and the status control can offer a retry — uploads
   * stay blocked inside lib/sync until a pull succeeds.
   */
  const continueOffline = useCallback(() => {
    if (session) startAutoSync(session.user.id);
    setPhase("ready");
  }, [session]);

  // Local-only mode (no cloud configured): pass through untouched.
  if (!supabase) return <>{children}</>;

  if (recovering)
    return <NewPasswordScreen onDone={() => setRecovering(false)} />;
  if (phase === "init") return <Splash label="Loading…" />;
  if (phase === "anon" || !session) return <LoginScreen />;
  if (phase === "syncing") return <Splash label="Loading your data…" />;
  if (phase === "error")
    return (
      <SyncErrorScreen
        error={error}
        onRetry={() => setAttempt((n) => n + 1)}
        onContinue={continueOffline}
      />
    );
  return <>{children}</>;
}

function Splash({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <span className="size-6 animate-spin rounded-full border-2 border-edge border-t-accent" />
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

function SyncErrorScreen({
  error,
  onRetry,
  onContinue,
}: {
  error: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="w-full max-w-md rounded-lg border border-edge-strong bg-surface p-6">
        <p className="text-sm font-semibold text-warn">
          Couldn&apos;t load your saved data
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          Your records are still safe in your account — this device just
          couldn&apos;t reach them. Nothing has been changed or deleted.
        </p>
        {error && (
          <p className="mt-3 rounded-sm border border-edge bg-raised px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-faint">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onRetry}
            className="rounded-sm bg-accent-dim px-3.5 py-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-bg"
          >
            Try again
          </button>
          <button
            onClick={onContinue}
            className="rounded-sm border border-edge-strong px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-ink"
          >
            Work offline for now
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          Working offline keeps this device usable and saves everything locally.
          Uploads stay paused until your data loads, so nothing here can
          overwrite what&apos;s in your account.
        </p>
      </div>
    </div>
  );
}
