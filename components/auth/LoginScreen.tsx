"use client";

import { useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { BRAND, Lockup } from "@/components/brand/Logo";

type Mode = "signin" | "signup" | "forgot";

/**
 * The public face of the app (§7.20): a one-line pitch, three things it does,
 * and the way in. Kept deliberately short — the old page was ~170 words of
 * feature cards nobody reads on a sign-in screen. The data-handling note is
 * still here, one click away, because the Anthropic disclosure matters.
 */

const PILLARS: { label: string; hint: string; icon: ReactNode }[] = [
  {
    label: "Track",
    hint: "Every application",
    icon: (
      <path d="M4 6h16M4 12h16M4 18h16M9 4v16" strokeLinecap="round" />
    ),
  },
  {
    label: "Store",
    hint: "Resumes and letters",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Prep",
    hint: "Interview answers",
    icon: (
      <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" strokeLinejoin="round" />
    ),
  },
];

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) setError(error.message);
        else
          setInfo(
            `If an account exists for ${email}, a reset link is on its way. Open it on this device and you'll be asked to choose a new password.`,
          );
        return;
      }

      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (mode === "signup" && !data.session) {
        setInfo(
          "Account created — check your inbox for a confirmation link before signing in.",
        );
      }
      // On success with a session, AuthGate's listener takes over.
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <div className="relative h-dvh overflow-x-hidden overflow-y-auto bg-bg">
      {/* Backdrop: the dashboard's dot grid and a faint Pine wash — inside
          the brand palette, nothing glowing. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-edge)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_40%,black_20%,transparent_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-48 -left-40 size-[42rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-pine)_55%,transparent),transparent)]"
      />
      {/* Columns share a top edge (logo level with the card) and the pair is
          centred on the screen as one block. */}
      <main className="relative mx-auto grid min-h-dvh max-w-5xl content-center items-start gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        {/* ── The pitch ─────────────────────────────────────────────── */}
        <section className="animate-fade-up">
          <Lockup tileClassName="size-11" wordClassName="text-xl" />

          <h1 className="mt-10 text-[2.75rem] leading-[1.05] font-semibold tracking-[-0.03em] max-sm:mt-8 max-sm:text-[2rem]">
            Your whole job hunt,
            <br />
            <span className="text-accent">one place.</span>
          </h1>
          <p className="mt-4 text-[15px] text-ink-muted">
            Track applications, store documents, prep interviews.
          </p>

          <ul className="mt-10 grid max-w-lg grid-cols-3 gap-3 max-sm:mt-8 max-sm:gap-2">
            {PILLARS.map((p, i) => (
              <li
                key={p.label}
                className="animate-fade-up rounded-lg border border-edge bg-surface/80 p-3.5 backdrop-blur-[2px] max-sm:p-3"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span
                  className="grid size-9 place-items-center rounded-[22%] text-accent"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.pineFrom}, ${BRAND.pineTo})`,
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current stroke-[1.8]">
                    {p.icon}
                  </svg>
                </span>
                <p className="mt-3 text-sm font-semibold">{p.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                  {p.hint}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── The way in ────────────────────────────────────────────── */}
        <section className="animate-fade-up [animation-delay:180ms]">
          <form
            onSubmit={submit}
            className="relative overflow-hidden rounded-xl border border-edge-strong bg-surface p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
          >
            {/* One Mint hairline — the only accent on the card. */}
            <span
              aria-hidden
              className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)] opacity-60"
            />

            <h2 className="text-lg font-semibold tracking-tight">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              {mode === "signin"
                ? "Syncs to every device you sign in on."
                : mode === "signup"
                  ? "Free. Your workspace starts empty."
                  : "We'll email you a link to choose a new one."}
            </p>

            <div className="mt-5 space-y-3">
              <Field label="Email">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={INPUT}
                />
              </Field>

              {mode !== "forgot" && (
                <Field
                  label="Password"
                  aside={
                    mode === "signin" ? (
                      <button
                        type="button"
                        onClick={() => switchTo("forgot")}
                        className="text-[11px] text-ink-muted transition-colors hover:text-accent"
                      >
                        Forgot?
                      </button>
                    ) : undefined
                  }
                >
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={INPUT}
                  />
                  {mode === "signup" && (
                    <span className="mt-1 block text-[10px] text-ink-faint">
                      At least 6 characters.
                    </span>
                  )}
                </Field>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-danger/40 bg-raised px-3 py-2 text-[11px] leading-relaxed text-danger"
                >
                  {error}
                </p>
              )}
              {info && (
                <p
                  role="status"
                  className="rounded-md border border-accent-dim bg-raised px-3 py-2 text-[11px] leading-relaxed text-accent-strong"
                >
                  {info}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="min-h-11 w-full rounded-md bg-accent text-sm font-semibold text-bg transition-colors hover:bg-accent-strong disabled:opacity-50"
              >
                {busy
                  ? "Working…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Email me a reset link"}
              </button>
            </div>

            <p className="mt-5 border-t border-edge pt-4 text-center text-xs text-ink-muted">
              {mode === "signin" ? (
                <>
                  New here?{" "}
                  <SwitchLink onClick={() => switchTo("signup")}>
                    Create an account
                  </SwitchLink>
                </>
              ) : (
                <>
                  {mode === "forgot" ? "Remembered it? " : "Have an account? "}
                  <SwitchLink onClick={() => switchTo("signin")}>
                    Sign in
                  </SwitchLink>
                </>
              )}
            </p>
          </form>

          <details className="group mt-4 px-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 text-[11px] text-ink-faint transition-colors select-none hover:text-ink-muted">
              <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current stroke-2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
              How your data is used
            </summary>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              Your records live in your browser and sync to your own account.
              They aren&apos;t shared or sold, and you can export or delete
              everything from Data and backup. Company research sends only the
              company name and website you enter to Anthropic&apos;s API.
            </p>
          </details>
        </section>
      </main>
    </div>
  );
}

const INPUT =
  "min-h-11 w-full rounded-md border border-edge bg-bg px-3 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent";

function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          {label}
        </span>
        {aside}
      </span>
      {children}
    </label>
  );
}

function SwitchLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-accent transition-colors hover:text-accent-strong"
    >
      {children}
    </button>
  );
}
