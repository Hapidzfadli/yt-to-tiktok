"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const KEYS = [
  "legal",
  "format",
  "quality",
  "duration",
  "tiktokAccount",
  "cost",
] as const;

export function Faq() {
  const t = useTranslations("faq");
  const [openKey, setOpenKey] = useState<string | null>(KEYS[0]);

  return (
    <section
      id="faq"
      className="relative border-t border-neutral-900 bg-neutral-950/40 px-4 py-20 md:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-neutral-400">{t("subtitle")}</p>
        </div>

        <div className="mt-12 divide-y divide-neutral-900 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40">
          {KEYS.map((key) => {
            const open = openKey === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-neutral-900/60"
                  aria-expanded={open}
                >
                  <span className="text-sm font-medium text-neutral-100 md:text-base">
                    {t(`items.${key}.question`)}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
                      open ? "rotate-180 text-brand" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-neutral-400">
                        {t(`items.${key}.answer`)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
