"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogoTile, Wordmark } from "@/components/brand/Logo";

type Mode = "signin" | "signup" | "forgot";

/**
 * The public face of the app: what it does, then the way in.
 *
 * Everything described here is a feature that actually exists — the preview
 * below is the real tracker layout filled with obviously fictional rows, not a
 * mock-up of something unbuilt and not a screenshot of anyone's real data.
 */

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Every application in one grid",
    body: "Company, role, status, dates — editable in place like a spreadsheet, filtered by the kind of work you're after.",
  },
  {
    title: "Your documents, ready to send",
    body: "Store your resume and cover letter as PDF or Word. They come back byte-for-byte, so what you send is what you saved.",
  },
  {
    title: "Research before you apply",
    body: "Build a page on each employer — what they do, what to mention in an interview, which roles they open.",
  },
  {
    title: "Prepare your answers",
    body: "A question bank you answer once and revisit, plus the skills, courses and certifications you're working on.",
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
    <div className="h-dvh overflow-y-auto bg-bg">
      <div className="mx-auto grid max-w-5xl gap-10 p-6 py-12 lg:grid-cols-[1.1fr_minmax(0,380px)] lg:py-20">
        {/* ── What this is ──────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <LogoTile className="size-10" />
            <Wordmark className="text-lg" />
          </div>

          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight max-sm:text-2xl">
            One place for the whole job hunt.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            CareerCommand keeps your applications, documents, employer research
            and interview prep together — so when something is due you know what
            to do next and where everything for it lives.
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-md border border-edge bg-panel p-4"
              >
                <dt className="text-xs font-semibold">{f.title}</dt>
                <dd className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  {f.body}
                </dd>
              </div>
            ))}
          </dl>

          <SamplePreview />

          <p className="mt-8 max-w-xl text-[11px] leading-relaxed text-ink-faint">
            <span className="font-medium text-ink-muted">Your data.</span> Your
            records are stored in your browser and copied to your own account so
            your devices stay in step — they aren&apos;t shared with other users
            and aren&apos;t sold. You can export everything to a file at any
            time from Data &amp; backup, and delete all of it from the same
            panel. Company research is the one feature that sends anything
            outside the app: the company name and website you enter are sent to
            Anthropic&apos;s API to generate the dossier.
          </p>
        </div>

        {/* ── The way in ────────────────────────────────────────────── */}
        <div className="lg:pt-2">
          <form
            onSubmit={submit}
            className="space-y-3 rounded-lg border border-edge bg-panel p-5"
          >
            <div>
              <h2 className="text-sm font-semibold">
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create your account"
                    : "Reset your password"}
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {mode === "signin"
                  ? "Your data syncs to every device you sign in on."
                  : mode === "signup"
                    ? "Free, and your workspace starts empty."
                    : "We'll email you a link to choose a new one."}
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-sm border border-edge bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
              />
            </label>

            {mode !== "forgot" && (
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                  Password
                </span>
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
                  className="w-full rounded-sm border border-edge bg-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                />
                {mode === "signup" && (
                  <span className="mt-1 block text-[10px] text-ink-faint">
                    At least 6 characters.
                  </span>
                )}
              </label>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-sm border border-edge bg-raised px-3 py-2 text-[11px] leading-relaxed text-danger"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                role="status"
                className="rounded-sm border border-accent-dim bg-raised px-3 py-2 text-[11px] leading-relaxed text-accent-strong"
              >
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-sm bg-accent py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-strong disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Email me a reset link"}
            </button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => switchTo("forgot")}
                className="w-full text-center text-[11px] text-ink-muted transition-colors hover:text-accent"
              >
                Forgot your password?
              </button>
            )}
          </form>

          <p className="mt-4 text-center text-xs text-ink-muted">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <SwitchLink onClick={() => switchTo("signup")}>
                  Create an account
                </SwitchLink>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <SwitchLink onClick={() => switchTo("signin")}>
                  Sign in
                </SwitchLink>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function SwitchLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="font-medium text-accent transition-colors hover:text-accent-strong"
    >
      {children}
    </button>
  );
}

/**
 * The tracker's real layout with invented rows. Labelled as a sample so it
 * can't be mistaken for live data, and it contains nobody's real records.
 */
const SAMPLE_ROWS: {
  company: string;
  role: string;
  status: string;
  tone: string;
  when: string;
}[] = [
  {
    company: "Northwind Rail",
    role: "Graduate Engineer",
    status: "Interview",
    tone: "text-warn",
    when: "Thu 2pm",
  },
  {
    company: "Harbour & Co",
    role: "Weekend Floor Staff",
    status: "Applied",
    tone: "text-info",
    when: "6 days ago",
  },
  {
    company: "Vellum Design",
    role: "Design Intern",
    status: "Offer",
    tone: "text-ok",
    when: "reply by Fri",
  },
];

function SamplePreview() {
  return (
    <figure className="mt-8">
      <figcaption className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
        <span className="size-1.5 rounded-full bg-ink-faint" />
        Sample — invented companies, not real records
      </figcaption>
      <div className="overflow-hidden rounded-md border border-edge bg-panel">
        <table className="w-full text-left text-[11px]">
          <thead className="border-b border-edge text-ink-faint">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Company
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Role
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium max-sm:hidden">
                Next
              </th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((r) => (
              <tr key={r.company} className="border-b border-edge last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{r.company}</td>
                <td className="px-3 py-2 text-ink-muted">{r.role}</td>
                <td className={`px-3 py-2 font-medium ${r.tone}`}>
                  {r.status}
                </td>
                <td className="px-3 py-2 text-ink-muted max-sm:hidden">
                  {r.when}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
