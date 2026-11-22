import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Brand typeface (brand guidelines §05) — the wordmark is always Archivo. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "CareerCommand",
    template: "%s · CareerCommand",
  },
  description:
    "Your personal career command center — dual-track resumes, application tracker, interview prep and certifications.",
  applicationName: "CareerCommand",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CareerCommand",
  },
  icons: {
    icon: "/icon.svg",
    // iOS wants a PNG and applies its own mask + shadow, so this one is a
    // full-bleed square (brand guidelines §03).
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e0d",
  // Dark by default; the light theme sets `color-scheme: light` in CSS.
  colorScheme: "dark light",
};

/**
 * Applies a saved light-theme choice before first paint, so a light page
 * never flashes dark. Must stay tiny and dependency-free; it runs before
 * React. The key matches THEME_KEY in components/layout/ThemeToggle.tsx.
 */
const THEME_BOOT = `try{if(localStorage.getItem("cc-theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
      // The boot script may set data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="h-dvh overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
