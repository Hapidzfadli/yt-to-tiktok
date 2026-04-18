"use client";

import { useEffect, useState } from "react";

import { ConnectTiktok } from "@/components/ConnectTiktok";
import { publishToTiktok, subscribePublishJob } from "@/lib/api";
import type {
  PrivacyLevel,
  PublishProgressEvent,
  PublishStatus,
} from "@/lib/types";

interface Props {
  convertJobId: string;
  defaultCaption: string;
  onRestart: () => void;
}

const LABELS: Record<PublishStatus, string> = {
  pending: "Menunggu...",
  uploading: "Mengunggah ke TikTok...",
  processing: "TikTok sedang memproses...",
  published: "Terpublikasi!",
  failed: "Gagal publikasi",
};

const PRIVACIES: { value: PrivacyLevel; label: string }[] = [
  { value: "SELF_ONLY", label: "Private (hanya saya)" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Mutual friends" },
  { value: "PUBLIC_TO_EVERYONE", label: "Publik" },
];

export function StepPublish({ convertJobId, defaultCaption, onRestart }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [caption, setCaption] = useState(defaultCaption);
  const [privacy, setPrivacy] = useState<PrivacyLevel>("SELF_ONLY");

  const [publishJobId, setPublishJobId] = useState<string | null>(null);
  const [event, setEvent] = useState<PublishProgressEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishJobId) return;
    const unsub = subscribePublishJob(publishJobId, {
      onProgress: setEvent,
    });
    return unsub;
  }, [publishJobId]);

  const submit = async () => {
    if (!openId) {
      setError("Pilih akun TikTok terlebih dahulu");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { publish_job_id } = await publishToTiktok({
        convert_job_id: convertJobId,
        open_id: openId,
        caption,
        privacy,
      });
      setPublishJobId(publish_job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai publikasi");
    } finally {
      setSubmitting(false);
    }
  };

  const status: PublishStatus = event?.status ?? "pending";
  const progress = event?.progress ?? 0;
  const done = status === "published";
  const failed = status === "failed";

  if (publishJobId) {
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
          {event?.publish_id && (
            <p className="text-xs text-neutral-500">
              publish_id: {event.publish_id}
            </p>
          )}
        </div>

        {failed && event?.error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 break-words">
            {event.error}
          </div>
        )}

        {done && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
            Video sudah dipublikasi. Cek app TikTok untuk melihat hasilnya.
          </p>
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

  return (
    <div className="space-y-5">
      <ConnectTiktok selected={openId} onSelect={setOpenId} />

      <label className="block">
        <span className="text-sm text-neutral-300">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={2200}
          className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm outline-none focus:border-brand"
          placeholder="Tulis caption..."
        />
        <span className="text-xs text-neutral-500">
          {caption.length}/2200
        </span>
      </label>

      <div>
        <p className="text-sm font-medium mb-2">Privasi</p>
        <div className="grid grid-cols-3 gap-2">
          {PRIVACIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPrivacy(p.value)}
              className={`rounded-lg border px-3 py-2 text-xs transition ${
                privacy === p.value
                  ? "border-brand bg-brand/10"
                  : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={submitting || !openId}
        className="w-full rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 transition"
      >
        {submitting ? "Memulai..." : "Publikasi ke TikTok"}
      </button>
    </div>
  );
}
