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

export type PublishStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "published"
  | "failed";

export interface PublishProgressEvent {
  kind: "publish";
  id: string;
  status: PublishStatus;
  progress: number;
  publish_id?: string;
  error?: string;
}

export interface TiktokAccount {
  open_id: string;
  display_name: string | null;
  avatar_url: string | null;
  scopes: string;
  connected_at: string;
}

export type PrivacyLevel =
  | "SELF_ONLY"
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS";
