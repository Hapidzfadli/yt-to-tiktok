"use client";

import { useTranslations } from "next-intl";

const STEP_KEYS = ["url", "preview", "options", "progress", "publish"] as const;

interface Props {
  current: number;
}

export function Stepper({ current }: Props) {
  const t = useTranslations("converter.steps");

  return (
    <ol className="flex items-center gap-2 w-full">
      {STEP_KEYS.map((key, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={key} className="flex items-center gap-2 flex-1">
            <div
              className={[
                "flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold shrink-0",
                done && "bg-brand text-white",
                active && "bg-brand text-white ring-4 ring-brand/30",
                !done && !active && "bg-neutral-800 text-neutral-400",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {done ? "✓" : n}
            </div>
            <span
              className={`text-sm ${
                active ? "text-white font-medium" : "text-neutral-400"
              }`}
            >
              {t(key)}
            </span>
            {i < STEP_KEYS.length - 1 && (
              <div className="flex-1 h-px bg-neutral-800 ml-2" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
