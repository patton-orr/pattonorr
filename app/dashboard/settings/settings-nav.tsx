"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Secondary navigation for the settings area. Vertical pane on tablet/desktop,
// a horizontal scroll strip on phones. General is open to everyone; Faith shows
// when the user has Faith access; Health, Top bar, and Access are admin-only.
export function SettingsNav({
  isAdmin = false,
  sections = [],
}: {
  isAdmin?: boolean;
  sections?: string[];
}) {
  const pathname = usePathname();
  const showFaith = isAdmin || sections.includes("faith");
  const items = [
    { label: "General", href: "/dashboard/settings" },
    ...(showFaith ? [{ label: "Faith", href: "/dashboard/settings/faith" }] : []),
    ...(isAdmin
      ? [
          { label: "Health", href: "/dashboard/settings/health" },
          { label: "Navigation", href: "/dashboard/settings/navigation" },
          { label: "Access", href: "/dashboard/settings/access" },
        ]
      : []),
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/[.06] pb-2 md:w-44 md:shrink-0 md:flex-col md:border-b-0 md:pb-0 dark:border-white/[.1]">
      {items.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors pointer-coarse:py-3 ${
              active
                ? "bg-[var(--nav-pill-bg)] text-[var(--nav-pill-fg)]"
                : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
