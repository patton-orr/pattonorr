"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The dashboard content column. On faith routes it carries the warm sepia
// `.faith-theme` so the whole area (and its cards, via the --faith-card token)
// reads as one warm surface — matching the Bible reader. Everywhere else it's
// the neutral default.
export function ContentArea({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const faith =
    pathname === "/dashboard/faith" || pathname.startsWith("/dashboard/bible");
  return (
    <main
      className={`min-w-0 flex-1 p-6 sm:p-8${faith ? " faith-theme" : ""}`}
      style={
        faith
          ? { background: "var(--reader-bg)", color: "var(--reader-fg)" }
          : undefined
      }
    >
      {children}
    </main>
  );
}
