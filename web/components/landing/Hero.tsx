"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();

  const float = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { y: [0, -8, 0] },
          transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-hero-glow border-b border-neutral-900"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-grid-pattern bg-grid opacity-40"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-neutral-950"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:gap-8 md:px-6 md:py-28">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-4xl font-bold leading-tight tracking-tight text-neutral-50 md:text-5xl lg:text-6xl"
          >
            {t("headline")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            {t("subheadline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <a
              href="#convert"
              className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-3 shadow-lg shadow-brand/20 transition"
            >
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 text-neutral-200 text-sm font-medium px-5 py-3 transition"
            >
              {t("ctaSecondary")}
            </a>
          </motion.div>
        </div>

        <div className="relative hidden md:block">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              {...float(0)}
              className="absolute -translate-x-32 -translate-y-12 rotate-[-6deg] rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur shadow-2xl shadow-black/40"
            >
              <div className="flex aspect-[9/16] w-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="rounded-md bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  9:16
                </div>
                <p className="text-xs text-neutral-300">
                  {t("mockup.vertical")}
                </p>
              </div>
            </motion.div>

            <motion.div
              {...float(1.2)}
              className="absolute translate-x-8 -translate-y-4 rotate-[3deg] rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur shadow-2xl shadow-black/40"
            >
              <div className="flex aspect-square w-44 flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                  1:1
                </div>
                <p className="text-xs text-neutral-300">{t("mockup.square")}</p>
              </div>
            </motion.div>

            <motion.div
              {...float(2.4)}
              className="absolute translate-x-32 translate-y-32 rotate-[-2deg] rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur shadow-2xl shadow-black/40"
            >
              <div className="flex aspect-video w-52 flex-col items-center justify-center gap-2 px-4 text-center">
                <div className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                  16:9
                </div>
                <p className="text-xs text-neutral-300">
                  {t("mockup.landscape")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
