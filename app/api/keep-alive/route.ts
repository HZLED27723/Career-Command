import { createClient } from "@supabase/supabase-js";

/**
 * Daily Supabase keep-alive, run by Vercel Cron (see vercel.json).
 *
 * Free Supabase projects pause after about a week with no database activity —
 * which took the whole site's sign-in and sync down in Nov 2026. One small
 * query a day counts as activity. Row-level security hides every row from the
 * public key, but the query still runs against Postgres, which is all that's
 * needed.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // When CRON_SECRET is set on Vercel, Vercel Cron sends it as a bearer token;
  // anyone else gets a 401.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Supabase isn't configured on this deployment." },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("user_data")
    .select("user_id", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 502 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
