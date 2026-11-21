"use client";

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Who this deployment's personal content belongs to.
 *
 * CareerCommand started as one person's private workspace, so real documents
 * and real credentials are baked into the source as defaults: the Vault renders
 * Hamdan's actual resume, CV and cover letter, and Certifications offers to add
 * the four credentials from his CV.
 *
 * That is correct for him and wrong for everyone else — a stranger signing up
 * would be shown another person's resume as if it were their own starting
 * point. Personal defaults are therefore gated on identity rather than shipped
 * as shared starter content.
 *
 * Generic suggestions (interview questions, example skills and courses) are NOT
 * gated — they belong to nobody and are labelled as examples where they appear.
 */
export const OWNER_EMAIL = "hamdan3809@gmail.com";

const normalise = (email: string | null | undefined) =>
  (email ?? "").trim().toLowerCase();

export const isOwnerEmail = (email: string | null | undefined) =>
  normalise(email) === OWNER_EMAIL;

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
    const resolve = (email: string | null | undefined) => {
      cachedIsOwner = isOwnerEmail(email);
      if (!cancelled) setIsOwner(cachedIsOwner);
    };

    /*
     * getSession() reads the locally stored session — no network. This used to
     * be getUser(), which round-trips to the auth server on every mount and
     * held the whole Vault on a blank screen for seconds. This is a display
     * preference (whose built-in templates to show), not access control: the
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
    const resolve = (user: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
      const meta = user?.user_metadata ?? {};
      const fromProfile = [meta.full_name, meta.name].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      );
      cachedName = isOwnerEmail(user?.email) ? OWNER_NAME : (fromProfile?.trim() ?? null);
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
