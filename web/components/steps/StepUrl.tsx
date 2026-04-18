"use client";

import { useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export function StepUrl({ onSubmit, loading, error }: Props) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim());
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-sm text-neutral-300">URL video YouTube</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
          className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </label>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 transition"
      >
        {loading ? "Mengambil metadata..." : "Lanjutkan"}
      </button>
    </form>
  );
}
