"use client";

import { motion } from "framer-motion";
import { ClipboardPaste, Send, Sliders } from "lucide-react";
import { useTranslations } from "next-intl";

const STEPS = [
  { key: "paste", icon: ClipboardPaste },
  { key: "adjust", icon: Sliders },
  { key: "publish", icon: Send },
] as const;

export function HowItWorks() {
  const t = useTranslations("howItWorks");

  return (
    <section
      id="how-it-works"
      className="relative border-t border-neutral-900 bg-neutral-950/40 px-4 py-20 md:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-neutral-400">{t("subtitle")}</p>
        </div>

        <div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent md:block"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 bg-neutral-950 text-brand ring-4 ring-neutral-950">
                  <Icon className="h-6 w-6" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-neutral-50">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">
                  {t(`steps.${step.key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
