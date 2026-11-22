# OmniDownload — Product Concept & Technical Vision

## 💡 Vision & Core Concept

**OmniDownload** is conceived as the ultimate universal downloader: a unified, open, privacy-respecting platform that enables users to download media, audio, documents, and archives from virtually any website or cloud service on the internet—without intrusive ads, artificial paywalls, or malware-laden third-party wrappers.

Whether fetching a 4K YouTube video with synced 5.1 audio, an uncompressed video clip from Twitter/X or Reddit, reels from Instagram/Facebook, large shared archives from TeraBox, or direct ISO/ZIP streams over HTTP, OmniDownload provides a seamless single-window interface, automated format merging, and real-time download telemetry.

---

## 🎯 Target Platforms & Media Types

### 1. Social Media & Video Streaming
- **YouTube / YouTube Shorts / YouTube Music**: 4K (2160p), 1440p, 1080p, 720p, 480p, 360p; Audio extraction to MP3, M4A, Opus. Automatic FFmpeg combining of video and audio streams.
- **Reddit**: Embedded videos (`v.redd.it`), GIFs, media galleries with automatic audio multiplexing.
- **Twitter / X**: Video clips, status media, GIFs with variable bitrate selection.
- **Instagram**: Public reels, video posts, and image carousels.
- **Facebook**: Public watch videos, standard clips, and reels in HD / SD.

### 2. Cloud Storage & File Sharing
- **TeraBox**: Direct file and video extraction bypassing throttled web players.
- **Future Cloud Integrations**: Google Drive, Mega, MediaFire, Dropbox, WeTransfer.

### 3. Direct Links & Custom Protocols
- **Direct HTTP / HTTPS**: Resumable, chunked streaming downloads for ZIP, ISO, PDF, APK, etc.
- **M3U8 / HLS & MPD (DASH)**: Automatic playlist chunk assembly and conversion to MP4.

---

## 🏛️ Core Architectural Pillars

### 1. Extractor Plugin Architecture
- Extensible, modular plugin registry (`BaseExtractor`) allowing new platform scrapers to be introduced without modifying core application logic.
- Intelligent fallback to `yt-dlp` and raw streaming engines.

### 2. Live WebSocket Telemetry Engine
- Event-driven WebSocket push architecture broadcasting download progress percentage, current download speed (KB/s, MB/s), estimated time of arrival (ETA), and downloaded byte count.

### 3. Intelligent FFmpeg Post-Processing
- Headless, non-blocking FFmpeg pipeline for merging independent DASH video and audio streams, transcode-on-the-fly, and container standardization into clean, widely-supported MP4/MKV files.

### 4. Background Priority Queue & Concurrency Control
- In-memory async worker pool with customizable concurrency slots (e.g., 2 simultaneous downloads), retry policies, and pause/resume/cancel mechanics.

### 5. Persistent Local Database & Native OS Integration
- SQLite with `aiosqlite` and async SQLAlchemy for download history, search, and configuration persistence.
- Cross-platform native file explorer integration (`/api/download/{id}/open-folder`) supporting Windows Explorer, macOS Finder, and Linux file managers.

### 6. Security-First Architecture
- SSRF (Server-Side Request Forgery) protection rejecting private, loopback, link-local, and reserved IP addresses.
- Strict path traversal prevention and filename sanitization.
- Protocol restrictions enforcing safe `http://` and `https://` schemas.

### 7. Modern Glassmorphic Web UI & Browser Extension
- Responsive Next.js 14 App Router, Tailwind CSS, Lucide icons, dark/light themes.
- Manifest V3 browser extension for one-click right-click context menu downloads and media detection.

---

## 🗺️ Product Roadmap

### Phase 1: Core Engine & Multi-Site Downloader *(Completed)*
- [x] Extractor system (YouTube, Reddit, Twitter/X, Instagram, Facebook, TeraBox, Generic HTTP).
- [x] FFmpeg automatic DASH audio/video merging.
- [x] WebSocket live progress, speed, and ETA broadcast.
- [x] Download queue management (pause, resume, cancel, retry).
- [x] Persistent history & settings.
- [x] Cross-platform "Open Folder" explorer integration.
- [x] Manifest V3 browser extension.
- [x] Docker & Docker Compose setup.
- [x] Unified local launchers (`start.ps1`, `start.py`, `start.bat`).

### Phase 2: Next-Gen Enhancements *(In Progress / Planned)*
- [ ] **Playlist & Channel Downloads**: Batch queueing of entire YouTube/Reddit playlists or profiles with selective downloading.
- [ ] **Cookie & Session Management**: Upload `cookies.txt` or auto-import session cookies from local browsers to access age-restricted or private posts.
- [ ] **Bandwidth Limiter & Throttling**: Global and per-task download speed caps to avoid saturating network connections.
- [ ] **Scheduled Downloads**: Schedule heavy downloads for off-peak hours (e.g., midnight to 6 AM).
- [ ] **Cloud Auto-Sync**: Auto-upload completed files to personal cloud storage (Google Drive, OneDrive, Nextcloud, WebDAV, Telegram Bot).
- [ ] **Audio Extraction & Whisper AI Transcription**: Extract audio and generate subtitle tracks (.srt/.vtt) using local Whisper models.
- [ ] **Desktop Native Bundle**: Optional packaging as a lightweight native desktop app using Tauri or Electron.
