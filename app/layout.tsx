import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageBackdrop } from "@/components/layout/PageBackdrop";
import { AuthGate } from "@/components/auth/AuthGate";

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
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="h-dvh overflow-hidden">
        <AuthGate>
          <div className="flex h-full">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="relative min-h-0 flex-1 overflow-auto">
                <PageBackdrop />
                {children}
              </main>
            </div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
