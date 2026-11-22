"use client";

import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PageBackdrop } from "./PageBackdrop";

/**
 * Pages anyone can read without an account (§7.31). The privacy policy and
 * terms must be reachable before sign-up, so they skip the sign-in gate and
 * the app chrome. They hold no user data.
 */
export const PUBLIC_PATHS = ["/privacy", "/terms"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PUBLIC_PATHS.includes(pathname)) {
    return <div className="h-full overflow-auto bg-bg">{children}</div>;
  }
  return (
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
  );
}
