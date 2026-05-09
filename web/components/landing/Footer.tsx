import { useTranslations } from "next-intl";

import { Logo } from "./Logo";

function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 px-4 py-14">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
              {t("tagline")}
            </p>
            <a
              href="https://github.com/Hapidzfadli/yt-to-tiktok"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-700 hover:text-neutral-100 transition"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              {t("columns.product")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-400">
              <li>
                <a href="#convert" className="hover:text-neutral-100 transition">
                  {t("links.converter")}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-neutral-100 transition">
                  {t("links.features")}
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-neutral-100 transition"
                >
                  {t("links.howItWorks")}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-neutral-100 transition">
                  {t("links.faq")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              {t("columns.resources")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-400">
              <li>
                <a
                  href="https://github.com/Hapidzfadli/yt-to-tiktok"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-neutral-100 transition"
                >
                  {t("links.github")}
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-neutral-100 transition"
                >
                  {t("links.apiDocs")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-neutral-900 pt-6 text-center text-xs text-neutral-500">
          {t("copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
