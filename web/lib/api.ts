import type { ConvertOptions, ProgressEvent, VideoInfo } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
