"use client";

import { useState } from "react";

import { formatDuration } from "@/lib/format";
import type { Aspect, ConvertOptions, VideoInfo } from "@/lib/types";

interface Props {
  info: VideoInfo;
  onBack: () => void;
  onSubmit: (opts: ConvertOptions) => void;
  submitting: boolean;
  error: string | null;
}

const ASPECTS: { value: Aspect; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16", hint: "TikTok / Reels / Shorts" },
  { value: "1:1", label: "1:1", hint: "Square" },
  { value: "16:9", label: "16:9", hint: "Landscape" },
];

export function StepOptions({
  info,
  onBack,
  onSubmit,
  submitting,
  error,
}: Props) {
  const maxEnd = info.duration ?? 0;
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(60, maxEnd || 60));
  const [addCaption, setAddCaption] = useState(false);

  const submit = () => {
    onSubmit({
      aspect,
      start: start > 0 ? start : undefined,
      end: end > 0 && end > start ? end : undefined,
      add_caption: addCaption,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Aspect ratio</p>
        <div className="grid grid-cols-3 gap-2">
          {ASPECTS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAspect(a.value)}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                aspect === a.value
                  ? "border-brand bg-brand/10"
                  : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
              }`}
            >
              <div className="font-semibold">{a.label}</div>
              <div className="text-xs text-neutral-400">{a.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">
          Trim{" "}
          <span className="text-neutral-500 font-normal">
            (durasi total {formatDuration(info.duration)})
          </span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-neutral-400">
            Start (detik)
            <input
              type="number"
              min={0}
              max={maxEnd || undefined}
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-brand"
            />
          </label>
          <label className="text-xs text-neutral-400">
            End (detik)
            <input
              type="number"
              min={0}
              max={maxEnd || undefined}
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
              className="mt-1 w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-brand"
            />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={addCaption}
          onChange={(e) => setAddCaption(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-brand"
        />
        Tambahkan caption otomatis (coming soon)
      </label>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="rounded-lg bg-neutral-800 hover:bg-neutral-700 px-4 py-2.5 text-sm font-medium"
        >
          Kembali
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-medium py-2.5 transition"
        >
          {submitting ? "Memulai job..." : "Mulai konversi"}
        </button>
      </div>
    </div>
  );
}
