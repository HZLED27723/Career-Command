import { splitSkills, type ResumeContent } from "@/lib/resume";
import type { ResumeEngine } from "@/lib/types";
import { cvRoboto, cvSourceSans, dmSans, publicSans } from "./fonts";


/**
 * Renders the shared content model through one of two print-ready templates
 * (§7.2): "cv" is Engine C (Technical Resume), the multi-page awesome-cv
 * layout; "visual" is Engine A (Hamdan Zahid — Resume), the Canva
 * replacement.
 */
export function ResumePreview({
  engine,
  content,
}: {
  engine: ResumeEngine;
  content: ResumeContent;
}) {
  return engine === "cv" ? (
    <CVTemplate c={content} />
  ) : (
    <RetailTemplate c={content} />
  );
}

const nonEmptyBullets = (bullets: string[]) =>
  bullets.map((b) => b.trim()).filter(Boolean);

/* ── Contact icons — shared by the CV template ──────────────────────── */

const PhoneIcon = ({ className = "size-[9px]" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={`${className} fill-current`}>
    <path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z" />
  </svg>
);

const MailIcon = ({ className = "size-[9px]" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={`${className} fill-current`}>
    <path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z" />
  </svg>
);

const LinkedInIcon = ({
  className = "size-[9px]",
}: {
  className?: string;
}) => (
  <svg viewBox="0 0 448 512" className={`${className} fill-current`}>
    <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z" />
  </svg>
);

/* ── Extended CV: faithful render of the user's awesome-cv.cls ──────── */

// Colour values from awesome-cv.cls with \colorlet{awesome}{awesome-red}
const CV_ACCENT = "#DC3522"; // awesome-red
const CV_DARK = "#333333"; // text (body, name, subsections)
const CV_TEXT = "#414141"; // darktext (entry titles)
const CV_GRAY = "#5D5D5D"; // graytext
const CV_LIGHT = "#999999"; // lighttext

/** `sub` stores "organisation · location"; the cls puts location in red on the right. */
const splitSub = (sub?: string) => {
  const s = sub ?? "";
  const i = s.lastIndexOf(" · ");
  return i === -1
    ? { main: s, location: "" }
    : { main: s.slice(0, i), location: s.slice(i + 3) };
};

function CVTemplate({ c }: { c: ResumeContent }) {
  return (
    <div
      className={`${cvSourceSans.className} h-full bg-white px-[7%] py-[5%] text-[10px] leading-[1.5]`}
      style={{ color: CV_DARK }}
    >
      {/* \makecvheader — Roboto: bold name, italic address, icon contact row;
          the position line is Source Sans small caps in awesome-red */}
      <header className={`${cvRoboto.className} text-center`}>
        <h1 className="text-[30px] font-bold" style={{ color: CV_DARK }}>
          {c.name}
        </h1>
        {c.tagline.trim() && (
          <p
            className={`${cvSourceSans.className} text-[9.5px] tracking-[0.04em]`}
            style={{ color: CV_ACCENT, fontVariant: "small-caps" }}
          >
            {c.tagline}
          </p>
        )}
        {c.location && (
          <p className="mt-0.5 text-[9.5px] italic" style={{ color: CV_LIGHT }}>
            {c.location}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2.5 text-[8.5px]">
          {c.phone && (
            <span className="inline-flex items-center gap-1">
              <PhoneIcon className="size-[7px]" />
              {c.phone}
            </span>
          )}
          {c.phone && c.email && <span>|</span>}
          {c.email && (
            <span className="inline-flex items-center gap-1">
              <MailIcon className="size-[7px]" />
              {c.email}
            </span>
          )}
          {c.email && c.links && <span>|</span>}
          {c.links && (
            <span className="inline-flex items-center gap-1">
              <LinkedInIcon className="size-[7px]" />
              {c.links}
            </span>
          )}
        </p>
      </header>

      {/* intro.tex: \cvparagraph wrapped in \textbf → semibold, justified */}
      {c.summary.trim() && (
        <CVSection title="Introduction">
          <p className="text-justify text-[10.5px] font-semibold leading-[1.65]">
            {c.summary}
          </p>
        </CVSection>
      )}

      {c.sections.map((section) => {
        const isSkills = /skill/i.test(section.title);
        const isEducation = /education/i.test(section.title);
        return (
          <CVSection key={section.id} title={section.title}>
            {section.items.map((item) => {
              const { main, location } = splitSub(item.sub);
              const bullets = nonEmptyBullets(item.bullets);

              /* \cvsubsection: heading-only items (Honors subsections) */
              if (!item.sub && !item.dates && bullets.length === 0) {
                return (
                  <h3
                    key={item.id}
                    className="mt-2.5 mb-1 text-[13px] tracking-[0.02em] first:mt-0"
                    style={{ color: CV_DARK, fontVariant: "small-caps" }}
                  >
                    {item.heading}
                  </h3>
                );
              }

              /* \cvskill: bold type right-aligned, skillset in light red */
              if (isSkills) {
                return (
                  <div
                    key={item.id}
                    className="mt-1 flex items-baseline gap-5 first:mt-0"
                  >
                    <p
                      className="w-40 shrink-0 text-right text-[10px] font-bold"
                      style={{ color: CV_TEXT }}
                    >
                      {item.heading}
                    </p>
                    <p
                      className="text-[10px] font-light"
                      style={{ color: CV_ACCENT }}
                    >
                      {item.sub}
                    </p>
                  </div>
                );
              }

              /* \cvhonor: date right-aligned left col · Position, Title ·
                 location in light red italic */
              if (bullets.length === 0) {
                return (
                  <div
                    key={item.id}
                    className="mt-1 grid grid-cols-[3rem_1fr_auto] gap-x-4 text-[10px] first:mt-0"
                  >
                    <p className="text-right" style={{ color: CV_GRAY }}>
                      {item.dates ?? ""}
                    </p>
                    <p>
                      <span className="font-bold" style={{ color: CV_TEXT }}>
                        {item.heading}
                      </span>
                      {main && <span style={{ color: CV_GRAY }}>, {main}</span>}
                    </p>
                    {location && (
                      <p
                        className="font-light italic"
                        style={{ color: CV_ACCENT }}
                      >
                        {location}
                      </p>
                    )}
                  </div>
                );
              }

              /* \cventry: bold org + light-red-italic location on row 1,
                 gray small-caps position + light-italic date on row 2 */
              return (
                <div
                  key={item.id}
                  className="mt-4 first:mt-0"
                  style={{ breakInside: "avoid-page" }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: CV_TEXT }}
                    >
                      {main || item.heading}
                    </p>
                    {location && (
                      <p
                        className="shrink-0 text-[9.5px] font-light italic"
                        style={{ color: CV_ACCENT }}
                      >
                        {location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    {main ? (
                      <p
                        className="text-[10px]"
                        style={{ color: CV_GRAY, fontVariant: "small-caps" }}
                      >
                        {item.heading}
                      </p>
                    ) : (
                      <span />
                    )}
                    {item.dates && (
                      <p
                        className="shrink-0 text-[10px] font-light italic"
                        style={{ color: CV_GRAY }}
                      >
                        {item.dates}
                      </p>
                    )}
                  </div>
                  {isEducation ? (
                    /* education.tex: → markers in gray small caps */
                    <ul className="mt-1.5 space-y-1 pl-3">
                      {bullets.map((b, i) => (
                        <li key={i} className="flex gap-2 text-[10px]">
                          <span className="font-light">→</span>
                          <span
                            style={{
                              color: CV_GRAY,
                              fontVariant: "small-caps",
                            }}
                          >
                            {b}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    /* cvitems: \textbf bullets → semibold, justified, · marker */
                    <ul className="mt-1.5 space-y-1.5 pl-1">
                      {bullets.map((b, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-justify text-[10px] font-semibold leading-[1.55]"
                        >
                          <span className="shrink-0 font-normal">·</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CVSection>
        );
      })}

      {splitSkills(c.skills).length > 0 && (
        <CVSection title="Technical Skills">
          <p className="text-[10px] font-light" style={{ color: CV_ACCENT }}>
            {splitSkills(c.skills).join(",  ")}
          </p>
        </CVSection>
      )}
    </div>
  );
}

/* \cvsection: bold title with the FIRST 3 LETTERS in awesome-red, then a
   rule filling the rest of the line */
function CVSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5" style={{ breakInside: "avoid-page" }}>
      <div className="flex items-center gap-2.5">
        <h2 className="shrink-0 text-[15px] font-bold">
          <span style={{ color: CV_ACCENT }}>{title.slice(0, 3)}</span>
          <span style={{ color: CV_DARK }}>{title.slice(3)}</span>
        </h2>
        <div className="mt-1 h-px flex-1" style={{ background: "#6b6b6b" }} />
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/* ── Engine B: faithful render of the user's retail resume PDF ──────── */

// Section-header band fill sampled from the PDF
const RETAIL_BAND = "#D7E0E7";
const RETAIL_INK = "#1e1e1e";

function RetailTemplate({ c }: { c: ResumeContent }) {
  const flatSkills = splitSkills(c.skills);
  return (
    <div
      className={`${dmSans.className} h-full bg-white px-[4.5%] py-[4.5%] text-[10px] leading-[1.7]`}
      style={{ color: RETAIL_INK }}
    >
      {/* Centered name block over a hairline-bounded contact row */}
      <header className="text-center">
        <h1 className="text-[26px] font-bold tracking-[0.02em] text-black uppercase">
          {c.name}
        </h1>
        <p className="text-[12px] font-bold">{c.tagline}</p>
      </header>
      <div
        className={`${publicSans.className} mt-3 border-y border-[#c9c9c9] py-1.5 text-center text-[10px] text-[#333132]`}
      >
        {[c.email, c.phone, c.links, c.location].filter(Boolean).join("  |  ")}
      </div>

      {c.summary.trim() && (
        <>
          <RetailBand>Summary</RetailBand>
          <p className="px-1.5 text-justify leading-[1.9]">{c.summary}</p>
        </>
      )}

      {c.sections.map((section) => {
        // Key Skills / Languages render as a spread row (no dates, no bullets)
        const inline =
          section.items.length > 0 &&
          section.items.every(
            (it) => nonEmptyBullets(it.bullets).length === 0 && !it.dates,
          );
        const connector = /experience/i.test(section.title);

        return (
          <div key={section.id} style={{ breakInside: "avoid-page" }}>
            <RetailBand>{section.title}</RetailBand>
            {inline ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1.5">
                {section.items.map((it) => (
                  <p key={it.id}>
                    {it.sub ? (
                      <>
                        <span className="font-bold">{it.heading}</span>
                        <span className="italic"> - {it.sub}</span>
                      </>
                    ) : (
                      it.heading
                    )}
                  </p>
                ))}
              </div>
            ) : (
              <div className="space-y-4 px-1.5">
                {section.items.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3">
                      <p
                        className={`text-[11px] font-bold ${
                          connector ? "shrink-0" : "min-w-0"
                        }`}
                      >
                        {item.heading}
                      </p>
                      {connector && (
                        <span
                          className="h-px flex-1"
                          style={{ background: RETAIL_INK }}
                        />
                      )}
                      {item.dates && (
                        <p className="ml-auto shrink-0 text-[11px] font-bold">
                          {item.dates}
                        </p>
                      )}
                    </div>
                    {item.sub && (
                      <p className="mt-0.5 text-[10px] italic">{item.sub}</p>
                    )}
                    {nonEmptyBullets(item.bullets).length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-justify">
                        {nonEmptyBullets(item.bullets).map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {flatSkills.length > 0 && (
        <>
          <RetailBand>Key Skills</RetailBand>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1.5">
            {flatSkills.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RetailBand({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-5 mb-3 rounded-md px-5 py-1.5 text-[12px] font-bold tracking-[0.06em] text-black uppercase"
      style={{ background: RETAIL_BAND }}
    >
      {children}
    </div>
  );
}
