import {
  splitSkills,
  type CoverLetterFields,
  type ResumeContent,
} from "./resume";

/**
 * Real LaTeX source generation (§7.2 Phase 4 stretch): the structured
 * content model serialises to compile-ready .tex for Claude Prism,
 * Overleaf or a local TeX install. In-browser WASM compilation was ruled
 * out — SwiftLaTeX's on-demand package CDN is offline (checked 2026-07-04),
 * so compiles can't resolve packages client-side.
 */

/** Escape LaTeX special characters. Backslash first, then the rest. */
export function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

const e = escapeLatex;

const PREAMBLE = String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[a4paper,margin=1.9cm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{parskip}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\titleformat{\section}{\scshape\bfseries\small}{}{0em}{}[\vspace{-6pt}\rule{\textwidth}{0.6pt}]
\titlespacing*{\section}{0pt}{10pt}{6pt}
\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt,parsep=0pt}`;

export function resumeToLatex(c: ResumeContent): string {
  const contact = [c.email, c.phone, c.location, c.links]
    .filter(Boolean)
    .map(e)
    .join("  $\\cdot$  ");

  const lines: (string | false)[] = [
    PREAMBLE,
    "",
    String.raw`\begin{document}`,
    "",
    String.raw`\begin{center}`,
    `  {\\LARGE ${e(c.name)}}\\\\[3pt]`,
    c.tagline.trim() !== "" && `  {\\itshape ${e(c.tagline)}}\\\\[3pt]`,
    contact !== "" && `  {\\small ${contact}}`,
    String.raw`\end{center}`,
  ];

  if (c.summary.trim()) {
    lines.push("", e(c.summary.trim()));
  }

  for (const section of c.sections) {
    lines.push("", `\\section{${e(section.title)}}`);
    section.items.forEach((item, idx) => {
      if (idx > 0) lines.push("\\vspace{4pt}");
      const heading = [
        `\\textbf{${e(item.heading)}}`,
        item.sub?.trim() && `\\textit{--- ${e(item.sub)}}`,
      ]
        .filter(Boolean)
        .join(" ");
      const dates = item.dates?.trim()
        ? `\\hfill {\\small\\itshape ${e(item.dates)}}`
        : "";
      lines.push(`${heading}${dates}`);
      const bullets = item.bullets.map((b) => b.trim()).filter(Boolean);
      if (bullets.length > 0) {
        lines.push(
          String.raw`\begin{itemize}`,
          ...bullets.map((b) => `  \\item ${e(b)}`),
          String.raw`\end{itemize}`,
        );
      }
    });
  }

  const skills = splitSkills(c.skills);
  if (skills.length > 0) {
    lines.push(
      "",
      String.raw`\section{Technical Skills}`,
      skills.map(e).join(" $\\cdot$ "),
    );
  }

  lines.push("", String.raw`\end{document}`, "");
  return lines.filter((l): l is string => typeof l === "string").join("\n");
}

/** Mirrors the layout of the Vault's cover-letter template (CoverLetterPreview). */
export function coverLetterToLatex(
  f: CoverLetterFields,
  body: string,
): string {
  const date =
    f.date.trim() ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => e(p.trim()).replace(/\n/g, "\\\\\n"))
    .filter(Boolean);

  return [
    String.raw`\documentclass[10pt,a4paper]{article}`,
    String.raw`\usepackage[a4paper,margin=2.2cm]{geometry}`,
    String.raw`\usepackage[T1]{fontenc}`,
    String.raw`\usepackage[utf8]{inputenc}`,
    String.raw`\usepackage{lmodern}`,
    String.raw`\usepackage{parskip}`,
    String.raw`\pagestyle{empty}`,
    String.raw`\setlength{\parindent}{0pt}`,
    "",
    String.raw`\begin{document}`,
    "",
    String.raw`\begin{center}`,
    `  {\\LARGE ${e(f.yourName)}}\\\\[8pt]`,
    f.contactLine.trim() !== "" && `  ${e(f.contactLine)}\\\\[3pt]`,
    f.locationLine.trim() !== "" && `  ${e(f.locationLine)}`,
    String.raw`\end{center}`,
    "",
    String.raw`\vspace{6pt}`,
    `\\noindent ${e(f.greeting)} \\hfill ${e(date)}`,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    e(f.closing),
    "",
    String.raw`\vspace{36pt}`,
    e(f.yourName),
    "",
    String.raw`\end{document}`,
    "",
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");
}

/** Trigger a client-side download of generated .tex source. */
export function downloadTex(source: string, filename: string) {
  downloadBlob(
    new Blob([source], { type: "application/x-tex" }),
    filename.endsWith(".tex") ? filename : `${filename}.tex`,
  );
}

/** Save a document as a .json backup that Import restores exactly. */
export function downloadJson(data: unknown, filename: string) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename.endsWith(".json") ? filename : `${filename}.json`,
  );
}

/** Hand back a stored file (or any blob) under a chosen name. */
export function downloadFile(blob: Blob, filename: string) {
  downloadBlob(blob, filename);
}

/**
 * Save rendered document HTML as a .doc. Word opens HTML-flavoured .doc files
 * natively, which avoids pulling in a whole .docx builder — formatting is
 * close but not identical to the on-screen render. A file the user imported
 * is always handed back untouched instead of going through this.
 */
export function downloadWordFromHtml(html: string, filename: string) {
  const doc = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${filename}</title><style>@page{size:A4;margin:2cm}body{font-family:Calibri,Arial,sans-serif;color:#000}</style></head><body>${html}</body></html>`;
  downloadBlob(
    new Blob(["﻿", doc], { type: "application/msword" }),
    filename.endsWith(".doc") ? filename : `${filename}.doc`,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
