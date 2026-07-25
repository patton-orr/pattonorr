"use client";

import { useState, useTransition } from "react";
import { NAV_SECTIONS, applyNavOrder } from "@/lib/access-config";
import { ReorderList, type ReorderItem } from "./reorder-list";
import {
  setMenuOrderAction,
  setTopbarHiddenAction,
  setTopbarOrderAction,
} from "./actions";

// The full menu and the top bar are ordered independently. Settings is pinned
// to the bottom of the drawer by the nav itself, so it isn't in the menu list.
const MENU_SECTIONS = NAV_SECTIONS.filter((s) => s.key !== "settings");

const toItems = (
  secs: readonly { key: string; label: string }[],
  order: string[],
): ReorderItem[] =>
  applyNavOrder(
    secs.map((s) => ({ ...s, section: s.key })),
    order,
  ).map(({ key, label }) => ({ key, label }));

export function NavigationSettings({
  initialHidden,
  initialMenuOrder,
  initialTopbarOrder,
}: {
  initialHidden: string[];
  initialMenuOrder: string[];
  initialTopbarOrder: string[];
}) {
  const [hidden, setHidden] = useState<string[]>(initialHidden);
  const [menu, setMenu] = useState<ReorderItem[]>(
    toItems(MENU_SECTIONS, initialMenuOrder),
  );
  const [bar, setBar] = useState<ReorderItem[]>(
    toItems(NAV_SECTIONS, initialTopbarOrder),
  );
  const [, start] = useTransition();

  const reorder = (items: ReorderItem[], keys: string[]) =>
    keys
      .map((k) => items.find((i) => i.key === k))
      .filter(Boolean) as ReorderItem[];

  function toggleHidden(key: string) {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...new Set([...hidden, key])];
    setHidden(next);
    start(() => {
      void setTopbarHiddenAction(next);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">
            Full menu order
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500">
            The order sections appear in the hamburger menu. Drag the handle, or
            focus it and use the arrow keys. Settings stays pinned to the bottom.
          </p>
        </div>
        <ReorderList
          items={menu}
          onChange={(keys) => setMenu((cur) => reorder(cur, keys))}
          onCommit={(keys) =>
            start(() => {
              void setMenuOrderAction(keys);
            })
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">
            Top bar order and visibility
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500">
            Ordered separately from the full menu. Switch a section off to keep
            it out of the horizontal bar — it stays in the hamburger menu.
          </p>
        </div>
        <ReorderList
          items={bar}
          onChange={(keys) => setBar((cur) => reorder(cur, keys))}
          onCommit={(keys) =>
            start(() => {
              void setTopbarOrderAction(keys);
            })
          }
          renderRight={(key) => {
            const on = !hidden.includes(key);
            const label = bar.find((b) => b.key === key)?.label ?? key;
            return (
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`Show ${label} on the top bar`}
                onClick={() => toggleHidden(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    on ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            );
          }}
        />
      </section>
    </div>
  );
}
