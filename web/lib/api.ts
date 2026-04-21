import type {
  ConvertOptions,
  PrivacyLevel,
  ProgressEvent,
  PublishProgressEvent,
  TiktokAccount,
  VideoInfo,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const API_BASE_URL = BASE_URL;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`${BASE_URL}/api/fetch-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return handle<VideoInfo>(res);
}

export async function convert(
  url: string,
  options: ConvertOptions,
): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE_URL}/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, options }),
  });
  return handle<{ job_id: string }>(res);
}

export interface SubscribeHandlers {
  onProgress: (e: ProgressEvent) => void;
  onError?: (err: Event) => void;
  onDone?: () => void;
}

export function subscribeJob(
  jobId: string,
  handlers: SubscribeHandlers,
): () => void {
  const es = new EventSource(`${BASE_URL}/api/jobs/${jobId}/status`);

  const handle = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data) as ProgressEvent;
      handlers.onProgress(data);
      if (data.status === "completed" || data.status === "failed") {
        es.close();
        handlers.onDone?.();
      }
    } catch {
      /* ignore malformed frames */
    }
  };

  es.addEventListener("progress", handle as EventListener);
  es.onerror = (err) => {
    handlers.onError?.(err);
  };

  return () => es.close();
}

export async function listTiktokAccounts(): Promise<TiktokAccount[]> {
  const res = await fetch(`${BASE_URL}/api/auth/tiktok/accounts`);
  return handle<TiktokAccount[]>(res);
}

export function tiktokLoginUrl(): string {
  return `${BASE_URL}/api/auth/tiktok/login`;
}

export interface PublishBody {
  convert_job_id: string;
  open_id: string;
  caption: string;
  privacy: PrivacyLevel;
}

export async function publishToTiktok(
  body: PublishBody,
): Promise<{ publish_job_id: string }> {
  const res = await fetch(`${BASE_URL}/api/tiktok/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handle<{ publish_job_id: string }>(res);
}

export interface PublishSubscribeHandlers {
  onProgress: (e: PublishProgressEvent) => void;
  onError?: (err: Event) => void;
  onDone?: () => void;
}

export function subscribePublishJob(
  publishJobId: string,
  handlers: PublishSubscribeHandlers,
): () => void {
  const es = new EventSource(`${BASE_URL}/api/jobs/${publishJobId}/status`);

  const handle = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data) as PublishProgressEvent;
      handlers.onProgress(data);
      if (data.status === "published" || data.status === "failed") {
        es.close();
        handlers.onDone?.();
      }
    } catch {
      /* ignore */
    }
  };

  es.addEventListener("progress", handle as EventListener);
  es.onerror = (err) => handlers.onError?.(err);

  return () => es.close();
}
