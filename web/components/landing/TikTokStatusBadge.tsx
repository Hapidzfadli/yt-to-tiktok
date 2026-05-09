"use client";

import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { listTiktokAccounts, tiktokLoginUrl } from "@/lib/api";
import type { TiktokAccount } from "@/lib/types";

export function TikTokStatusBadge() {
  const t = useTranslations("navbar.tiktokStatus");
  const [account, setAccount] = useState<TiktokAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTiktokAccounts()
      .then((list) => setAccount(list[0] ?? null))
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-32 animate-pulse rounded-lg bg-neutral-800" />
    );
  }

  if (!account) {
    return (
      <a
        href={tiktokLoginUrl()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-semibold px-3 py-1.5 transition shadow-sm shadow-brand/20"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="currentColor"
          aria-hidden
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
        </svg>
        {t("connect")}
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5">
      {account.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.avatar_url}
          alt=""
          className="h-5 w-5 rounded-full object-cover"
        />
      ) : (
        <div className="h-5 w-5 rounded-full bg-brand/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-brand" aria-hidden>
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z" />
          </svg>
        </div>
      )}
      <span className="max-w-[96px] truncate text-xs font-medium text-neutral-200">
        {account.display_name ?? account.open_id.slice(0, 8)}
      </span>
      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-brand" />
    </div>
  );
}
