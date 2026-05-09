"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConnectTiktok } from "@/components/ConnectTiktok";
import { Stepper } from "@/components/Stepper";
import { StepOptions } from "@/components/steps/StepOptions";
import { StepPreview } from "@/components/steps/StepPreview";
import { StepProgress } from "@/components/steps/StepProgress";
import { StepPublish } from "@/components/steps/StepPublish";
import { StepUrl } from "@/components/steps/StepUrl";
import { convert, fetchInfo, listTiktokAccounts } from "@/lib/api";
import type { ConvertOptions, VideoInfo } from "@/lib/types";

export function ConverterApp() {
  const t = useTranslations("converter");

  // step 0 = TikTok pre-step, step 1-5 = converter flow
  const [step, setStep] = useState(0);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [selectedOpenId, setSelectedOpenId] = useState<string | null>(null);

  const [url, setUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: check for existing connected accounts + handle OAuth callback
  useEffect(() => {
    // Handle OAuth callback: ?tiktok=connected&open_id=xxx
    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok") === "connected") {
      const openId = params.get("open_id");
      if (openId) setSelectedOpenId(openId);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Load accounts to check connection status
    listTiktokAccounts()
      .then((accounts) => {
        if (accounts.length > 0 && !selectedOpenId) {
          setSelectedOpenId(accounts[0].open_id);
        }
        setAccountsLoaded(true);
      })
      .catch(() => setAccountsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-skip pre-step if already connected
  useEffect(() => {
    if (accountsLoaded && selectedOpenId && step === 0) {
      setStep(1);
    }
  }, [accountsLoaded, selectedOpenId, step]);

  const handleFetchInfo = async (input: string) => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchInfo(input);
      setUrl(input);
      setInfo(data);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.fetchInfo"));
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
      setError(e instanceof Error ? e.message : t("errors.convert"));
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(selectedOpenId ? 1 : 0);
    setUrl(null);
    setInfo(null);
    setJobId(null);
    setError(null);
  };

  // Pre-step: TikTok account selection
  if (step === 0) {
    // Still loading — show skeleton to avoid flash
    if (!accountsLoaded) {
      return (
        <div className="space-y-4">
          <div className="mb-8 text-center">
            <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-neutral-800" />
            <div className="mx-auto mt-3 h-4 w-80 animate-pulse rounded bg-neutral-800/60" />
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 md:p-8">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-800" />
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            {t("preStep.title")}
          </h2>
          <p className="mt-2 text-sm text-neutral-400">{t("preStep.subtitle")}</p>
        </div>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 md:p-8 shadow-xl shadow-black/20 space-y-6">
          <ConnectTiktok
            selected={selectedOpenId}
            onSelect={setSelectedOpenId}
          />

          <div className="border-t border-neutral-800 pt-5 space-y-3">
            <button
              onClick={() => setStep(1)}
              disabled={!selectedOpenId}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 transition shadow-lg shadow-brand/20"
            >
              {t("preStep.cta")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-neutral-500">
              {t("preStep.skipHint")}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Steps 1–5: converter flow
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">{t("subtitle")}</p>
      </div>

      <div className="mb-8">
        <Stepper current={step} />
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
          <StepProgress
            jobId={jobId}
            onRestart={restart}
            onPublish={() => setStep(5)}
          />
        )}
        {step === 5 && jobId && (
          <StepPublish
            convertJobId={jobId}
            defaultCaption={info?.title ?? ""}
            initialOpenId={selectedOpenId}
            onRestart={restart}
          />
        )}
      </section>
    </div>
  );
}
