export type ContentType = "video" | "audio" | "image" | "document" | "archive" | "torrent" | "unknown"

export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled" | "scheduled"

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
  subtitles?: string[]
  chapters?: Array<{ title: string; start_time: number; end_time: number }>
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
  scheduled_at?: string
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
  audio_only?: boolean
  audio_format?: string
  audio_bitrate?: string
  speed_limit_kbps?: number
  scheduled_at?: string
  start_time?: string
  end_time?: string
  subtitle_langs?: string[]
  embed_subtitles?: boolean
  embed_chapters?: boolean
  sponsorblock_remove?: boolean
  subfolder?: string
  metadata?: Record<string, any>
}

export interface DownloadResponse {
  id: string
  status: DownloadStatus
}

export interface ProgressUpdate {
  id?: string
  download_id?: string
  status: DownloadStatus
  progress: number
  downloaded?: number
  total?: number
  speed?: number
  eta?: number
  error?: string
  segments?: number
  seeders?: number
  type?: string
  filename?: string
  output_path?: string
}

export interface QueueStatus {
  downloads: DownloadInfo[]
  active_count: number
  queued_count: number
  completed_count: number
  failed_count: number
  scheduled_count?: number
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
  api_key?: string
  require_api_key?: boolean
  rate_limit_per_minute?: number
  enable_segmented_download?: boolean
  segmented_connections?: number
  aria2_enabled?: boolean
  aria2_path?: string
  aria2_rpc_url?: string
  aria2_rpc_secret?: string
  auto_tag_audio?: boolean
  embed_album_art?: boolean
}

export interface Aria2Status {
  installed: boolean
  binary_path?: string
  version?: string
  rpc_online: boolean
  rpc_url: string
}

export interface ApiKeyResponse {
  api_key: string
  created_at: string
  message: string
}

export type SettingsUpdate = Partial<Settings>

export interface Extractor {
  name: string
  domains: string[]
}

export interface BatchItemMetadata {
  url: string
  title?: string
  thumbnail?: string | null
  duration?: number | null
}

export interface BatchDownloadRequest {
  urls: string[]
  items?: BatchItemMetadata[]
  format_id?: string
  priority?: number
  is_video?: boolean
  is_audio?: boolean
  audio_only?: boolean
  audio_format?: string
  audio_bitrate?: string
  speed_limit_kbps?: number
  scheduled_at?: string
  subtitle_langs?: string[]
  embed_subtitles?: boolean
  embed_chapters?: boolean
  sponsorblock_remove?: boolean
  subfolder?: string
}

export interface PlaylistEntry {
  id: string
  url: string
  title: string
  duration?: number
  thumbnail?: string
  index: number
}

export interface PlaylistAnalyzeResponse {
  id: string
  title: string
  uploader?: string
  entry_count: number
  entries: PlaylistEntry[]
}

export interface MediaProbeStream {
  index: number
  codec_name?: string
  codec_type?: string
  width?: number
  height?: number
  r_frame_rate?: string
  bit_rate?: string
  sample_rate?: string
  channels?: number
}

export interface MediaProbeResponse {
  format?: {
    filename?: string
    nb_streams?: number
    format_name?: string
    duration?: string
    size?: string
    bit_rate?: string
  }
  streams?: MediaProbeStream[]
}

export interface BatchDownloadResult {
  url: string
  id?: string
  status: "queued" | "failed" | "scheduled"
  title?: string
  error?: string
}

export interface BatchDownloadResponse {
  total: number
  queued: number
  failed: number
  results: BatchDownloadResult[]
}

export interface CookieStatus {
  exists: boolean
  size: number
  line_count: number
  updated_at?: string
}

export interface SourceStat {
  source: string
  count: number
  percentage: number
}

export interface FormatStat {
  format: string
  count: number
}

export interface DailyActivity {
  date: string
  count: number
  bytes: number
}

export interface AnalyticsStats {
  total_downloads: number
  completed_downloads: number
  failed_downloads: number
  active_downloads: number
  scheduled_downloads: number
  total_bytes: number
  success_rate: number
  sources: SourceStat[]
  formats: FormatStat[]
  daily_activity: DailyActivity[]
}