"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { sectionForPath } from "@/lib/access-config";

// The dashboard content column. On faith routes it carries the warm sepia
// `.faith-theme`. It also gates sections a guest hasn't been granted (admin sees
// everything; Settings is admin-only) — a UX guard for direct URLs.
export function ContentArea({
  children,
  sections,
  isAdmin,
}: {
  children: ReactNode;
  sections: string[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const faith =
    pathname === "/dashboard/faith" || pathname.startsWith("/dashboard/bible");
  const section = sectionForPath(pathname);
  // Home is always available to any signed-in user (the guest welcome lives
  // there); Settings is admin-only; everything else must be granted.
  const denied =
    !isAdmin &&
    section !== null &&
    section !== "home" &&
    (section === "settings" || !sections.includes(section));

  return (
    <main
      className={`min-w-0 flex-1 p-6 sm:p-8${faith ? " faith-theme" : ""}`}
      style={
        faith
          ? { background: "var(--reader-bg)", color: "var(--reader-fg)" }
          : undefined
      }
    >
      {denied ? (
        <div className="flex max-w-md flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
            No access
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You don&apos;t have access to this section. Ask the site owner to
            grant it.
          </p>
        </div>
      ) : (
        children
      )}
    </main>
  );
}
