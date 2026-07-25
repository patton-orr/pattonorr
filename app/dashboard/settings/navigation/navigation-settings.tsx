"use client";

import { useState, useTransition } from "react";
import {
  NAV_SECTIONS,
  expandNavOrder,
  isDividerKey,
  newDividerKey,
} from "@/lib/access-config";
import { ReorderList, type ReorderItem } from "./reorder-list";
import {
  setMenuOrderAction,
  setTopbarHiddenAction,
  setTopbarOrderAction,
} from "./actions";

// The full menu and the top bar are ordered independently. Settings is pinned
// by the nav itself — bottom of the drawer, and a gear at the far right of the
// top bar — so it isn't orderable in either list.
const ORDERABLE = NAV_SECTIONS.filter((s) => s.key !== "settings");

function toItems(
  secs: readonly { key: string; label: string }[],
  order: string[],
): ReorderItem[] {
  return expandNavOrder(
    secs.map((s) => ({ ...s, section: s.key })),
    order,
  ).map((slot) =>
    slot.type === "divider"
      ? { key: slot.key, label: "Divider", variant: "divider" as const }
      : { key: slot.entry.key, label: slot.entry.label },
  );
}

function AddDividerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 rounded-full border border-black/[.1] px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors pointer-coarse:py-2.5 hover:bg-black/[.04] hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50"
    >
      <span aria-hidden>+</span> Add divider
    </button>
  );
}

function RemoveDividerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove divider"
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-black/[.04] hover:text-red-600 dark:hover:bg-white/[.06] dark:hover:text-red-400"
    >
      Remove
    </button>
  );
}

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
    toItems(ORDERABLE, initialMenuOrder),
  );
  const [bar, setBar] = useState<ReorderItem[]>(
    toItems(ORDERABLE, initialTopbarOrder),
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

  // Each list owns its own dividers, so adding one to the menu doesn't touch
  // the bar. New dividers land at the end, ready to be dragged into place.
  function addDivider(
    items: ReorderItem[],
    setItems: (v: ReorderItem[]) => void,
    save: (keys: string[]) => Promise<void>,
  ) {
    const next: ReorderItem[] = [
      ...items,
      { key: newDividerKey(), label: "Divider", variant: "divider" },
    ];
    setItems(next);
    start(() => {
      void save(next.map((i) => i.key));
    });
  }

  function removeDivider(
    key: string,
    items: ReorderItem[],
    setItems: (v: ReorderItem[]) => void,
    save: (keys: string[]) => Promise<void>,
  ) {
    const next = items.filter((i) => i.key !== key);
    setItems(next);
    start(() => {
      void save(next.map((i) => i.key));
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
            focus it and use the arrow keys. Dividers draw a line between
            groups. Settings stays pinned to the bottom.
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
          renderRight={(key) =>
            isDividerKey(key) ? (
              <RemoveDividerButton
                onClick={() =>
                  removeDivider(key, menu, setMenu, setMenuOrderAction)
                }
              />
            ) : null
          }
        />
        <AddDividerButton
          onClick={() => addDivider(menu, setMenu, setMenuOrderAction)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">
            Top bar order and visibility
          </h3>
          <p className="text-xs leading-relaxed text-zinc-500">
            Ordered separately from the full menu, with its own dividers. Switch
            a section off to keep it out of the horizontal bar — it stays in the
            hamburger menu. Settings is always a gear at the far right.
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
            if (isDividerKey(key)) {
              return (
                <RemoveDividerButton
                  onClick={() =>
                    removeDivider(key, bar, setBar, setTopbarOrderAction)
                  }
                />
              );
            }
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
        <AddDividerButton
          onClick={() => addDivider(bar, setBar, setTopbarOrderAction)}
        />
      </section>
    </div>
  );
}
