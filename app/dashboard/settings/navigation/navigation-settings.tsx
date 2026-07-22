"use client";

import { useState } from "react";
import { NAV_SECTIONS } from "@/lib/access-config";
import { ToggleSetting } from "../toggle-setting";
import { setTopbarHiddenAction } from "./actions";

export function NavigationSettings({
  initialHidden,
}: {
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<string[]>(initialHidden);

  return (
    <div className="flex flex-col gap-3">
      {NAV_SECTIONS.map((s) => (
        <ToggleSetting
          key={s.key}
          label={s.label}
          description={`Show "${s.label}" on the horizontal top bar.`}
          initial={!hidden.includes(s.key)}
          onSave={async (on) => {
            const next = on
              ? hidden.filter((k) => k !== s.key)
              : [...new Set([...hidden, s.key])];
            setHidden(next);
            await setTopbarHiddenAction(next);
          }}
        />
      ))}
    </div>
  );
}
