"use client";

import { motion } from "framer-motion";
import { GraduationCap, TrendingUp, Video } from "lucide-react";
import { useTranslations } from "next-intl";

const ITEMS = [
  { key: "creator", icon: Video },
  { key: "marketer", icon: TrendingUp },
  { key: "educator", icon: GraduationCap },
] as const;

export function UseCases() {
  const t = useTranslations("useCases");

  return (
    <section
      id="use-cases"
      className="relative border-t border-neutral-900 px-4 py-20 md:py-28 scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-50 md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-neutral-400">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/60 to-neutral-900/20 p-7 transition hover:border-brand/40"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-neutral-50">
                  {t(`items.${item.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {t(`items.${item.key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
