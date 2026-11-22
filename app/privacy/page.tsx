import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What CareerCommand collects, where it's kept, who it's shared with, and how to export or delete it.",
};

/**
 * Plain-language privacy policy (§7.31). Every statement here describes how
 * the app actually behaves — if the code changes what's collected or where
 * it goes (a new provider, analytics, a new AI feature), this page changes in
 * the same commit and LEGAL_UPDATED moves.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={
        <p>
          CareerCommand holds some of the most personal things you own: your
          résumé, the jobs you&apos;re chasing and what you&apos;d say in an
          interview. This page says exactly what happens to them, in plain
          words. The short version: your records are yours, they&apos;re only
          used to run the app for you, and you can take them out or delete them
          at any time.
        </p>
      }
    >
      <LegalSection id="summary" title="At a glance">
        <ul>
          <li>
            No ads, no analytics, no tracking cookies, and your data is never
            sold.
          </li>
          <li>Your records are visible only to your signed-in account.</li>
          <li>
            Only the AI company research sends anything to an AI provider, and
            only what that feature needs (see below).
          </li>
          <li>
            You can export everything or delete everything yourself, from Data
            &amp; backup.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="collect" title="What we collect">
        <p>
          <b>Your account.</b> Your email address and a password. The password
          is handled by our sign-in provider and stored only as a secure hash;
          we can&apos;t see it.
        </p>
        <p>
          <b>What you put in.</b> Applications, companies, interview questions
          and answers, examples, skills, courses, certifications, and any files
          you upload (documents, certificates, logos). We only have what you
          type or upload.
        </p>
        <p>
          <b>What we don&apos;t collect.</b> We don&apos;t ask for your
          location, contacts or phone number, and we don&apos;t run analytics or
          advertising scripts. Please don&apos;t upload government ID, tax file
          numbers or bank details. The app doesn&apos;t need them.
        </p>
      </LegalSection>

      <LegalSection id="where" title="Where it's kept">
        <p>
          <b>On your device.</b> The app saves your records in your
          browser&apos;s own storage first, so it&apos;s fast and works offline.
          When you sign out, the records are removed from that browser once
          they&apos;re safely saved to your account. A light or dark theme
          choice is also remembered on the device.
        </p>
        <p>
          <b>In your account.</b> A copy is kept with{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>
          , our database and sign-in provider, so your other devices stay in
          step. Row-level security on that database means only your own
          signed-in account can read or change your copy.
        </p>
        <p>
          <b>The website.</b> The site is served by{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          , which, like any web host, keeps short-lived technical logs (such as
          IP address and browser type) to run and protect the service.
        </p>
        <p>
          These providers may store data outside Australia. They hold it to run
          the service for us and aren&apos;t allowed to use it for their own
          purposes.
        </p>
      </LegalSection>

      <LegalSection id="shared" title="Who else sees it">
        <p>
          <b>AI company research (Anthropic).</b> When you ask the app to
          research a company, the company name and website you entered are sent
          to{" "}
          <a
            href="https://www.anthropic.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic
          </a>
          &apos;s API, which searches the web and writes the summary. If you ask
          it to shorten a company&apos;s notes, those notes are sent too.
          Nothing else goes: not your résumé, applications, answers or files.
          Under Anthropic&apos;s commercial terms, data sent through its API
          isn&apos;t used to train its models. AI research is optional, and
          everything it fills in can be written by hand instead.
        </p>
        <p>
          <b>Logos (Google).</b> On the Courses page, a provider&apos;s logo is
          fetched from Google&apos;s public icon service using the
          provider&apos;s web address (for example, coursera.org). Nothing about
          you is included.
        </p>
        <p>
          <b>Calendar links (Google).</b> If you click &ldquo;Google&rdquo; on a
          date, Google Calendar opens with that one event&apos;s title and date
          filled in. The calendar file option never leaves your device:
          it&apos;s made in your browser and downloaded straight to you.
        </p>
        <p>
          We don&apos;t sell, rent or share your data with anyone else, and we
          don&apos;t use it for advertising. We&apos;d only disclose it if the
          law required us to.
        </p>
      </LegalSection>

      <LegalSection id="control" title="Your control over it">
        <ul>
          <li>
            <b>See and correct it:</b> everything you&apos;ve stored is shown in
            the app and can be edited there.
          </li>
          <li>
            <b>Take it with you:</b> Data &amp; backup → Export all data
            downloads one file holding every record and uploaded file.
          </li>
          <li>
            <b>Delete it:</b> Data &amp; backup → Delete everything removes all
            your records from the device and from your account, then deletes
            your login itself. A final export downloads first so you keep a
            copy.
          </li>
          <li>
            <b>Leave a shared computer clean:</b> signing out removes your
            records from that browser.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="security" title="Keeping it safe">
        <p>
          Everything travels over encrypted connections (HTTPS). Access to your
          account&apos;s copy is enforced by the database itself, not just by
          the app. The keys that pay for AI research stay on the server and are
          never sent to your browser, and each account has a daily limit on AI
          lookups.
        </p>
        <p>
          No system is perfectly secure. If we ever learn of a breach that
          affects your data, we&apos;ll tell you by email and explain what
          happened and what to do.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <p>
          Your records stay until you delete them or your account. Deleting
          removes them from the live database straight away. Copies inside our
          providers&apos; routine backups expire on those providers&apos;
          schedules and aren&apos;t restored. Short-lived hosting logs are kept
          only as long as the host needs them.
        </p>
      </LegalSection>

      <LegalSection id="age" title="Age">
        <p>
          CareerCommand is meant for people aged 16 and over who are looking for
          work or study opportunities.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes and contact">
        <p>
          If this policy changes, the date at the top changes too, and anything
          that affects how your data is used will be shown in the app before it
          takes effect.
        </p>
        <p>
          Questions, a request about your data, or a complaint? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to
          reply within 30 days. If you&apos;re not satisfied with the answer,
          you can contact the{" "}
          <a
            href="https://www.oaic.gov.au/privacy/privacy-complaints"
            target="_blank"
            rel="noopener noreferrer"
          >
            Office of the Australian Information Commissioner
          </a>
          .
        </p>
        <p>
          See also the <Link href="/terms">terms of use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
