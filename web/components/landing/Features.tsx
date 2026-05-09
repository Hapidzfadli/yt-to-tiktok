"use client";

import { motion } from "framer-motion";
import { Crop, Scissors, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const ICONS = {
  aspect: Crop,
  trim: Scissors,
  publish: Send,
  watermark: Sparkles,
} as const;

const ITEMS = ["aspect", "trim", "publish", "watermark"] as const;

export function Features() {
  const t = useTranslations("features");

  return (
    <section
      id="features"
      className="relative border-t border-neutral-900 px-4 py-20 md:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-neutral-400">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((key, i) => {
            const Icon = ICONS[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 transition hover:border-brand/40 hover:bg-neutral-900/70"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/20">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-50">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {t(`items.${key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
