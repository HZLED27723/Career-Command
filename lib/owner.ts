"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Who this deployment's personal content belongs to.
 *
 * CareerCommand started as one person's private workspace. The owner's real
 * résumé, CV and cover letter are no longer in the source (§7.32): they live
 * in the owner's own synced rows, so a new account's Vault is empty simply
 * because it has no rows. What is still gated on identity is cosmetic — the
 * owner's name in the greeting and Vault labels — plus the one-time prompt to
 * import those personal templates.
 *
 * Generic suggestions (interview questions, example skills and courses) are NOT
 * gated — they belong to nobody and are labelled as examples where they appear.
 */

/**
 * SHA-256 of the owner's sign-in email (trimmed, lower-case). Only the hash is
 * kept so the address itself doesn't ship in the public JavaScript bundle.
 * To change owner: `node -e "console.log(require('crypto').createHash('sha256').update('new@address').digest('hex'))"`.
 */
const OWNER_EMAIL_SHA256 =
  "45aebc235b7c22fe7707f131b5003433babf99875b655c62edf53ca4711c3788";

const normalise = (email: string | null | undefined) =>
  (email ?? "").trim().toLowerCase();

/**
 * True when `email` is the owner's. Async because hashing is (Web Crypto).
 * `crypto.subtle` exists only in secure contexts (https, localhost) — anywhere
 * else nobody is treated as the owner, which only hides cosmetic extras.
 */
export async function isOwnerEmail(
  email: string | null | undefined,
): Promise<boolean> {
  const e = normalise(email);
  if (!e || typeof crypto === "undefined" || !crypto.subtle) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e));
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return hex === OWNER_EMAIL_SHA256;
}

/**
 * True when the signed-in account owns this deployment's personal content.
 *
 * Returns `null` while the account is still being resolved, so callers can
 * avoid flashing another person's documents before the check completes.
 *
 * With no cloud configured the app is running as a purely local install, which
 * only the owner can reach — so local-only mode counts as owner.
 */
/**
 * Last resolved answer, kept for the page's lifetime so every later mount (the
 * Vault, Certifications) starts with it instead of waiting again.
 */
let cachedIsOwner: boolean | null = isSupabaseConfigured ? null : true;

export function useIsOwner(): boolean | null {
  const [isOwner, setIsOwner] = useState<boolean | null>(cachedIsOwner);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    // Hashing is async; only the latest session event may set the answer.
    let seq = 0;
    const resolve = async (email: string | null | undefined) => {
      const mine = ++seq;
      const owner = await isOwnerEmail(email);
      if (mine !== seq) return;
      cachedIsOwner = owner;
      if (!cancelled) setIsOwner(owner);
    };

    /*
     * getSession() reads the locally stored session — no network. This used to
     * be getUser(), which round-trips to the auth server on every mount and
     * held the whole Vault on a blank screen for seconds. This is a display
     * preference (labels, the template-import prompt), not access control: the
     * app is already behind AuthGate, and RLS guards the data.
     */
    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user?.email));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      resolve(session?.user?.email),
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isOwner;
}

/** How the owner is greeted. Nobody else ever sees it. */
export const OWNER_NAME = "Hamdan Zahid";

/**
 * The name to greet the signed-in person by: the owner's name on the owner's
 * account, else a name from the auth profile if one exists (sign-up doesn't
 * ask for one today, but OAuth providers fill it), else `null` — greet without
 * a name rather than guess one from an email address.
 *
 * `undefined` while the session is still being read (local, no network).
 */
let cachedName: string | null | undefined = isSupabaseConfigured ? undefined : OWNER_NAME;

export function useDisplayName(): string | null | undefined {
  const [name, setName] = useState<string | null | undefined>(cachedName);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    let seq = 0;
    const resolve = async (user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      const mine = ++seq;
      const meta = user?.user_metadata ?? {};
      const fromProfile = [meta.full_name, meta.name].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );
      const owner = await isOwnerEmail(user?.email);
      if (mine !== seq) return;
      cachedName = owner ? OWNER_NAME : (fromProfile?.trim() ?? null);
      if (!cancelled) setName(cachedName);
    };
    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      resolve(session?.user),
    );
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return name;
}
