"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { warmVaultCovers } from "@/lib/vaultWarmup";
import { Badge } from "@/components/ui/Badge";
import { LogoTile, Wordmark } from "@/components/brand/Logo";
import { BackupControl } from "@/components/layout/BackupControl";
import { AccountControl } from "@/components/auth/AccountControl";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", code: "00" },
  { href: "/workspace", label: "Vault", code: "01" },
  { href: "/companies", label: "Companies", code: "02" },
  { href: "/tracker", label: "Tracker", code: "03" },
  { href: "/interview", label: "Interview", code: "04" },
  { href: "/examples", label: "Examples", code: "05" },
  { href: "/certifications", label: "Certifications", code: "06" },
  { href: "/skills", label: "Skills", code: "07" },
  { href: "/courses", label: "Courses", code: "08" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  // The sidebar mounts once the app is ready (signed in and synced), which is
  // the right moment to get the Vault's covers ready in the background.
  useEffect(() => warmVaultCovers(), []);

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-edge bg-surface max-md:w-16">
      <div className="flex h-14 items-center gap-2.5 border-b border-edge px-4 max-md:justify-center max-md:px-0">
        <LogoTile className="size-8" />
        <Wordmark className="text-[15px] max-md:hidden" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              // On mobile the sidebar collapses to an icon rail, where py-2
              // left each link under the ~44px minimum touch target.
              className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-150 max-md:min-h-11 max-md:justify-center max-md:px-0 max-md:py-3 ${
                active
                  ? "bg-raised text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                  : "text-ink-muted hover:bg-panel hover:text-ink"
              }`}
            >
              <span
                className={`font-mono text-[10px] ${
                  active ? "text-accent" : "text-ink-faint"
                }`}
              >
                {item.code}
              </span>
              <span className="max-md:hidden">{item.label}</span>
            </Link>
          );
        })}

        <div
          className="mt-1 flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2 text-sm text-ink-faint max-md:min-h-11 max-md:justify-center max-md:px-0 max-md:py-3"
          title="A shareable page of selected work — not built yet"
        >
          <span className="font-mono text-[10px]">09</span>
          <span className="max-md:hidden">Portfolio</span>
          <span className="ml-auto max-md:hidden">
            <Badge tone="faint">Soon</Badge>
          </span>
        </div>
      </nav>

      <div className="space-y-2 border-t border-edge p-3 max-md:p-2">
        <AccountControl />
        <BackupControl />
        <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint max-md:text-center">
          <span className="max-md:hidden">v0.1</span>
          <span className="md:hidden">v0.1</span>
        </p>
      </div>
    </aside>
  );
}
