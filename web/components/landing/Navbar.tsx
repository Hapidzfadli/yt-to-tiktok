"use client";

import { useTranslations } from "next-intl";

import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";
import { TikTokStatusBadge } from "./TikTokStatusBadge";

export function Navbar() {
  const t = useTranslations("navbar");

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <a href="#top" className="shrink-0">
          <Logo />
        </a>

        <nav className="hidden items-center gap-6 text-sm text-neutral-400 md:flex">
          <a href="#features" className="hover:text-neutral-100 transition">
            {t("linkFeatures")}
          </a>
          <a href="#how-it-works" className="hover:text-neutral-100 transition">
            {t("linkHowItWorks")}
          </a>
          <a href="#faq" className="hover:text-neutral-100 transition">
            {t("linkFaq")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <TikTokStatusBadge />
        </div>
      </div>
    </header>
  );
}
