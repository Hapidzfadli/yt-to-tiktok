"use client";

import { formatDuration, formatViews } from "@/lib/format";
import type { VideoInfo } from "@/lib/types";

interface Props {
  info: VideoInfo;
  onBack: () => void;
  onNext: () => void;
}

export function StepPreview({ info, onBack, onNext }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        {info.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.thumbnail}
            alt={info.title}
            className="w-48 rounded-lg border border-neutral-800 object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold line-clamp-2">{info.title}</h3>
          <p className="text-sm text-neutral-400 mt-1">{info.uploader ?? "—"}</p>
          <div className="flex gap-3 mt-3 text-xs text-neutral-400">
            <span className="bg-neutral-800 px-2 py-1 rounded">
              {formatDuration(info.duration)}
            </span>
            <span className="bg-neutral-800 px-2 py-1 rounded">
              {formatViews(info.view_count)} views
            </span>
          </div>
        </div>
      </div>

      {info.description && (
        <p className="text-sm text-neutral-400 line-clamp-3 border-t border-neutral-800 pt-4">
          {info.description}
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
          onClick={onNext}
          className="flex-1 rounded-lg bg-brand hover:bg-brand-dark text-white font-medium py-2.5 transition"
        >
          Atur konversi
        </button>
      </div>
    </div>
  );
}
