"use client";

import { useState, useTransition } from "react";
import { GRANTABLE_SECTIONS, type SectionKey } from "@/lib/access-config";
import {
  addGuestAction,
  removeGuestAction,
  setGuestSectionsAction,
} from "./actions";

type Guest = { email: string; sections: string[] };

export function AccessManager({ initialGuests }: { initialGuests: Guest[] }) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [email, setEmail] = useState("");
  const [, start] = useTransition();

  function add() {
    const e = email.trim().toLowerCase();
    if (!/.+@.+\..+/.test(e) || guests.some((g) => g.email === e)) {
      setEmail("");
      return;
    }
    setGuests((g) => [...g, { email: e, sections: [] }]);
    setEmail("");
    start(() => {
      void addGuestAction(e);
    });
  }

  function toggle(guestEmail: string, key: SectionKey) {
    const g = guests.find((x) => x.email === guestEmail);
    if (!g) return;
    const sections = g.sections.includes(key)
      ? g.sections.filter((s) => s !== key)
      : [...g.sections, key];
    setGuests((gs) =>
      gs.map((x) => (x.email === guestEmail ? { ...x, sections } : x)),
    );
    start(() => {
      void setGuestSectionsAction(guestEmail, sections as SectionKey[]);
    });
  }

  function remove(guestEmail: string) {
    setGuests((gs) => gs.filter((g) => g.email !== guestEmail));
    start(() => {
      void removeGuestAction(guestEmail);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="guest@gmail.com"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none transition-colors focus:border-black/[.35] dark:border-white/[.18] dark:bg-black dark:text-zinc-50 dark:focus:border-white/[.4]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Add
        </button>
      </form>

      {guests.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No guests yet. Add a Gmail address to let that person sign in.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {guests.map((g) => (
            <li
              key={g.email}
              className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                  {g.email}
                </span>
                <button
                  type="button"
                  onClick={() => remove(g.email)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GRANTABLE_SECTIONS.map((s) => {
                  const on = g.sections.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggle(g.email, s.key)}
                      aria-pressed={on}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        on
                          ? "bg-emerald-500 text-white"
                          : "bg-black/[.05] text-zinc-600 hover:bg-black/[.09] dark:bg-white/[.08] dark:text-zinc-300 dark:hover:bg-white/[.14]"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-400">
                Home is always available. Tap a section to grant or revoke it.
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
