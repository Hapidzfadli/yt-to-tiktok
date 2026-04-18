"use client";

import { useEffect, useState } from "react";

import { subscribeJob } from "@/lib/api";
import type { JobStatus, ProgressEvent } from "@/lib/types";

interface Props {
  jobId: string;
  onRestart: () => void;
}

const LABELS: Record<JobStatus, string> = {
  pending: "Menunggu worker...",
  downloading: "Mengunduh video dari YouTube...",
  converting: "Mengonversi (trim + reframe)...",
  uploading: "Mengunggah hasil...",
  completed: "Selesai!",
  failed: "Gagal memproses",
};

export function StepProgress({ jobId, onRestart }: Props) {
  const [event, setEvent] = useState<ProgressEvent | null>(null);
  const [transportError, setTransportError] = useState(false);

  useEffect(() => {
    const unsub = subscribeJob(jobId, {
      onProgress: (e) => {
        setEvent(e);
        setTransportError(false);
      },
      onError: () => setTransportError(true),
    });
    return unsub;
  }, [jobId]);

  const status: JobStatus = event?.status ?? "pending";
  const progress = event?.progress ?? 0;
  const done = status === "completed";
  const failed = status === "failed";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-300">{LABELS[status]}</span>
          <span className="text-neutral-400 tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              failed ? "bg-red-500" : "bg-brand"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-neutral-500">Job ID: {jobId}</p>
      </div>

      {failed && event?.error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 break-words">
          {event.error}
        </div>
      )}

      {transportError && !done && !failed && (
        <p className="text-xs text-yellow-400">
          Koneksi SSE terputus, mencoba menyambung ulang...
        </p>
      )}

      {done && event?.output_url && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
          <p className="text-sm text-emerald-400 font-medium">
            Video siap! Unduh atau lanjutkan ke TikTok (Phase 2).
          </p>
          <a
            href={event.output_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2"
          >
            Buka hasil
          </a>
        </div>
      )}

      {(done || failed) && (
        <button
          onClick={onRestart}
          className="w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 py-2.5 text-sm font-medium"
        >
          Konversi video lain
        </button>
      )}
    </div>
  );
}
