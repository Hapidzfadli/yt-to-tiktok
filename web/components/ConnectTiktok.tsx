"use client";

import { useEffect, useState } from "react";

import { listTiktokAccounts, tiktokLoginUrl } from "@/lib/api";
import type { TiktokAccount } from "@/lib/types";

interface Props {
  selected: string | null;
  onSelect: (openId: string | null) => void;
}

export function ConnectTiktok({ selected, onSelect }: Props) {
  const [accounts, setAccounts] = useState<TiktokAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await listTiktokAccounts();
      setAccounts(data);
      if (!selected && data.length > 0) onSelect(data[0].open_id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok") === "connected") {
      const openId = params.get("open_id");
      if (openId) onSelect(openId);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(refresh, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="text-sm text-neutral-400">Memuat akun...</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
        {error}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <a
        href={tiktokLoginUrl()}
        className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2"
      >
        Hubungkan akun TikTok
      </a>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-400">Posting sebagai</p>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.open_id}
            onClick={() => onSelect(a.open_id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              selected === a.open_id
                ? "border-brand bg-brand/10"
                : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
            }`}
          >
            {a.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.avatar_url}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            )}
            <span>{a.display_name ?? a.open_id.slice(0, 8)}</span>
          </button>
        ))}
        <a
          href={tiktokLoginUrl()}
          className="rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
        >
          + Tambah akun
        </a>
      </div>
    </div>
  );
}
