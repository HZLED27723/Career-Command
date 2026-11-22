import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The ground rules for using CareerCommand: your content, the AI research, and what we can and can't promise.",
};

/** Plain-language terms of use (§7.31). Keep LEGAL_UPDATED in step. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={
        <p>
          These are the ground rules for using CareerCommand. By creating an
          account or using the app, you agree to them. They sit alongside the{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            privacy policy
          </Link>
          , which explains what happens to your data.
        </p>
      }
    >
      <LegalSection id="service" title="What CareerCommand is">
        <p>
          A personal workspace for your job search: tracking applications,
          keeping documents, researching companies and preparing for interviews.
          It&apos;s free to use. It&apos;s an organising tool, not careers,
          legal or financial advice, and it doesn&apos;t apply for jobs or
          contact employers for you.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <ul>
          <li>You need to be 16 or older.</li>
          <li>
            One account is for one person. Keep your password to yourself.
          </li>
          <li>
            Use an email address you can reach, since it&apos;s how you reset
            your password and how we&apos;d contact you about your data.
          </li>
          <li>Sign out on computers other people use.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="Your content stays yours">
        <p>
          You own everything you put into CareerCommand. You give us permission
          to store it, copy it between your devices and process it only to run
          the app for you, including sending the details described in the
          privacy policy to the AI research feature when you use it. That
          permission ends when you delete your content or your account.
        </p>
        <p>
          Only upload things you have the right to use. If you store details
          about other people (a referee&apos;s phone number, say), make sure
          they&apos;d be comfortable with that.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="AI research">
        <p>
          Company research is written by an AI model using public web pages. It
          can be out of date, incomplete or simply wrong, and anything it fills
          in is marked as an AI suggestion until you edit it. Check it before
          you rely on it, in an interview or anywhere else. Each account has a
          daily limit on lookups, which keeps the service free.
        </p>
      </LegalSection>

      <LegalSection id="use" title="Fair use">
        <p>Please don&apos;t:</p>
        <ul>
          <li>
            use the app for anything unlawful, or to store content that
            isn&apos;t yours to store;
          </li>
          <li>
            try to get into other people&apos;s accounts or data, or test the
            app&apos;s security without permission;
          </li>
          <li>
            script or automate the AI research, or try to get around its limits;
          </li>
          <li>resell or repackage the service.</li>
        </ul>
        <p>
          We may suspend an account that does these things. Where we can,
          we&apos;ll tell you first and give you the chance to export your data.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="Availability and backups">
        <p>
          We work to keep CareerCommand running and your data safe, but the
          service is provided as it is, and it may change, have outages or, one
          day, close. If it&apos;s going to close, we&apos;ll give at least 30
          days&apos; notice so you can export everything.
        </p>
        <p>
          Your account keeps a mirror of your data, not an archive: if you
          delete something, it&apos;s deleted everywhere. Export a backup from
          Data &amp; backup now and then and keep the file somewhere safe.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Responsibility">
        <p>
          To the extent the law allows, we aren&apos;t responsible for decisions
          made using the app, for missed deadlines, or for losses that come from
          relying on AI research. Nothing in these terms takes away rights you
          have under the Australian Consumer Law that can&apos;t be excluded.
        </p>
      </LegalSection>

      <LegalSection id="ending" title="Leaving">
        <p>
          You can stop using CareerCommand at any time. Data &amp; backup →
          Delete everything removes your data and your account.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes and contact">
        <p>
          If these terms change, the date at the top changes too, and
          significant changes will be shown in the app before they apply. These
          terms are governed by the laws in force in Australia.
        </p>
        <p>
          Questions? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
