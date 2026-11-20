import {
  DM_Sans,
  Public_Sans,
  Roboto,
  Source_Sans_3,
} from "next/font/google";
import localFont from "next/font/local";

/**
 * Document faces extracted from the user's real PDFs:
 * — CMU Serif (Computer Modern / Latin Modern web port), vendored in
 *   app/fonts/cm: technical resume + LaTeX cover letter.
 * — DM Sans + Public Sans: retail resume.
 * — Roboto (header) + Source Sans (Pro→3, body): Awesome CV.
 */
export const cmSerif = localFont({
  src: [
    { path: "../../app/fonts/cm/cmunrm.woff", weight: "400", style: "normal" },
    { path: "../../app/fonts/cm/cmunbx.woff", weight: "700", style: "normal" },
    { path: "../../app/fonts/cm/cmunti.woff", weight: "400", style: "italic" },
  ],
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400"] });

export const cvRoboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const cvSourceSans = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
});
