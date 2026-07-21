"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "./actions";

// Nav is data-driven so it can grow into life areas (Work, Life, Finances,
// Faith, Relationships, Health…) — and later a focus filter that hides areas —
// without touching the rendering. WHOOP lives under Health as the first group.
type Leaf = { label: string; href: string };
type Group = { label: string; items: Leaf[] };
type Entry = Leaf | Group;

const NAV: Entry[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Health", items: [{ label: "WHOOP", href: "/dashboard/whoop" }] },
  { label: "Notes", href: "/dashboard/notes" },
  { label: "Ideas", href: "/dashboard/ideas" },
  { label: "Settings", href: "/dashboard/settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: Leaf;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
        active
          ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
          : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
      }`}
    >
      {item.label}
    </Link>
  );
}

function SidebarContent({
  pathname,
  email,
  onNavigate,
}: {
  pathname: string;
  email?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-3 pt-2 text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        Patton Orr
      </div>
      <nav className="flex flex-col gap-4">
        {NAV.map((entry) =>
          "items" in entry ? (
            <div key={entry.label} className="flex flex-col gap-1">
              <span className="px-3 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {entry.label}
              </span>
              {entry.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <NavLink key={entry.href} item={entry} pathname={pathname} onNavigate={onNavigate} />
          ),
        )}
      </nav>
      <form
        className="mt-auto flex flex-col gap-3 border-t border-black/[.08] pt-4 dark:border-white/[.145]"
        action={signOutAction}
      >
        {email ? (
          <span className="truncate px-3 text-xs text-zinc-500">{email}</span>
        ) : null}
        <button
          type="submit"
          className="rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors pointer-coarse:py-3 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function DashboardNav({ email }: { email?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // While open: Escape closes, and lock body scroll behind the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar (phones only) */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/[.08] bg-white/90 px-4 py-2.5 backdrop-blur md:hidden dark:border-white/[.145] dark:bg-black/90">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-ml-1 rounded-lg p-2 text-zinc-700 hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          Patton Orr
        </span>
      </div>

      {/* Persistent sidebar (tablet + desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-black/[.08] bg-zinc-50 md:block dark:border-white/[.145] dark:bg-black">
        <SidebarContent pathname={pathname} email={email} />
      </aside>

      {/* Mobile drawer */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r border-black/[.08] bg-white shadow-xl transition-transform duration-200 ease-out md:hidden dark:border-white/[.145] dark:bg-black ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent pathname={pathname} email={email} onNavigate={close} />
      </aside>
    </>
  );
}
