export type JobStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobType = 'single' | 'playlist';
export type JobPhase =
  | 'downloading'
  | 'resuming'
  | 'merging'
  | 'processing'
  | 'queued'
  | 'paused';

export interface Job {
  id: string;
  url: string;
  format: string;
  type: JobType;
  status: JobStatus;
  phase?: JobPhase;
  progress: number;
  current_item: number;
  total_items: number;
  current_title: string;
  output_dir: string;
  files: string[];
  error: string | null;
  pid: number | null;
  created_at: number;
  updated_at: number;
  // Optional progress fields
  download_speed?: string | null;
  downloaded_size?: string | null;
  total_size?: string | null;
  stream?: 'audio' | 'video' | null;
  warning?: string | null;
  has_started?: boolean;
  cleaned?: boolean;
  meta_filesize?: number | null; // total bytes from yt-dlp metadata (for HLS/DASH)
  // Thumbnail metadata
  thumbnail_url?: string;
  thumbnail_title?: string;
  thumbnail_channel?: string;
  thumbnail_duration?: string;
  // Enriched by API
  file_urls?: string[];
  ready_files?: string[];
}

export interface AppSettings {
  download_dir: string;
  subtitles: boolean;
  embed_metadata: boolean;
  embed_thumbnail: boolean;
  rate_limit: string;
  cookies_browser: string;
}

export interface Stats {
  total_downloads: number;
  total_bytes: number;
}

export interface ThumbnailMeta {
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  has_video: boolean;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}
