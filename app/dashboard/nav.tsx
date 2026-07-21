"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "./actions";

// Data-driven nav: leaves and area groups. Each group header links to its own
// landing page and can collapse/expand; sub-items are indented beneath it.
type Leaf = { label: string; href: string };
type Group = { label: string; href: string; items: Leaf[] };
type Entry = Leaf | Group;

const NAV: Entry[] = [
  { label: "Home", href: "/dashboard" },
  {
    label: "Health",
    href: "/dashboard/health",
    items: [{ label: "WHOOP", href: "/dashboard/whoop" }],
  },
  {
    label: "Faith",
    href: "/dashboard/faith",
    items: [
      { label: "Bible", href: "/bible" },
      { label: "Reading plan", href: "/dashboard/bible/plan" },
      { label: "Saved", href: "/dashboard/bible/saved" },
    ],
  },
  { label: "Notes", href: "/dashboard/notes" },
  { label: "Ideas", href: "/dashboard/ideas" },
  { label: "Settings", href: "/dashboard/settings" },
];

const isGroup = (e: Entry): e is Group => "items" in e;

// Every href (group landings + leaves); most-specific match wins so a parent
// doesn't co-highlight with its child.
const HREFS = NAV.flatMap((e) =>
  isGroup(e) ? [e.href, ...e.items.map((i) => i.href)] : [e.href],
);

function activeHref(pathname: string): string | null {
  if (HREFS.includes(pathname)) return pathname;
  let best: string | null = null;
  for (const h of HREFS) {
    if (h === "/dashboard") continue; // home matches only exactly
    if (pathname.startsWith(h + "/") && (!best || h.length > best.length)) best = h;
  }
  return best;
}

function itemClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
    active
      ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
      : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
  }`;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SidebarContent({
  pathname,
  email,
  onNavigate,
  collapsed,
  onToggle,
}: {
  pathname: string;
  email?: string;
  onNavigate?: () => void;
  collapsed: Set<string>;
  onToggle: (label: string) => void;
}) {
  const active = activeHref(pathname);
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-3 pt-2 text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        Patton Orr
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((entry) =>
          isGroup(entry) ? (
            <div key={entry.label} className="flex flex-col">
              <div className="flex items-center gap-0.5">
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  aria-current={entry.href === active ? "page" : undefined}
                  className={`flex-1 ${itemClass(entry.href === active)}`}
                >
                  {entry.label}
                </Link>
                <button
                  type="button"
                  onClick={() => onToggle(entry.label)}
                  aria-expanded={!collapsed.has(entry.label)}
                  aria-label={`${collapsed.has(entry.label) ? "Expand" : "Collapse"} ${entry.label}`}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-black/[.04] hover:text-zinc-700 dark:hover:bg-white/[.06] dark:hover:text-zinc-200"
                >
                  <Chevron open={!collapsed.has(entry.label)} />
                </button>
              </div>
              {!collapsed.has(entry.label) && (
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-black/[.07] pl-2 dark:border-white/[.1]">
                  {entry.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={item.href === active ? "page" : undefined}
                      className={itemClass(item.href === active)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onNavigate}
              aria-current={entry.href === active ? "page" : undefined}
              className={itemClass(entry.href === active)}
            >
              {entry.label}
            </Link>
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const close = () => setOpen(false);
  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

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

  const content = (onNavigate?: () => void) => (
    <SidebarContent
      pathname={pathname}
      email={email}
      onNavigate={onNavigate}
      collapsed={collapsed}
      onToggle={toggleGroup}
    />
  );

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
        {content()}
      </aside>

      {/* Mobile drawer */}
      <div
        aria-hidden
        onClick={close}
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
        {content(close)}
      </aside>
    </>
  );
}
