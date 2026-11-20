"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. This app is fully client-side (static), so the
 * plain browser client with a persisted session is all we need — no SSR/cookie
 * plumbing.
 *
 * The anon key is public by design (it's meant to ship in client code) and is
 * protected by row-level security in the database. If the env vars aren't set,
 * the app runs in local-only mode and `supabase` is null — everything still
 * works, it just doesn't sync.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer publishable key (sb_publishable_…) or the classic anon key —
// both are the public, client-safe key protected by row-level security.
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && publicKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, publicKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
