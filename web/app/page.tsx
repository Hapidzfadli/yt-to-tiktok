"use client";

import { useState } from "react";

import { Stepper } from "@/components/Stepper";
import { StepOptions } from "@/components/steps/StepOptions";
import { StepPreview } from "@/components/steps/StepPreview";
import { StepProgress } from "@/components/steps/StepProgress";
import { StepUrl } from "@/components/steps/StepUrl";
import { convert, fetchInfo } from "@/lib/api";
import type { ConvertOptions, VideoInfo } from "@/lib/types";

const STEPS = ["URL", "Preview", "Opsi", "Progress"];

export default function HomePage() {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInfo = async (input: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchInfo(input);
      setUrl(input);
      setInfo(data);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengambil metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (opts: ConvertOptions) => {
    if (!url) return;
    setError(null);
    setLoading(true);
    try {
      const { job_id } = await convert(url, opts);
      setJobId(job_id);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memulai konversi");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(1);
    setUrl(null);
    setInfo(null);
    setJobId(null);
    setError(null);
  };

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            YouTube <span className="text-brand">→</span> TikTok
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Unduh, potong, reframe ke 9:16 — siap post.
          </p>
        </header>

        <div className="mb-8">
          <Stepper current={step} steps={STEPS} />
        </div>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 md:p-8 shadow-xl shadow-black/20">
          {step === 1 && (
            <StepUrl
              onSubmit={handleFetchInfo}
              loading={loading}
              error={error}
            />
          )}
          {step === 2 && info && (
            <StepPreview
              info={info}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && info && (
            <StepOptions
              info={info}
              onBack={() => setStep(2)}
              onSubmit={handleConvert}
              submitting={loading}
              error={error}
            />
          )}
          {step === 4 && jobId && (
            <StepProgress jobId={jobId} onRestart={restart} />
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-neutral-500">
          Phase 1 MVP · backend: FastAPI + Celery + Redis
        </footer>
      </div>
    </main>
  );
}
