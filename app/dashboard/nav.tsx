"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "./actions";

// FT-style navigation: a sticky top bar of the top-level sections, a sub-nav row
// beneath it for the active section's children, and a hamburger drawer that
// holds the full hierarchy (which may grow long). Data-driven from NAV.
type Leaf = { label: string; href: string; section: string };
type Group = { label: string; href: string; section: string; items: Leaf[] };
type Entry = Leaf | Group;

const NAV: Entry[] = [
  { label: "Home", href: "/dashboard", section: "home" },
  {
    label: "Health",
    href: "/dashboard/health",
    section: "health",
    items: [
      { label: "WHOOP", href: "/dashboard/whoop-revised", section: "health" },
    ],
  },
  {
    label: "Faith",
    href: "/dashboard/faith",
    section: "faith",
    items: [
      { label: "Bible", href: "/bible", section: "faith" },
      { label: "Reading plan", href: "/dashboard/bible/plan", section: "faith" },
      { label: "Saved", href: "/dashboard/bible/saved", section: "faith" },
    ],
  },
  { label: "School", href: "/dashboard/school", section: "school" },
  { label: "Work", href: "/dashboard/work", section: "work" },
  { label: "Personal", href: "/dashboard/personal", section: "personal" },
  { label: "Notes", href: "/dashboard/notes", section: "notes" },
  { label: "Ideas", href: "/dashboard/ideas", section: "ideas" },
  { label: "Settings", href: "/dashboard/settings", section: "settings" },
];

const isGroup = (e: Entry): e is Group => "items" in e;

function matches(pathname: string, href: string): boolean {
  // Home matches only exactly; everything else matches itself + subpaths.
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

// The most-specific leaf/href the current path maps to (for highlighting).
function activeHref(pathname: string, nav: Entry[]): string | null {
  let best: string | null = null;
  for (const e of nav) {
    const hrefs = isGroup(e) ? [e.href, ...e.items.map((i) => i.href)] : [e.href];
    for (const h of hrefs) {
      if (matches(pathname, h) && (!best || h.length > best.length)) best = h;
    }
  }
  return best;
}

// The top-level section that owns the current path (it or one of its children).
function activeTop(pathname: string, nav: Entry[]): Entry | null {
  let best: Entry | null = null;
  let bestLen = -1;
  for (const e of nav) {
    const hrefs = isGroup(e) ? [e.href, ...e.items.map((i) => i.href)] : [e.href];
    for (const h of hrefs) {
      if (matches(pathname, h) && h.length > bestLen) {
        best = e;
        bestLen = h.length;
      }
    }
  }
  return best;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={`transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function DashboardNav({
  email,
  sections,
  barHidden = [],
}: {
  email?: string;
  sections: string[];
  barHidden?: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Submenus start collapsed in the drawer; the user expands what they want.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(NAV.filter(isGroup).map((g) => g.label)),
  );

  // Sections this user may see. Settings is open to every signed-in user (it
  // holds their personal prefs — theme, weather, highlighting); the admin-only
  // panes inside it are gated on their own pages. Everything else is gated by
  // the granted section list.
  const visible = NAV.filter(
    (e) => e.section === "settings" || sections.includes(e.section),
  );
  // Settings drops to the bottom of the drawer, apart from the rest.
  const mainEntries = visible.filter((e) => e.section !== "settings");
  const settingsEntry = visible.find((e) => e.section === "settings");
  // The horizontal top bar can hide sections (they stay in the drawer).
  const barVisible = visible.filter((e) => !barHidden.includes(e.section));
  const active = activeHref(pathname, visible);
  const top = activeTop(pathname, visible);
  const subItems = top && isGroup(top) ? top.items : [];

  const toggleGroup = (label: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(label)) n.delete(label);
      else n.add(label);
      return n;
    });

  // While the drawer is open: Escape closes, and body scroll is locked.
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
      <header className="sticky top-0 z-30 border-b border-[var(--header-border)] bg-white/90 backdrop-blur dark:bg-black/90">
        <div className="flex items-start gap-2 px-3 sm:gap-3 sm:px-5">
          {/* Left: menu + brand, aligned to the top-level row */}
          <div className="flex shrink-0 items-center gap-2 py-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="-ml-1 rounded-lg p-2 text-zinc-700 transition-colors hover:bg-black/[.05] dark:text-zinc-300 dark:hover:bg-white/[.08]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              href="/dashboard"
              className="text-base font-semibold tracking-tight text-black transition-opacity hover:opacity-70 dark:text-zinc-50"
            >
              Patton Orr
            </Link>
            <span className="ml-0.5 h-5 w-px bg-black/10 dark:bg-white/15" aria-hidden />
          </div>

          {/* Right column: top-level row + sub-nav, both left-aligned together */}
          <div className="flex min-w-0 flex-1 flex-col">
            <nav className="flex items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {barVisible.map((e) => {
                const on = top?.label === e.label;
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={on ? "page" : undefined}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      on
                        ? "bg-[var(--nav-pill-bg)] text-[var(--nav-pill-fg)]"
                        : "text-zinc-500 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
                    }`}
                  >
                    {e.label}
                  </Link>
                );
              })}
            </nav>
            {subItems.length > 0 && (
              <div className="flex items-center gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {subItems.map((it) => {
                  const on = active === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      aria-current={on ? "page" : undefined}
                      className={`shrink-0 border-b-2 px-0.5 pb-1 text-[13px] whitespace-nowrap transition-colors ${
                        on
                          ? "border-[var(--subnav-border)] font-medium text-[var(--subnav-fg)]"
                          : "border-transparent text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                      }`}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Full-hierarchy drawer */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] border-r border-black/[.08] bg-white shadow-xl transition-transform duration-200 ease-out dark:border-white/[.145] dark:bg-black ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center justify-between px-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50"
            >
              Patton Orr
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              ✕
            </button>
          </div>
          <div className="px-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Top sections
          </div>
          <nav className="flex flex-col gap-0.5">
            {mainEntries.map((entry) =>
              isGroup(entry) ? (
                <div key={entry.label} className="flex flex-col">
                  <div className="flex items-center gap-0.5">
                    <Link
                      href={entry.href}
                      onClick={() => setOpen(false)}
                      aria-current={entry.href === active ? "page" : undefined}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
                        entry.href === active
                          ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
                          : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
                      }`}
                    >
                      {entry.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleGroup(entry.label)}
                      aria-expanded={!collapsed.has(entry.label)}
                      aria-label={`${collapsed.has(entry.label) ? "Expand" : "Collapse"} ${entry.label}`}
                      className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-black/[.04] hover:text-zinc-700 dark:hover:bg-white/[.06] dark:hover:text-zinc-200"
                    >
                      <Chevron open={!collapsed.has(entry.label)} />
                    </button>
                  </div>
                  {!collapsed.has(entry.label) && (
                    <div className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-black/[.07] pl-2 dark:border-white/[.1]">
                      {entry.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={item.href === active ? "page" : undefined}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
                            item.href === active
                              ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
                              : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
                          }`}
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
                  onClick={() => setOpen(false)}
                  aria-current={entry.href === active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
                    entry.href === active
                      ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
                  }`}
                >
                  {entry.label}
                </Link>
              ),
            )}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            {settingsEntry && (
              <div className="border-t border-black/[.06] pt-2 dark:border-white/[.08]">
                <Link
                  href={settingsEntry.href}
                  onClick={() => setOpen(false)}
                  aria-current={settingsEntry.href === active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors pointer-coarse:py-3 ${
                    settingsEntry.href === active
                      ? "bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
                  }`}
                >
                  {settingsEntry.label}
                </Link>
              </div>
            )}
            <form
              className="flex flex-col gap-3 border-t border-black/[.08] pt-4 dark:border-white/[.145]"
              action={signOutAction}
            >
              {email ? (
                <span className="truncate px-3 text-xs text-zinc-500">
                  {email}
                </span>
              ) : null}
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors pointer-coarse:py-3 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
