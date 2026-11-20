"use client";

import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * AI company research. The browser can't safely call an LLM directly (the API
 * key must stay server-side), so this posts to a Supabase Edge Function
 * (`research-company`) that runs Claude with web search and returns structured
 * fields. Falls back to a clear "not set up yet" error if the function isn't
 * deployed, so the UI can guide the user instead of failing silently.
 */

import type { ResearchSource } from "./types";

export interface CompanyResearch {
  overview?: string;
  specialisations?: string;
  industries?: string[];
  notableProject?: string;
  whyInterested?: string;
  opportunities?: string;
  talkingPoints?: string;
  /**
   * Pages the lookup actually retrieved. Comes from the search tool's own
   * results, not from anything the model wrote, so it can't be a fabricated
   * citation list. An empty array means nothing was retrieved.
   */
  sources?: ResearchSource[];
}

/** AI research needs the cloud backend; it rides on the same Supabase project. */
export const isResearchConfigured = isSupabaseConfigured;

export class ResearchNotSetupError extends Error {
  constructor() {
    super("AI research isn't connected yet.");
    this.name = "ResearchNotSetupError";
  }
}

export async function researchCompany(input: {
  name?: string;
  website: string;
}): Promise<CompanyResearch> {
  if (!supabase) throw new ResearchNotSetupError();

  const { data, error } = await supabase.functions.invoke("research-company", {
    body: { name: input.name ?? "", website: input.website },
  });

  if (error) {
    // A missing/undeployed function surfaces as a network/non-2xx error.
    const msg = (error.message ?? "").toLowerCase();
    if (
      msg.includes("not found") ||
      msg.includes("404") ||
      msg.includes("failed to fetch") ||
      msg.includes("failed to send")
    ) {
      throw new ResearchNotSetupError();
    }

    /*
     * supabase-js reports any non-2xx as the same generic "Edge Function
     * returned a non-2xx status code", which would hide the one message the
     * user actually needs — that they've hit their daily allowance, or that
     * the request timed out. The real explanation is in the response body.
     */
    const body = (error as { context?: Response }).context;
    if (body && typeof body.json === "function") {
      try {
        const parsed = await body.json();
        if (parsed && typeof parsed.error === "string") {
          throw new Error(parsed.error);
        }
      } catch (e) {
        // Re-throw our own extracted message; swallow only parse failures.
        if (e instanceof Error && e.message && !/JSON|Unexpected/i.test(e.message)) {
          throw e;
        }
      }
    }
    throw new Error(error.message || "Research failed. Try again.");
  }

  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return (data ?? {}) as CompanyResearch;
}
