"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Secondary navigation for the settings area. Vertical pane on tablet/desktop,
// a horizontal scroll strip on phones. Access (guest management) is admin-only.
const SECTIONS = [
  { label: "General", href: "/dashboard/settings" },
  { label: "Health", href: "/dashboard/settings/health" },
  { label: "Faith", href: "/dashboard/settings/faith" },
];

export function SettingsNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const sections = isAdmin
    ? [
        ...SECTIONS,
        { label: "Navigation", href: "/dashboard/settings/navigation" },
        { label: "Access", href: "/dashboard/settings/access" },
      ]
    : SECTIONS;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-black/[.06] pb-2 md:w-44 md:shrink-0 md:flex-col md:border-b-0 md:pb-0 dark:border-white/[.1]">
      {sections.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors pointer-coarse:py-3 ${
              active
                ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
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
