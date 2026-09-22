export type ContentType = "video" | "audio" | "image" | "document" | "archive" | "unknown"

export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled"

export interface Format {
  format_id: string
  quality: string
  extension: string
  filesize?: number
  vcodec?: string
  acodec?: string
  fps?: number
  width?: number
  height?: number
  bitrate?: number
  protocol?: string
  is_video: boolean
  is_audio: boolean
}

export interface AnalyzeResponse {
  success: boolean
  source: string
  type: ContentType
  title: string
  thumbnail?: string
  duration?: number
  formats: Format[]
  metadata?: Record<string, any>
  error?: {
    code: string
    message: string
    details?: Record<string, any>
  }
}

export interface DownloadInfo {
  id: string
  url: string
  source: string
  title?: string
  filename?: string
  file_size: number
  downloaded_size: number
  format?: string
  format_id?: string
  extension?: string
  content_type: ContentType
  status: DownloadStatus
  progress: number
  speed: number
  eta: number
  priority: number
  retries: number
  max_retries: number
  error?: string
  output_path?: string
  thumbnail?: string
  duration?: number
  metadata?: Record<string, any>
  created_at: string
  updated_at?: string
  started_at?: string
  completed_at?: string
}

export interface DownloadRequest {
  url: string
  format_id?: string
  output_path?: string
  priority?: number
  title?: string
  thumbnail?: string
  duration?: number
  format?: string
  file_size?: number
  is_video?: boolean
  is_audio?: boolean
}

export interface DownloadResponse {
  id: string
  status: DownloadStatus
}

export interface ProgressUpdate {
  id: string
  status: DownloadStatus
  progress: number
  downloaded: number
  total: number
  speed: number
  eta: number
}

export interface QueueStatus {
  downloads: DownloadInfo[]
  active_count: number
  queued_count: number
  completed_count: number
  failed_count: number
  max_concurrent: number
}

export interface HistoryItem {
  id: string
  url: string
  source: string
  title?: string
  filename?: string
  file_size: number
  format?: string
  extension?: string
  content_type: ContentType
  status: DownloadStatus
  output_path?: string
  thumbnail?: string
  duration?: number
  metadata?: Record<string, any>
  error?: string
  created_at: string
  completed_at?: string
}

export interface Settings {
  download_dir: string
  max_concurrent_downloads: number
  max_download_speed?: number
  retry_count: number
  preferred_video_format: string
  preferred_audio_format: string
  default_quality: string
  auto_merge_audio_video: boolean
  delete_temp_files: boolean
  theme: "light" | "dark" | "system"
}

export type SettingsUpdate = Partial<Settings>

export interface Extractor {
  name: string
  domains: string[]
}