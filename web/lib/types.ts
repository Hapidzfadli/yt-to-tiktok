export type Aspect = "9:16" | "1:1" | "16:9";

export interface VideoInfo {
  id: string;
  title: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  view_count: number | null;
  description: string | null;
}

export interface ConvertOptions {
  start?: number;
  end?: number;
  aspect: Aspect;
  add_caption: boolean;
}

export type JobStatus =
  | "pending"
  | "downloading"
  | "converting"
  | "uploading"
  | "completed"
  | "failed";

export interface ProgressEvent {
  id: string;
  status: JobStatus;
  progress: number;
  output_url?: string;
  error?: string;
}
