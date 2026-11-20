"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogoTile, Wordmark } from "@/components/brand/Logo";

/**
 * Shown after someone follows a password-reset email. Supabase has already
 * signed them in with a recovery session by this point, so all that's left is
 * choosing the new password.
 */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else onDone();
    } catch {
      setError("Couldn't update your password — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <LogoTile className="size-9" />
          <Wordmark className="text-base" />
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-lg border border-edge bg-panel p-5"
        >
          <div>
            <h1 className="text-sm font-semibold">Choose a new password</h1>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              You&apos;ll be signed in straight afterwards. Your saved data is
              untouched.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              New password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-sm border border-edge bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Confirm it
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-sm border border-edge bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-sm border border-edge bg-raised px-3 py-2 text-[11px] text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-sm bg-accent py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
