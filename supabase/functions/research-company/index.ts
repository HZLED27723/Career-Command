// Supabase Edge Function: research-company
//
// Runs Claude with web search to research a company and return a structured
// dossier for the Company Intelligence module. The Anthropic API key stays
// server-side here (set as the ANTHROPIC_API_KEY secret) — it is never exposed
// to the browser. Only signed-in users can call this (JWT verification is on by
// default), so it can't be abused anonymously.
//
// Deploy:  supabase functions deploy research-company --project-ref <ref>
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Model:   optional — supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5
//          (defaults to claude-opus-4-8; Haiku is ~5x cheaper per lookup)

// Copy-paste through some apps/terminals silently swaps ASCII hyphens for
// Unicode dashes (– —) and can introduce stray whitespace. A non-ASCII byte in
// the key makes fetch() throw "not a valid ByteString" when it builds the
// x-api-key header — before the request is even sent. Normalize dashes back to
// hyphens, drop whitespace, then strip any remaining non-ASCII so the header
// can always be constructed. If the only corruption was a dash swap, this also
// recovers the correct key.
const RAW_ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_API_KEY = RAW_ANTHROPIC_API_KEY
  ?.replace(/[‐-―−]/g, "-")
  .replace(/\s+/g, "")
  .replace(/[^\x20-\x7E]/g, "");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

/** Give up rather than hang a browser tab on a stalled provider. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Claim one lookup against the caller's daily quota.
 *
 * The ceiling lives in the database function, not here and not in the client,
 * so it can't be raised by calling the endpoint directly — which is the whole
 * point of having a limit on something that costs money per call.
 *
 * Runs as the caller (their JWT is forwarded) so `auth.uid()` resolves to them.
 */
async function claimQuota(authHeader: string): Promise<
  { ok: true; used: number; quota: number } | { ok: false; reason: string }
> {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) {
    // Fail closed: an unmetered endpoint is worse than an unavailable one.
    return { ok: false, reason: "Usage limits aren't configured on the server." };
  }

  const res = await fetch(`${url}/rest/v1/rpc/consume_research_quota`, {
    method: "POST",
    headers: {
      apikey: anon,
      authorization: authHeader,
      "content-type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) {
    return {
      ok: false,
      reason:
        res.status === 401 || res.status === 403
          ? "You need to be signed in to use AI research."
          : "Couldn't check your usage allowance — try again shortly.",
    };
  }

  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row || typeof row.allowed !== "boolean") {
    return { ok: false, reason: "Couldn't check your usage allowance." };
  }
  if (!row.allowed) {
    return {
      ok: false,
      reason: `You've used all ${row.quota} AI lookups for today. The limit resets at midnight UTC — everything else in the app keeps working, and you can fill any section in by hand.`,
    };
  }
  return { ok: true, used: row.used, quota: row.quota };
}

const SYSTEM = `You are a research assistant helping a job seeker prepare to apply to a company and interview there. Given a company's name and website, use web search to gather CURRENT, factual information, then return a concise dossier.

Return ONLY a single JSON object — no preamble, no markdown fences, no commentary — with exactly these keys:
{
  "overview": "1-3 sentences: what the company is and does",
  "specialisations": "1-3 sentences: what they're known for / specialise in technically",
  "industries": ["short", "industry", "tags"],
  "notableProject": "one notable project, product, or achievement worth referencing",
  "whyInterested": "1-2 sentences written in first person from the applicant's perspective — a genuine, specific reason to want to work here (a cover-letter hook)",
  "opportunities": "internship / graduate programs, open roles, or application info if findable; otherwise a brief note on how they typically hire",
  "talkingPoints": "2-4 smart, specific things to raise in an interview, as a short newline-separated list"
}

Rules: Be specific and accurate — prefer facts you found via search over generic filler. If something genuinely can't be found, use an empty string "" (or [] for industries) rather than inventing details. Keep each field tight.`;

interface Block {
  type: string;
  text?: string;
  /** web_search_tool_result blocks carry the retrieved pages here. */
  content?: { type?: string; url?: string; title?: string }[];
}

/**
 * The pages the model actually retrieved, so the app can show where a dossier
 * came from. Collected from the web_search_tool_result blocks rather than from
 * anything the model writes — a model-authored citation list can be invented,
 * a tool result cannot.
 */
function collectSources(blocks: Block[]): { url: string; title?: string }[] {
  const seen = new Map<string, string | undefined>();
  for (const b of blocks) {
    if (b.type !== "web_search_tool_result" || !Array.isArray(b.content)) {
      continue;
    }
    for (const r of b.content) {
      if (r?.type === "web_search_result" && typeof r.url === "string") {
        if (!seen.has(r.url)) seen.set(r.url, r.title);
      }
    }
  }
  return [...seen.entries()].map(([url, title]) => ({ url, title }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only." }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json(
      { error: "AI research isn't configured yet (missing ANTHROPIC_API_KEY)." },
      500,
    );
  }

  // Authenticated callers only, and only within their allowance. Checked
  // before any paid work happens.
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return json({ error: "You need to be signed in to use AI research." }, 401);
  }
  const quota = await claimQuota(authHeader);
  if (!quota.ok) {
    return json({ error: quota.reason }, 429);
  }

  let name = "";
  let website = "";
  try {
    const body = await req.json();
    name = (body.name ?? "").toString().trim();
    website = (body.website ?? "").toString().trim();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!website) return json({ error: "A company website is required." }, 400);

  const messages: { role: string; content: unknown }[] = [
    {
      role: "user",
      content: `Company: ${name || "(name unknown — infer it from the site)"}\nWebsite: ${website}\n\nResearch this company and return the JSON dossier.`,
    },
  ];

  // Server-side web search may loop; continue on pause_turn up to a few times.
  let data: { stop_reason?: string; content?: Block[]; error?: { message?: string } } | null =
    null;
  // Search happens across turns, so sources accumulate rather than being read
  // off the final turn only.
  const sources: { url: string; title?: string }[] = [];
  const addSources = (blocks: Block[]) => {
    for (const s of collectSources(blocks)) {
      if (!sources.some((x) => x.url === s.url)) sources.push(s);
    }
  };
  // One budget for the whole exchange, pause_turn continuations included, so
  // a stalled provider can't hold the request open indefinitely.
  const abort = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    for (let i = 0; i < 4; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: abort,
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2500,
          system: SYSTEM,
          messages,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
        }),
      });
      data = await res.json();
      if (!res.ok) {
        return json(
          { error: data?.error?.message ?? "Anthropic API error." },
          502,
        );
      }
      addSources(data?.content ?? []);
      if (data?.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: data.content });
        continue;
      }
      break;
    }
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    return json(
      {
        error: timedOut
          ? "The research request took too long and was stopped. Nothing you typed was lost — try again, or fill the sections in by hand."
          : `Research request failed: ${String(e)}`,
      },
      timedOut ? 504 : 502,
    );
  }

  const text = (data?.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    return json({ error: "Couldn't parse the research result." }, 502);
  }
  // `sources` is what was actually retrieved. An empty array is meaningful:
  // it tells the client the dossier came from model knowledge alone, and the
  // UI says so rather than implying research happened.
  return json({ ...parsed, sources }, 200);
});

/** Pull the outermost JSON object out of the model's text response. */
function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
