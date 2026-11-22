# OmniDownload — Comprehensive Project Context & AI Agent Architecture Guide

> **Target Audience**: AI Agents, LLM Code Assistants, Senior Software Architects, and Contributors.  
> **Purpose**: Provides total architectural clarity, file maps, data flow specifications, API contracts, database schemas, and operational instructions so any AI agent can immediately understand, reason about, extend, and debug the OmniDownload codebase without hallucinations.

---

## 📑 Table of Contents

1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack Matrix](#3-technology-stack-matrix)
4. [Master Repository Directory & File Inventory](#4-master-repository-directory--file-inventory)
5. [Backend Architecture Deep-Dive](#5-backend-architecture-deep-dive)
   - [5.1 Application Lifespan & Initialization (`backend/main.py`)](#51-application-lifespan--initialization-backendmainpy)
   - [5.2 Configuration & Settings Management (`backend/core/config.py`)](#52-configuration--settings-management-backendcoreconfigpy)
   - [5.3 Database Engine, Async Scoping & ORM Models (`backend/models/database.py`, `backend/core/database.py`)](#53-database-engine-async-scoping--orm-models)
   - [5.4 Pydantic Schemas & Data Contracts (`backend/models/schemas.py`)](#54-pydantic-schemas--data-contracts-backendmodelsschemaspy)
   - [5.5 Security Engine & SSRF Protection (`backend/core/security.py`)](#55-security-engine--ssrf-protection-backendcoresecuritypy)
   - [5.6 Rate Limiting & Auth (`backend/core/limiter.py`)](#56-rate-limiting--auth-backendcorelimiterpy)
   - [5.7 Extractor Plugin System & 4K/8K DASH Parsing (`backend/extractors/`)](#57-extractor-plugin-system--4k8k-dash-parsing-backendextractors)
   - [5.8 Core Download Engine & Fragment-Aware Telemetry (`backend/download/engine.py`)](#58-core-download-engine--fragment-aware-telemetry-backenddownloadenginepy)
   - [5.9 High-Speed Segmented Downloader (`backend/download/segmented.py`)](#59-high-speed-segmented-downloader-backenddownloadsegmentedpy)
   - [5.10 Priority Queue & Scheduler (`backend/queue/manager.py`)](#510-priority-queue--scheduler-backendqueuemanagerpy)
   - [5.11 Post-Processing Services (`backend/services/`)](#511-post-processing-services-backendservices)
   - [5.12 Real-Time WebSocket Telemetry (`backend/api/websocket.py`)](#512-real-time-websocket-telemetry-backendapiwebsocketpy)
6. [Complete REST & WebSocket API Specification](#6-complete-rest--websocket-api-specification)
7. [Frontend Architecture Deep-Dive](#7-frontend-architecture-deep-dive)
   - [7.1 Design System & Aesthetic Principles](#71-design-system--aesthetic-principles)
   - [7.2 Routing & Pages Breakdown (`frontend/src/app/`)](#72-routing--pages-breakdown-frontendsrcapp)
   - [7.3 Component Hierarchy & Interactive Engines](#73-component-hierarchy--interactive-engines)
   - [7.4 Client State Management & Persistence (`frontend/src/hooks/useStore.ts`)](#74-client-state-management--persistence-frontendsrchooksusestorets)
   - [7.5 Frontend Progress Synchronization & Clamping (`frontend/src/components/download/DownloadQueue.tsx`)](#75-frontend-progress-synchronization--clamping)
   - [7.6 API Client & WebSocket Consumer (`frontend/src/services/api.ts`)](#76-api-client--websocket-consumer-frontendsrcservicesapits)
8. [Browser Extension (Manifest V3)](#8-browser-extension-manifest-v3)
9. [Automated Test Suite & Quality Assurance](#9-automated-test-suite--quality-assurance)
10. [Configuration & Environment Reference](#10-configuration--environment-reference)
11. [Execution & Deployment Runbook](#11-execution--deployment-runbook)
12. [Developer & AI Agent Extension Guide (How-To Cookbooks)](#12-developer--ai-agent-extension-guide-how-to-cookbooks)
13. [Known Edge Cases & Architectural Gotchas Solved](#13-known-edge-cases--architectural-gotchas-solved)
   - [13.1 YouTube Fragment 0 Initialization Spike](#131-youtube-fragment-0-initialization-spike)
   - [13.2 Missing 4K/8K Options in Format Picker](#132-missing-4k8k-options-in-format-picker)
   - [13.3 File Skip on Format Upgrade (Format Tagging)](#133-file-skip-on-format-upgrade-format-tagging)
   - [13.4 SQLite Concurrency & Database Locks (WAL Mode & Retry Scopes)](#134-sqlite-concurrency--database-locks-wal-mode--retry-scopes)
   - [13.5 Dual-Stream (Video + Audio) DASH Progress Reset & Size Telemetry](#135-dual-stream-video--audio-dash-progress-reset--size-telemetry)
   - [13.6 DNS Rebinding & Open Redirect SSRF Guard](#136-dns-rebinding--open-redirect-ssrf-guard)
   - [13.7 Startup State Reconciliation & In-flight Orphan Purging](#137-startup-state-reconciliation--in-flight-orphan-purging)
   - [13.8 WebSocket Subscription Race Condition & Fast Completion Snapshot Replay](#138-websocket-subscription-race-condition--fast-completion-snapshot-replay)
   - [13.9 Frontend WebSocket Re-Subscription & Non-Resetting Terminal States](#139-frontend-websocket-re-subscription--non-resetting-terminal-states)
   - [13.10 Non-Blocking Async SSRF Wrapper (`async_check_ssrf`)](#1310-non-blocking-async-ssrf-wrapper-async_check_ssrf)
   - [13.11 In-Memory Queue Pool Rehydration on Boot](#1311-in-memory-queue-pool-rehydration-on-boot)
   - [13.12 Subprocess Lifecycle & Zombie Prevention on HLS Cancel/Pause](#1312-subprocess-lifecycle--zombie-prevention-on-hls-cancelpause)
   - [13.13 Hardened OS File Explorer Path Resolution](#1313-hardened-os-file-explorer-path-resolution)
   - [13.14 Parallel Non-Blocking URL Validation in Batch Downloads](#1314-parallel-non-blocking-url-validation-in-batch-downloads)
   - [13.15 LocalStorage Queue Isolation to Prevent Stale State Ghosting](#1315-localstorage-queue-isolation-to-prevent-stale-state-ghosting)
   - [13.16 Multi-Stream DASH Fragment Progress Telemetry & Live Byte Interpolation](#1316-multi-stream-dash-fragment-progress-telemetry--live-byte-interpolation)
   - [13.17 Video Time-Range Clipping, Subtitles & SponsorBlock (Phase 1)](#1317-video-time-range-clipping-subtitles--sponsorblock-phase-1)
   - [13.18 Smart Playlist, Album & Carousel Ingestion with Subfolder Isolation (Phase 2)](#1318-smart-playlist-album--carousel-ingestion-with-subfolder-isolation-phase-2)
   - [13.19 Cybernetic Media Player & HTTP 206 Partial Content Range Streaming (Phase 3)](#1319-cybernetic-media-player--http-206-partial-content-range-streaming-phase-3)
   - [13.20 Manifest V3 Browser Extension v2: 1-Click Cookie Sync & Stream Sniffer (Phase 4)](#1320-manifest-v3-browser-extension-v2-1-click-cookie-sync--stream-sniffer-phase-4)
   - [13.21 Solaris Carbon Multi-Theme Palette, Kinetic Input & Velocity HUD Overhaul](#1321-solaris-carbon-multi-theme-palette-kinetic-input--velocity-hud-overhaul)
   - [13.22 UI/UX Upgrade, Complete Color Purge & 3D Deconstruction Landing Page Overhaul](#1322-uiux-upgrade-complete-color-purge--3d-deconstruction-landing-page-overhaul)
   - [13.23 Unified Landing Page & Application Architecture](#1323-unified-landing-page--application-architecture)

---

## 1. Executive Summary & Product Vision

**OmniDownload** is an enterprise-grade, privacy-first, universal media and file ingestion platform. It replaces fractured, ad-riddled web downloaders with an open, high-performance solution that extracts and accelerates media downloads from 1000+ sources (YouTube, Reddit, Twitter/X, Instagram, Facebook, TikTok, Pinterest, SoundCloud, Vimeo, TeraBox, BitTorrent, HLS streams, and direct HTTP/HTTPS files).

### Core Differentiators:
- **Intelligent 4K/8K Multi-Stream Merging**: Automatically parses complex fragmented DASH streams (e.g. YouTube 1440p, 2160p 4K, 4320p 8K) and best available audio streams, muxing them losslessly using a non-blocking FFmpeg pipeline.
- **Fragment-Aware Telemetry Engine**: Eliminates fragment 0 initialization spikes in DASH/HLS downloads. Calculates real-time incremental progress, caps active downloading states at 99%, and guarantees 100% is only broadcast when post-processing and container muxing have concluded.
- **Format-Collision Prevention**: Isolates output filenames using unique format and quality tags (`[title] [id] [format_id].ext`), ensuring higher-quality downloads (e.g., 4K upgrade) never get skipped by yt-dlp due to existing low-resolution files on disk.
- **Segmented HTTP Acceleration**: Splits direct file downloads into 8–16 simultaneous chunk connections using HTTP `Range` headers, saturating available bandwidth with automated redirect SSRF protection.
- **Automated Audio Tagging & Art Injection**: Cleans title clickbait and noise, queries MusicBrainz for accurate metadata, and embeds high-resolution cover art into MP3, M4A, FLAC, and Opus containers via `mutagen`.
- **Scheduled & Priority Queueing**: Downloader tasks can be scheduled for future execution (e.g., off-peak network hours) or assigned high-priority slots in an async worker queue with in-memory recovery across server restarts.
- **Real-Time WebSocket Telemetry**: Broadcasts sub-second speed, byte count, ETA, and progress metrics to connected browser clients and extensions, with subscription replay caching and global terminal notifications.
- **Cross-Platform Native Explorer Integration**: Includes native OS desktop revealing (`explorer.exe` on Windows, `open -R` on macOS, `xdg-open` on Linux) to open the download destination folder with the target file highlighted.
- **Zero-Trust Security Sandbox**: Strict SSRF prevention against private IP subnets and loopback addresses, strict URL schemes, filename sanitization, non-blocking DNS resolution, and path-traversal prevention.

---

## 2. High-Level System Architecture

The following diagram details the interaction between client interfaces, the FastAPI application, internal queues, background engines, and the storage layer:

```mermaid
graph TB
    subgraph Clients["Client Layer"]
        NextJS["Next.js 14 Frontend<br/>(Port 3000)"]
        BrowserExt["Chrome/Edge Extension<br/>(Manifest V3)"]
        ThirdParty["External REST/WS Clients"]
    end

    subgraph Gateway["API & Communication Layer (Port 8000)"]
        Router["FastAPI Router (/api)"]
        Limiter["SlowAPI Rate Limiter"]
        SSRF["SSRF & Async URL Validator"]
        WSManager["WebSocket ConnectionManager<br/>(/ws/{client_id})"]
    end

    subgraph CoreEngine["Core Orchestration & Queue"]
        QueueMgr["DownloadQueue Worker Pool<br/>(Priority & Concurrency)"]
        Scheduler["Async Delayed Scheduler<br/>(5s Poll Cycle)"]
        Engine["DownloadEngine Dispatcher"]
    end

    subgraph Extractors["Extractor Plugin System"]
        Registry["ExtractorRegistry"]
        YT["YouTube / Music (DASH 4K/8K)"]
        Reddit["Reddit (v.redd.it HLS)"]
        Twitter["Twitter / X"]
        Insta["Instagram Reels/Carousel"]
        FB["Facebook Watch"]
        Tera["TeraBox Cloud"]
        OtherExt["TikTok / Vimeo / SoundCloud / Pinterest"]
        HLS["HLS Stream Extractor"]
        Torrent["Torrent / Magnet Extractor"]
        Generic["Generic Direct Link Extractor"]
    end

    subgraph DownloadRunners["Specialized Download Runners"]
        RunnerYTDL["_download_ytdlp<br/>(yt-dlp Core + Multi-Stream Hooks)"]
        RunnerSeg["SegmentedDownloader<br/>(8-16 Chunk Threads + Redirect Guard)"]
        RunnerHLS["_download_hls<br/>(FFmpeg Live Muxing + Proc Registry)"]
        RunnerTorrent["_download_torrent<br/>(aria2c RPC Daemon)"]
    end

    subgraph PostProcessing["Post-Processing Services"]
        FFmpegSvc["FFmpegService<br/>(Mux, Transcode, Probe)"]
        TaggerSvc["AudioTagger<br/>(Mutagen + MusicBrainz)"]
        AriaSvc["Aria2Service<br/>(Daemon Manager)"]
    end

    subgraph Storage["Persistence & File Storage"]
        DB[(SQLite / aiosqlite<br/>WAL Mode + Busy Retry)]
        DownloadsDir[("downloads/<br/>Completed Media")]
        TempDir[("temp/<br/>Chunk Buffers & Auto-Purge")]
    end

    NextJS -->|HTTP REST| Router
    NextJS -->|WebSocket| WSManager
    BrowserExt -->|HTTP & Token| Router
    ThirdParty -->|API Key| Router

    Router --> Limiter
    Limiter --> SSRF
    SSRF --> Registry
    Router --> QueueMgr
    QueueMgr --> Scheduler
    QueueMgr --> Engine

    Registry --> YT & Reddit & Twitter & Insta & FB & Tera & OtherExt & HLS & Torrent & Generic

    Engine --> RunnerYTDL
    Engine --> RunnerSeg
    Engine --> RunnerHLS
    Engine --> RunnerTorrent

    RunnerYTDL --> FFmpegSvc
    RunnerYTDL --> TaggerSvc
    RunnerSeg --> TempDir
    RunnerTorrent --> AriaSvc

    Engine -->|Live Telemetry (Throttled DB & Instant WS)| WSManager
    Engine -->|Scoped Sessions| DB
    RunnerYTDL & RunnerSeg & RunnerHLS & RunnerTorrent --> DownloadsDir
```

---

## 3. Technology Stack Matrix

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend Framework** | FastAPI | `0.110.0` | High-performance asynchronous REST and WebSocket API |
| **ASGI Server** | Uvicorn | `0.29.0` | Production ASGI web server |
| **Language (Backend)** | Python | `3.11` / `3.12` | Core backend runtime |
| **Extraction Core** | yt-dlp | `>=2024.12.0` | Advanced metadata extraction and multi-site streaming |
| **JS Engine for yt-dlp** | Node.js / EJS | System PATH / GitHub Component | YouTube extraction runtime and cipher solver |
| **ORM / Data Layer** | SQLAlchemy (Async) | `2.0.29` | Async ORM database abstraction with scoped sessions & WAL mode |
| **Database Driver** | aiosqlite | `0.19.0` | Non-blocking async SQLite storage |
| **Validation & Schema** | Pydantic & Pydantic-Settings | `2.6.4` / `2.2.1` | Data parsing, validation, and env config |
| **Media Processing** | FFmpeg & FFprobe | System `PATH` | Video/audio muxing, format conversion, metadata extraction |
| **Audio Tagging** | Mutagen | `1.47.0+` | ID3, MP4, FLAC, and Ogg Opus tag and album art embedding |
| **HTTP Client** | HTTPX | `0.27.0` | Async HTTP client for segment fetching and MusicBrainz API |
| **Rate Limiting** | SlowAPI | `0.1.9+` | Per-IP and per-API-key token bucket rate limiting |
| **Frontend Framework** | Next.js (App Router) | `14.0.4` | Server-rendered and client-hydrated React application |
| **UI Library** | React | `18.2.0` | Component framework |
| **Language (Frontend)** | TypeScript | `5.3.0` | Type-safe clientside development |
| **Styling** | Tailwind CSS | `3.3.5` | Utility-first responsive styling with custom glass HUD |
| **Primitive Components** | Radix UI | Latest | Accessible unstyled primitives (Dialog, Dropdown, Tabs, etc.) |
| **State Management** | Zustand | `4.4.7` | Lightweight client state store with partialized localStorage sync |
| **Icons** | Lucide React | `0.294.0` | Consistent vector iconography |
| **Browser Extension** | Manifest V3 | V3 Spec | Background service worker, stream sniffer, 1-click cookie sync, popup controller |
| **Testing Suite** | Pytest + pytest-asyncio | `8.1.1` / `0.23.3` | Async unit, extractor, queue, security, and API endpoint testing (94 tests) |
| **Containerization** | Docker & Docker Compose | Compose V2 | Multi-container orchestration (backend + frontend) |

---

## 4. Master Repository Directory & File Inventory

```
OmniDownloader/
├── .env.example                     # Reference environment variables template
├── .gitignore                       # Git exclusion rules (venv, temp, node_modules, db, partials)
├── Dockerfile.backend               # Container recipe for FastAPI Python backend
├── Dockerfile.frontend              # Container recipe for Next.js 14 frontend
├── docker-compose.yml               # Service topology definition for containerized run
├── pytest.ini                       # Pytest configuration (asyncio mode, testpaths)
├── README.md                        # Primary user documentation
├── IDEA.md                          # Product concept, technical vision, roadmap
├── to.md                            # Concise local and container execution manual
├── PROJECT_CONTEXT.md               # [THIS FILE] Master AI agent architectural context
├── start.py                         # Cross-platform runner streaming colored child process logs
├── start.ps1                        # PowerShell dual-terminal developer launcher
├── start.bat                        # Windows Command Prompt double-click launcher
│
├── backend/                         # FastAPI Python Backend Application
│   ├── .env                         # Local backend environment overrides
│   ├── main.py                      # Application bootstrap, lifespan, routes, CORS, limiter
│   ├── requirements.txt             # Pinned backend dependencies
│   ├── api/                         # Web routing & communication
│   │   ├── __init__.py              # API package marker
│   │   ├── routes.py                # 31 REST endpoints for downloads, history, queue, settings, streaming, and playlists
│   │   └── websocket.py             # ConnectionManager with pub/sub download progress channel
│   ├── core/                        # Infrastructure, database, configuration, security
│   │   ├── __init__.py              # Core package marker
│   │   ├── config.py                # Pydantic Settings instance with environment fallback
│   │   ├── database.py              # Async engine, sessionmaker, scoped sessions, table lifecycle
│   │   ├── exceptions.py            # Domain-specific hierarchy of application exceptions
│   │   ├── limiter.py               # SlowAPI rate-limiting key derivation (IP / API key)
│   │   └── security.py              # SSRF checking, URL parsing, sanitizers, API key guard
│   ├── download/                    # Download execution engines
│   │   ├── __init__.py              # Download package marker
│   │   ├── engine.py                # DownloadEngine dispatcher (yt-dlp, HLS, generic, torrent)
│   │   └── segmented.py             # SegmentedDownloader (parallel multi-connection HTTP)
│   ├── extractors/                  # Modular extractor plugin system
│   │   ├── __init__.py              # Extractor registry initializations
│   │   ├── base.py                  # BaseExtractor, VideoInfo, ExtractorRegistry, 4K/8K parser
│   │   ├── youtube.py               # YouTube and YouTube Music extractor
│   │   ├── reddit.py                # Reddit v.redd.it audio/video HLS extractor
│   │   ├── twitter.py               # Twitter/X video & GIF extractor
│   │   ├── instagram.py             # Instagram reels, clips, and photo carousels
│   │   ├── facebook.py              # Facebook Watch and public video extractor
│   │   ├── terabox.py               # TeraBox cloud storage bypass extractor
│   │   ├── tiktok.py                # TikTok watermark-free video extractor
│   │   ├── pinterest.py             # Pinterest pins and story extractor
│   │   ├── soundcloud.py            # SoundCloud audio stream extractor
│   │   ├── vimeo.py                 # Vimeo HD stream extractor
│   │   ├── hls.py                   # Generic M3U8 / HLS playlist parser
│   │   ├── torrent.py               # BitTorrent file & magnet URI extractor
│   │   └── generic.py               # Generic direct HTTP/HTTPS stream inspector
│   ├── models/                      # Schemas and persistence entities
│   │   ├── __init__.py              # Models package marker
│   │   ├── database.py              # SQLAlchemy ORM models (Download, DownloadHistory, Settings)
│   │   └── schemas.py               # Pydantic models for requests, responses, filters, stats
│   ├── queue/                       # Background task coordination
│   │   ├── __init__.py              # Queue package marker
│   │   └── manager.py               # DownloadQueue priority worker pool & delayed scheduler
│   └── services/                    # Peripheral background integrations
│       ├── __init__.py              # Services package marker
│       ├── aria2.py                 # Aria2Service daemon manager and JSON-RPC client
│       ├── ffmpeg.py                # FFmpegService async subprocess wrapper and probe
│       └── tagger.py                # AudioTagger (Mutagen tag cleaner & MusicBrainz client)
│
├── frontend/                        # Next.js 14 App Router Application
│   ├── package.json                 # Frontend dependencies and npm scripts
│   ├── next.config.js               # Next.js configuration and backend API proxying
│   ├── tailwind.config.ts           # Tailwind CSS design system and theme extensions
│   ├── tsconfig.json                # TypeScript compiler configuration
│   ├── .eslintrc.json               # ESLint configuration and Next.js Core Web Vitals rules
│   └── src/
│       ├── app/                     # App Router pages and layouts
│       │   ├── layout.tsx           # Root HTML layout with providers and fonts
│       │   ├── providers.tsx        # NextThemesProvider and global wrappers
│       │   ├── globals.css          # Tailwind directives, animations, and custom scrollbars
│       │   ├── page.tsx             # Home page (toggles 3D Dissection Landing / Downloader)
│       │   ├── queue/page.tsx       # Live Queue & pipeline telemetry monitor
│       │   ├── history/page.tsx     # Historical download search, CSV/JSON export/import
│       │   ├── dashboard/page.tsx   # Analytics, bandwidth metrics, daily activity graphs
│       │   ├── sites/page.tsx       # Supported sites directory and feature compatibility
│       │   ├── settings/page.tsx    # App preferences, cookies.txt manager, aria2 status, API keys
│       │   ├── about/page.tsx       # Architecture breakdown, system specifications, docs
│       │   └── landing/page.tsx     # Direct route for 3D Dissection Landing experience
│       ├── components/              # Reusable React components
│       │   ├── icons.tsx            # Custom SVG icon set and brand marks
│       │   ├── download/
│       │   │   ├── UrlAnalyzer.tsx  # Master URL input, batch queue, format picker, playlist modal, clip/enhancements HUD
│       │   │   ├── DownloadQueue.tsx# Pipeline progress cards, progress clamp, player preview trigger, actions
│       │   │   └── CyberneticMediaPlayer.tsx # Glassmorphic HTML5 player modal with Range seeking and FFprobe telemetry
│       │   ├── landing/
│       │   │   └── EngineDeconstructionLanding.tsx # 150-frame interactive 3D exploded engine canvas
│       │   ├── layout/
│       │   │   ├── AppShell.tsx     # Persistent HUD navigation bar, mobile drawer, footer
│       │   │   ├── CommandPalette.tsx # Universal Ctrl+K / Cmd+K command bar, instant navigation, theme swatches
│       │   │   ├── ThemeSwitcher.tsx # Luxury 4-palette dynamic theme switcher popover with CSS variable sync
│       │   │   └── BrowserExtensionModal.tsx # Guide & install modal for Chrome/Edge extension
│       │   └── ui/                  # Atomic Radix UI components (button, card, dialog, toast, etc.)
│       ├── hooks/
│       │   ├── useStore.ts          # Zustand store with partialized localStorage persistence
│       │   └── useToast.ts          # Toast notification dispatch hook
│       ├── lib/
│       │   └── utils.ts             # Formatting helpers (formatBytes, formatDuration, cn)
│       ├── services/
│       │   └── api.ts               # Axios HTTP client, WebSocket bridge, and resubscription
│       └── types/
│           └── index.ts             # Complete TypeScript interfaces matching backend models
│
├── browser-extension/               # Chrome / Edge / Brave Manifest V3 Extension
│   ├── manifest.json                # MV3 declarations, host permissions, background worker
│   ├── background.js                # Service worker for right-click context menus & API requests
│   ├── content.js                   # DOM media sniffer injecting hover download triggers
│   ├── content.css                  # Overlay styling for sniffer badges
│   ├── popup.html                   # Extension popup interface
│   ├── popup.js                     # Extension popup logic, API status, and download dispatch
│   └── icons/                       # Extension action icons (16, 32, 48, 128)
│
├── tests/                           # Pytest Automated Test Suite (94 Passing Tests)
│   ├── conftest.py                  # In-memory SQLite fixtures, event loops, yt-dlp mocks
│   ├── test_api_endpoints.py        # Playlist SSRF/analysis, media probe, and HTTP 206 Range streaming tests
│   ├── test_engine.py               # DownloadEngine lifecycle, time-range clipping, pause, resume, cancel tests
│   ├── test_extractors.py           # Extractor parsing, flat playlist extraction, and domain resolution tests
│   ├── test_queue.py                # Priority queue order, concurrency caps, worker tests
│   ├── test_security.py             # SSRF defenses, private IP bans, filename sanitizers
│   ├── test_segmented.py            # SegmentedDownloader chunk calculation and probe tests
│   ├── test_tagger.py               # Title noise regex, MusicBrainz parser, tagger tests
│   └── test_torrent.py              # Torrent file decoding and magnet link extractor tests
│
├── data/                            # Persistent runtime database (`omnidownload.db`)
├── downloads/                       # Target directory for completed user downloads
└── temp/                            # Transient scratchpad for ongoing chunks and muxing
```

---

## 5. Backend Architecture Deep-Dive

### 5.1 Application Lifespan & Initialization (`backend/main.py`)
The application lifecycle is orchestrated by FastAPI's `lifespan` async context manager:
1. **Database Schema Setup**: Calls `await init_db()` to ensure SQLite tables (`downloads`, `download_history`, `settings`) and indexes exist.
2. **In-Flight State Reconciliation**:
   - Queries all records with `status == DownloadStatus.DOWNLOADING` that were left orphaned by a previous crash or unexpected shutdown.
   - Evaluates retry counts: if `retries >= max_retries`, transitions record to `FAILED` with an explicit reason (`"Download interrupted by system restart"`). Otherwise, safely rolls status back to `QUEUED` and resets `speed = 0`, `eta = 0`.
3. **Queue Pool Rehydration**:
   - Queries all `QUEUED` downloads ordered by priority and creation time (`Download.priority.desc(), Download.created_at.asc()`).
   - Re-enqueues each item into `queue_manager.add(q_dl.id, priority=q_dl.priority)` so interrupted tasks immediately resume executing without requiring manual user intervention.
4. **Stale Scratchpad Purging**:
   - Scans `settings.temp_dir` for orphaned chunk files (`*.tmp`, `*.part`, `*.ytdl`, or `_part_`).
   - Automatically purges files or directories with modification timestamps older than 24 hours (`now - 86400`).
5. **Persisted Configuration Restore**:
   - Reads user settings from the database (e.g. customized `download_dir` and `max_concurrent_downloads`).
   - Sanitizes and updates `settings.download_dir` and configures `queue_manager.max_concurrent`.
6. **Directory Verification**:
   - Validates that `settings.download_dir` and `settings.temp_dir` exist on disk, creating them if necessary.
7. **Scheduler Activation**:
   - Launches `queue_manager.start_scheduler()` as a background task (`asyncio.create_task`) polling every 5 seconds for scheduled downloads.
8. **Graceful Shutdown**:
   - Cancels the background scheduler task and stops scheduler polling.
   - Calls `await close_db()` to cleanly dispose of the async database engine pool.

**Middleware & Routing**:
- `CORSMiddleware`: Configured with `allow_origins=settings.cors_origins` and an explicit regex matching local dev ports (`localhost:3000`, `127.0.0.1:3000`) and browser extension schemes (`chrome-extension://.*`, `moz-extension://.*`).
- `SlowAPI`: Rate-limiting exception handler intercepting `RateLimitExceeded`.
- **WebSocket Endpoints**: Mounted at both `/ws/{client_id}` and `/api/ws/{client_id}` to support direct clients and reverse proxies.

---

### 5.2 Configuration & Settings Management (`backend/core/config.py`)
Uses `pydantic_settings.BaseSettings` with automatic `.env` reading:
- `download_dir`: Root folder where finished media is moved (default: `./downloads`).
- `temp_dir`: Scratch directory for ongoing byte chunks and intermediate streams (default: `./temp`).
- `max_file_size`: Maximum accepted download size (default: 10 GB).
- `max_concurrent_downloads`: Concurrency cap for simultaneous active download jobs (default: 2).
- `default_retries`: Number of automatic retries on transient connection failure (default: 3).
- `ffmpeg_path` & `ffprobe_path`: Binary executables for media operations (defaults to system `PATH`).
- `database_url`: Async SQLite connection string (`sqlite+aiosqlite:///./data/omnidownload.db`).
- `cors_origins`: Allowed origins list for REST/WS clients.
- `rate_limit_requests` & `rate_limit_window`: Rate limiter caps (default: 100 req / 60 sec).

---

### 5.3 Database Engine, Async Scoping & ORM Models
- **SQLite Engine Configuration (`backend/core/database.py`)**:
  - Uses `create_async_engine` with `sqlite+aiosqlite`.
  - Attaches an engine event listener on `connect`:
    ```python
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA busy_timeout=5000;")
    ```
  - Enables Write-Ahead Logging (WAL) for non-blocking concurrent reads during active background writes.
- **Async Scoped Sessions (`get_scoped_session()`)**:
  - Employs an async context manager that yields a dedicated `AsyncSession`, automatically committing on exit and rolling back on exceptions.
  - Implements automatic retry handling on `sqlite3.OperationalError: database is locked`, ensuring high-frequency progress ticks never crash the server.
- **`Download` (Table `downloads`)**: Represents active or recently queued download tasks.
  - Primary Key: `id` (VARCHAR 64 UUID).
  - Attributes: `url`, `source`, `title`, `filename`, `file_size`, `downloaded_size`, `format`, `format_id`, `extension`, `content_type` (`video`, `audio`, `image`, `document`, `archive`, `torrent`, `unknown`), `status` (`queued`, `scheduled`, `downloading`, `paused`, `completed`, `failed`, `cancelled`), `progress`, `speed`, `eta`, `priority`, `retries`, `max_retries`, `error`, `output_path`, `thumbnail`, `duration`, `metadata` (JSON Text), `scheduled_at`.
  - Indexes: `idx_downloads_status`, `idx_downloads_created_at`, `idx_downloads_source`.
- **`DownloadHistory` (Table `download_history`)**: Retains completed and historical download records.
  - Attributes: Mirror of `Download` entity with completion timestamps and final file sizes.
  - Indexes: `idx_history_created_at`, `idx_history_source`, `idx_history_status`.
- **`Settings` (Table `settings`)**: Key-value pair configuration table storing user overrides.

---

### 5.4 Pydantic Schemas & Data Contracts (`backend/models/schemas.py`)
All incoming payloads and outgoing API responses are strictly validated via Pydantic V2:
- `AnalyzeRequest` & `AnalyzeResponse`: Contains detected metadata, stream list (`FormatModel`), thumbnail, duration, available `subtitles: List[str]`, and `chapters: Optional[List[dict]]`.
- `PlaylistEntryModel` & `PlaylistAnalyzeResponse`: Contains playlist metadata (`id`, `title`, `uploader`, `entry_count`) and list of individual items (`PlaylistEntryModel`).
- `DownloadRequest`: Parameters specifying target URL, format ID, priority, audio-only flag, target audio format (`mp3`, `m4a`, `flac`, `opus`), audio bitrate, speed limits, scheduling (`scheduled_at`), time-range clipping (`start_time`, `end_time`), subtitle preferences (`subtitle_langs`, `embed_subtitles`), enhancements (`embed_chapters`, `sponsorblock_remove`), and destination `subfolder`.
- `BatchDownloadRequest`: Accepts an array of up to 50 URLs to be queued simultaneously, with optional shared format preferences and `subfolder`.
- `MediaProbeStream` & `MediaProbeResponse`: Telemetry payload exposing container format, video/audio codecs, resolution, framerate, and bitrate from FFprobe.
- `AnalyticsStatsResponse`: Aggregates total bytes, platform breakdowns (`SourceStat`), format statistics, and 30-day activity logs (`DailyActivity`).

---

### 5.5 Security Engine & SSRF Protection (`backend/core/security.py`)
Guarantees the host system cannot be weaponized or coerced into internal network reconnaissance:
- **`check_ssrf(url)`**: Resolves hostnames via `socket.getaddrinfo()` and rejects private, loopback, link-local, multicast, and reserved IPv4/IPv6 networks:
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `::1/128`, `fc00::/7`, `fe80::/10`.
- **`async_check_ssrf(url)`**: Non-blocking async wrapper delegating DNS resolution to event loop worker threads (`asyncio.to_thread`), preventing DNS resolution delays from blocking the primary async event loop during batch operations.
- **Redirect SSRF Event Hook**:
  - `_validate_redirect_ssrf(response)`: Intercepts HTTP 301/302 redirects in `SegmentedDownloader` and `GenericExtractor`, evaluating `async_check_ssrf` on the `Location` header before following redirect hops.
- **`validate_url(url)`**:
  - Enforces `http`, `https`, or valid `magnet:?xt=urn:btih:...` URIs.
  - Rejects URIs exceeding 2048 characters or matching localhost domains.
- **`sanitize_filename(name)`**: Strips path traversal characters (`..`, `/`, `\`), null bytes, and non-printable control symbols, restricting length to 255 characters.
- **`sanitize_folder_path(path)`**: Validates that target folders exist, avoids system roots, and normalizes paths.
- **`verify_api_key(request)`**: Validates incoming `X-API-Key` headers when `require_api_key` is enabled in settings.

---

### 5.6 Rate Limiting & Auth (`backend/core/limiter.py`)
- Derives client buckets from either:
  1. `X-API-Key` header or `?api_key=` query parameter.
  2. `Authorization: Bearer <token>` header.
  3. Client remote IP address (`get_remote_address`).
- Default limit: 120 requests/minute, customized on sensitive endpoints (e.g. `/api/analyze` capped at 60/minute).

---

### 5.7 Extractor Plugin System & 4K/8K DASH Parsing (`backend/extractors/`)
Implements an extensible plugin architecture centered on `BaseExtractor` and `ExtractorRegistry`:
- **`BaseExtractor` (`backend/extractors/base.py`)**:
  - Configures `yt_dlp.YoutubeDL` options with Node.js runtime bindings (`"js_runtimes": {"node": {}}`, `"remote_components": ["ejs:github"]`) to eliminate JS runtime deprecation warnings and unlock all YouTube formats.
  - **DASH 4K/8K Stream Parsing**:
    - Discovers video-only DASH formats (such as 1440p, 2160p 4K, 4320p 8K) where `vcodec != "none"` and `acodec == "none"`.
    - Correctly sets `is_video=True` and `is_audio=False` for video-only streams, preventing them from being filtered out.
    - Captures `filesize_approx` alongside `filesize` so estimated sizes for massive multi-gigabyte streams are displayed in format pickers.
    - Groups and deduplicates formats by resolution and extension, ensuring all available high-resolution options appear in the UI.
  - **Flat Playlist Ingestion (`extract_playlist`)**:
    - Executes `yt-dlp` non-blocking in `asyncio.to_thread` with `extract_flat="in_playlist"` and `playlistend=200`.
    - Quickly extracts lightweight entry metadata (id, title, duration, thumbnail, index) without triggering heavy media resolution for every item in large playlists.
- **`ExtractorRegistry`**:
  - Evaluates registered extractors in priority order:
    1. Specialized domain extractors (`YouTubeExtractor`, `RedditExtractor`, `TwitterExtractor`, `InstagramExtractor`, `FacebookExtractor`, `TikTokExtractor`, `SoundCloudExtractor`, `PinterestExtractor`, `VimeoExtractor`, `TeraboxExtractor`).
    2. Protocol-specific extractors (`HlsExtractor`, `TorrentExtractor`).
    3. Fallback engine (`GenericExtractor`).

---

### 5.8 Core Download Engine & Fragment-Aware Telemetry (`backend/download/engine.py`)
The `DownloadEngine` is an asynchronous runner managing active download tasks.

1. **`_download_ytdlp` Pipeline**:
   - **Format-Tagged Output Templates**:
     Uses `%(title)s [%(id)s] [%(format_tag)s].%(ext)s` to prevent quality upgrades from colliding with lower-quality files already on disk.
   - **Time-Range Clipping & Enhancements**:
     - When `start_time` or `end_time` is configured, parses into seconds via `parse_time_str`, validates bounds, and sets `download_ranges = yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)])` with `force_keyframes_at_cuts = True`.
     - Appends `_clip_{start}-{end}` to the format tag so clipped files never overwrite full videos.
     - When subtitles are requested (`subtitle_langs`), configures `writesubtitles: True`, `subtitleslangs`, `writeautomaticsub: True`, and `FFmpegEmbedSubtitle` postprocessor.
     - Supports `add_chapters = True` and SponsorBlock segment skipping (`sponsorblock_remove = ["sponsor", "selfpromo", "interaction"]`).
   - **Subfolder Isolation**:
     - When `subfolder` is specified in metadata, sanitizes the name with `sanitize_filename()` and routes the output file into `os.path.join(settings.download_dir, safe_subfolder)`, creating the folder if needed.
   - **Start Telemetry Broadcast**:
     - Immediately upon launching download workers, emits `start_msg` with `downloaded: 0`, `downloaded_size: 0`, `speed: 0`, and `eta: 0` to immediately flush any prior or retried run state from connected clients.
   - **Multi-Stream DASH Progress Scaling**:
     - Automatically flags multi-stream tasks whenever video DASH formats are paired with best audio (`is_multistream = True`).
     - Tracks downloaded streams sequentially via `seen_streams` list and per-stream dictionaries (`stream_totals`, `stream_downloaded`).
     - Stream 1 (Video) maps progression from `0.0% -> 85.0%`.
     - Stream 2 (Audio) maps progression from `85.0% -> 97.0%`.
     - Enforces strictly monotonic progress (`max(last_progress, scaled_progress)`), completely preventing progress bar regression when switching from video to audio passes.
   - **Per-Stream Cumulative Byte Accounting**:
     - Sums downloaded bytes across all completed and active streams (`last_total_downloaded = max(last_total_downloaded, sum(stream_downloaded.values()))`), preventing the second stream from resetting total transferred telemetry.
     - Computes combined total dynamically (`combined_total = max(sum(stream_totals.values()), last_total_downloaded, initial_file_size)`).
   - **Fragment-Aware Telemetry**:
     - Eliminates Fragment 0 spikes where initialization headers (712 bytes) previously reported 100%.
     - When `frag_count > 0` and `frag_index <= 0` or `None`, progress is held at `0.0%`.
     - Calculates progress across fragments as `round((frag_index / frag_count) * 100, 1)`.
     - Dynamically extrapolates stream totals when `total_bytes` is missing using fragment ratios (`raw_downloaded * (frag_count / frag_index)`).
     - Enforces `progress = min(progress, 98.0)` while `status == "downloading"`.
   - **`postprocessor_hooks`**:
     - Locks progress at `99.0%` and speed/ETA at `0` during FFmpeg multiplexing and container assembly.
     - Exactly `100.0%` is only broadcast when the download task completes, output files are verified on disk, and records register in `DownloadHistory`.
   - **Database Throttle & Live Telemetry**:
     - WebSockets are broadcast on every tick.
     - Database writes are throttled to 500ms intervals using `get_scoped_session()` and `_update_db_progress()` to eliminate lock contention.
   - **Audio Tagging**:
     - Automatically invokes `AudioTagger` upon completion if audio extraction is requested, gracefully handling metadata tagging without breaking download completion if external APIs are unreachable.

2. **`_download_generic` Pipeline**:
   - Resumable files are handed to `SegmentedDownloader`. Non-resumable files fall back to buffered `httpx.AsyncClient` streaming with redirect validation.

3. **`_download_hls` Pipeline**:
   - Asynchronous FFmpeg subprocess (`ffmpeg -i <m3u8> -c copy -bsf:a aac_adtstoasc <output>`) with stderr line parsing for progress.
   - Actively tracked in `self._active_processes[download_id]`.
   - Guaranteed cleanup in `finally` and on cancel/pause: attempts `proc.terminate()`, waits up to 2.0s, and falls back to `proc.kill()` to prevent zombie processes.

4. **`_download_torrent` Pipeline**:
   - Integrates with `Aria2Service` via JSON-RPC. Polls active seeders, speed, and downloaded length.

---

### 5.9 High-Speed Segmented Downloader (`backend/download/segmented.py`)
- Employs HTTP `Range: bytes=start-end` requests across 8–16 simultaneous TCP connections.
- Probes target URLs via `HEAD` and `GET (Range: bytes=0-0)` requests with `_validate_redirect_ssrf` event hooks.
- Allocates independent chunk files in `temp/<id>_part_<index>.tmp`.
- Aggregates real-time speed and downloaded byte counts across all worker tasks.
- Sequentially concatenates completed chunks into final destination files with zero memory exhaustion.
- On cancellation or error, guarantees scratch directory cleanup (`shutil.rmtree(temp_dir)`) in `finally` blocks.

---

### 5.10 Priority Queue & Scheduler (`backend/queue/manager.py`)
- **`DownloadQueue`**:
  - In-memory prioritized queue sorted by `(-priority, created_at)`.
  - Dispatches tasks up to `max_concurrent` (default: 2).
  - Employs `on_download_finished(id)` event hooks to automatically dequeue next pending tasks.
  - Rehydrated on cold boot by `main.py` lifespan manager.
- **Delayed Scheduler**:
  - Polls database every 5 seconds for downloads with `status == SCHEDULED` where `scheduled_at <= now()`.
  - Atomically promotes matching downloads to `QUEUED` and triggers engine execution.

---

### 5.11 Post-Processing Services (`backend/services/`)
- **`FFmpegService` (`backend/services/ffmpeg.py`)**:
  - Non-blocking wrapper around `ffmpeg` and `ffprobe`.
  - `probe(file_path)`: Runs `ffprobe -v quiet -print_format json -show_format -show_streams` to return media container metadata, video/audio stream codecs, resolution, framerate, and bitrate telemetry.
  - Extracts duration, codecs, bitrate, width, height, and audio channels.
  - Executes container remuxing and video audio multiplexing.
- **`AudioTagger` (`backend/services/tagger.py`)**:
  - Regex-based title cleaner removing junk strings like `[Official 4K Video]`, `(Remastered)`, `[Lyrics]`.
  - Queries MusicBrainz Web API (`musicbrainz.org/ws/v2/recording`) to retrieve canonical Artist, Title, Album, and Release Date.
  - Writes metadata and downloads/embeds album art covers using `mutagen.id3` (MP3), `mutagen.mp4` (M4A/AAC), `mutagen.flac` (FLAC), and `mutagen.oggopus` (Opus).
- **`Aria2Service` (`backend/services/aria2.py`)**:
  - Locates or launches an `aria2c` daemon (`aria2c --enable-rpc --rpc-listen-port=6800`).
  - Provides async JSON-RPC client wrappers for adding torrents, monitoring download status, and terminating transfers.

---

### 5.12 Real-Time WebSocket Telemetry (`backend/api/websocket.py`)
- **`ConnectionManager`**:
  - Maintains connected clients (`active_connections`).
  - Tracks specific download subscriptions (`download_subscriptions[download_id]`).
  - Caches latest progress in `self.last_progress: Dict[str, dict]`.
  - **Snapshot Replay on Subscribe**: When a client calls `subscribe_to_download`, immediately transmits the cached `last_progress` packet to eliminate race conditions for sub-500ms downloads.
  - **Global Broadcast on Terminal/Paused Events**: Broadcasts `completed`, `failed`, `cancelled`, and `paused` states globally to keep all UI tabs synchronized.
  - **State Eviction**: Automatically removes entries from `last_progress` on terminal completion or cancellation.

---

## 6. Complete REST & WebSocket API Specification

Base URL: `http://localhost:8000/api`

| Method | Endpoint | Description | Request Body / Query Params | Response Type |
|---|---|---|---|---|
| **POST** | `/analyze` | Analyze media URL, extract metadata, preview, and format streams | `{"url": "string"}` | `AnalyzeResponse` |
| **POST** | `/analyze-playlist` | Extract metadata and individual entries for playlists/albums (up to 200 items) | `{"url": "string"}` | `PlaylistAnalyzeResponse` |
| **POST** | `/download` | Queue a single download with format, audio extraction, clipping, or schedule | `DownloadRequest` (JSON) | `DownloadResponse` |
| **POST** | `/batch-download` | Concurrently validate and queue multiple URLs (up to 50) | `BatchDownloadRequest` (JSON) | `BatchDownloadResponse` |
| **GET** | `/download/{download_id}` | Retrieve real-time status and metadata of a specific download | `download_id` (path) | `DownloadInfo` |
| **POST** | `/download/{download_id}/pause` | Pause an active download task | `download_id` (path) | `{"message": "Download paused"}` |
| **POST** | `/download/{download_id}/resume` | Resume a paused or stopped download | `download_id` (path) | `{"message": "Download resumed"}` |
| **POST** | `/download/{download_id}/cancel` | Cancel an active download and clean up temp files | `download_id` (path) | `{"message": "Download cancelled"}` |
| **DELETE** | `/download/{download_id}` | Delete a download entry from active queue | `download_id` (path) | `{"message": "Download deleted"}` |
| **POST** | `/download/{download_id}/retry` | Retry a failed download task | `download_id` (path) | `{"message": "Download retried"}` |
| **GET** | `/queue` | Get live queue snapshot (active, queued, completed, failed counts) | None | `QueueStatus` |
| **GET** | `/history` | Query download history with search, sorting, and pagination | `?search=&status=&source=&sort_by=&order=&limit=&offset=` | `List[HistoryItem]` |
| **DELETE** | `/history` | Clear all historical records | None | `{"message": "History cleared"}` |
| **GET** | `/history/export` | Export download history as CSV or JSON file | `?format=json` or `?format=csv` | File attachment stream |
| **POST** | `/history/import` | Import download history from JSON payload | `[HistoryItem, ...]` (JSON) | `{"message": "History imported", "imported_count": N}` |
| **GET** | `/analytics/stats` | Retrieve aggregated analytics, bandwidth metrics, daily activity | None | `AnalyticsStatsResponse` |
| **GET** | `/settings` | Retrieve active application settings | None | `SettingsModel` |
| **PUT** | `/settings` | Update application configuration | `SettingsUpdate` (JSON) | `SettingsModel` |
| **POST** | `/settings/api-key/generate` | Generate a new random API key | None | `ApiKeyGenerateResponse` |
| **DELETE** | `/settings/api-key` | Revoke active API key | None | `{"message": "API key revoked"}` |
| **GET** | `/settings/cookies` | Check status, size, and line count of active `cookies.txt` | None | `CookieStatusResponse` |
| **POST** | `/settings/cookies` | Upload or update Netscape `cookies.txt` for authenticated sites | File upload or Raw text payload | `{"message": "Cookies saved"}` |
| **DELETE** | `/settings/cookies` | Delete stored `cookies.txt` file | None | `{"message": "Cookies deleted"}` |
| **GET** | `/extractors` | List all active extractor engines, domains, and supported formats | None | `List[Extractor]` |
| **GET** | `/download/{download_id}/file` | Stream or download the completed file directly from backend | `download_id` (path) | `FileResponse` |
| **GET** | `/download/{download_id}/stream` | Stream completed media with HTTP 206 Partial Content Range byte seeking | `download_id` (path), `Range` header | `StreamingResponse` |
| **GET** | `/download/{download_id}/probe` | Extract audio/video stream codecs, resolution, and bitrate via FFprobe | `download_id` (path) | `{"streams": [...], "format": {...}}` |
| **POST** | `/open-folder` | Open storage directory in native OS file explorer | `{"folder_path": "string"}` (optional) | `{"success": true, "path": "string"}` |
| **POST** | `/download/{download_id}/open-folder` | Open OS file explorer highlighted directly on the target file | `download_id` (path) | `{"success": true, "path": "string"}` |
| **GET** | `/system/aria2-status` | Probe aria2 daemon status and installed version | None | `{"installed": bool, "running": bool, ...}` |
| **POST** | `/torrent/upload` | Upload `.torrent` file for metadata extraction and download | Multipart File upload (`file`) | `AnalyzeResponse` |
| **WS** | `/ws/{client_id}` | WebSocket stream for real-time progress events | Subscriptions via JSON | WebSocket JSON stream |
| **WS** | `/api/ws/{client_id}` | Alternate WebSocket route for proxy compatibility | Subscriptions via JSON | WebSocket JSON stream |
| **GET** | `/health` | Health check probe | None | `{"status": "ok", "version": "1.0.0"}` |
| **GET** | `/` | Root server status and documentation pointers | None | `{"name": "...", "version": "...", ...}` |

---

## 7. Frontend Architecture Deep-Dive

### 7.1 Design System & Aesthetic Principles
The frontend is built using a hardware-inspired **Liquid Glass iOS & Cybernetic HUD** design system:
- **Flagship Theme (Liquid Glass iOS — White Glassmorphism)**: Inspired by [`LiquidGlassKit`](https://github.com/muhittincamdali/LiquidGlassKit) by Muhittin Çamdallı, this flagship preset models Apple iOS / visionOS frosted translucent white glass (`rgba(255, 255, 255, 0.20) → rgba(255, 255, 255, 0.08)`) with multi-pass optical backdrop blur (`blur(32px) saturate(210%)`), crisp white top specular edge illumination (`1.5px solid rgba(255, 255, 255, 0.80)`), inner specular reflection (`inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.60)`), Apple Electric Azure primary accents (`#0A84FF`), VisionOS Violet secondary accents (`#5E5CE6`), and iOS Hyper-Spring Mint velocity indicators (`#30D158`).
- **5 Switchable Theme Presets**: Managed via `data-theme` attribute on `document.documentElement`, tracked reactively across components via `useOmniTheme()`, and persisted in `localStorage` (`omni-color-theme` with automatic v2 migration):
  1. **`liquid` (Default Flagship — Liquid Glass iOS)**: Frosted translucent white glass surfaces floating above a deep cosmic sapphire wallpaper base (`#080B14`) with vivid ambient aurora scatter.
  2. **`solaris` (Solaris Carbon)**: Hardware aerospace OLED carbon (`#09090B`) with international orange (`#FF5E1A`) & hyper-mint telemetry.
  3. **`matrix` (Acid Matrix)**: High-tech cyberpunk terminal with acid neon green (`#00FF87`), cyber lime, and cyan accents.
  4. **`crimson` (Crimson Overdrive)**: Deep obsidian red with hot rose (`#F43F5E`), hyperdrive coral, and plasma blue accents.
  5. **`daylight` (Titanium Daylight)**: High-contrast frosted daylight mode (`#F4F5F7` base, `#FFFFFF` surfaces, crisp typography).
- **Atmospheric Foundation & Utilities**:
  - Subtle SVG noise overlay texture (`.bg-noise`).
  - Ambient aurora mesh background glow (`.bg-ambient-aurora`) casting Apple Azure, Violet, and Mint refraction through white glass sheets.
  - Specular glass utilities (`.liquid-glass-card`, `.liquid-glass-pill`, `.liquid-glass-header`, `.liquid-glass-input`, `.liquid-glass-btn`, and `.omni-glass-card`) featuring top-edge prism strokes, inner specular bevels, and tactile press scaling.
- **Hardware Progress & Animations**:
  - `animate-shimmer-fast`: Diagonal specular light sweep across active progress bars.
  - `animate-mux-pulse`: Golden harmonic wave animation specifically for the `99%` FFmpeg stream muxing state.
  - `animate-spring-up`: Smooth elastic entry curve (`cubic-bezier(0.22, 1, 0.36, 1)`).
  - `animate-shockwave`: Radial ripple border glow when URLs are pasted or analyzed.
  - 16-Segment micro-LED hardware array illuminating sequentially beneath active progress tracks.
- **Typography & Telemetry**: Inter and Outfit modern sans typography with high-contrast monospace tabular numerals (`font-mono tabular-nums`) inside anodized pill containers.

---

### 7.2 Routing & Pages Breakdown (`frontend/src/app/`)
- **`app/page.tsx`**:
  - The application's command center, wrapped universally in `AppShell`.
  - Supports dual view modes:
    1. **Overview Mode (`view=landing` or `/`)**: Renders the unified product landing page featuring the Hero with Fast-Path URL Downlink, embedded interactive 3D Acceleration Engine Stage, Features Architecture Bento Grid, Supported Platforms Matrix, Comparison Table, and CTA strip, concluding with the standard global footer.
    2. **Console Mode (`view=console`)**: Renders the Downloader Workspace Console (`UrlAnalyzer`, `DownloadQueue`, stats, sites) with a clean `[ Overview | Console ]` view switcher in the header.
- **`app/landing/page.tsx`**: Dedicated full-page route for the Overview experience, wrapped in `AppShell activeTab="overview"`.
- **`app/queue/page.tsx`**: Dedicated queue monitor tracking active pipelines, chunk buffers, and worker concurrency.
- **`app/history/page.tsx`**: Searchable and filterable history table with one-click re-download, copy URL, folder reveal, and CSV/JSON export/import.
- **`app/dashboard/page.tsx`**: Rich telemetry dashboard with daily download charts, source breakdown badges, bandwidth counters, and success rate meters.
- **`app/sites/page.tsx`**: Catalog of supported platforms detailing 4K/8K, DASH muxing, HLS, and cloud storage features.
- **`app/settings/page.tsx`**: Tabbed settings manager for directories, concurrency limits, speed limits, `cookies.txt` upload, aria2 integration, and theme toggling.
- **`app/about/page.tsx`**: Architecture documentation, technology breakdown, and license details.

---

### 7.3 Component Hierarchy & Interactive Engines
- **`UrlAnalyzer.tsx`**:
  - Multi-mode input: Single URL, multi-line batch (up to 50 URLs), or `.torrent` drag-and-drop.
  - Automatic clipboard URL detection on focus, plus global window `Ctrl+V` / `Cmd+V` paste listener with `animate-shockwave` ripple border glow.
  - Intelligent real-time platform detection showing animated badges for YouTube, Reddit, Instagram, Twitter/X, TikTok, SoundCloud, TeraBox, Pinterest, BitTorrent, HLS/DASH streams, and Generic Media.
  - Format selection modal: Displays stream resolutions (up to 4K/8K), audio bitrates, and combined video+audio estimated file sizes with `.omni-glass-card` elevation.
  - **Collapsible "Clip & Enhancements" HUD**: Time-range trimmer with chapter pill triggers, subtitle multi-select, and SponsorBlock removal toggle.
  - **Playlist Ingestion Modal**: Detects playlist URLs (`list=`, `/playlist`, `/sets/`), extracts flat items, provides item checkboxes with select/deselect all, and "Save inside `<Playlist Title>` subfolder" option.
  - Direct audio extraction selector: Converts videos to MP3/M4A/FLAC/Opus with selectable bitrates (`320k`, `256k`, `192k`, `128k`).
  - Scheduling modal: Schedules downloads for now, +1 hour, +3 hours, midnight, or custom date/time.
  - Auto-ingestion on mount from URL search parameters (`?view=console&url=...`) from the landing hero.
- **`DownloadQueue.tsx`**:
  - Live progress cards showing percentage, downloaded/total size, velocity (MB/s), and ETA.
  - Multi-stop gradient progress bar with `animate-shimmer-fast` specular light sweep and 16-segment micro-LED hardware array.
  - Laser Amber-Gold post-processing animation (`animate-mux-pulse`) with `"⚡ MUXING AUDIO & VIDEO STREAMS (99%)"` indicator during FFmpeg stream multiplexing.
  - Interactive buttons for Play / Preview (`CyberneticMediaPlayer`), Pause, Resume, Cancel, Retry, Delete, Copy URL, and Reveal in Native File Explorer.
  - Mouse-tracking radial spotlight border highlights (`--mouse-x`, `--mouse-y`) across all card frames.
- **`CyberneticMediaPlayer.tsx`**:
  - Glassmorphic media player dialog for completed video and audio downloads.
  - Uses HTTP Range streaming (`/api/download/{id}/stream`) for instant seeking across multi-gigabyte files.
  - Displays live codec, resolution, and bitrate telemetry pills fetched from `/api/download/{id}/probe`.
  - Quick action buttons to copy absolute file path or reveal the file directly in native OS file explorer.
- **`EngineDeconstructionLanding.tsx`**:
  - Comprehensive, multi-section product landing page seamlessly integrated inside `AppShell`.
  - **Hero & Fast-Path Downlink**: Mammoth typography, functional URL analyzer bar with instant analysis, and hardware telemetry pills.
  - **Interactive 3D Engine Stage**: Embedded responsive canvas viewport rendering 150 interpolated frames across 5 acceleration milestones (`01 Assembled`, `02 Segmented Turbo`, `03 Stream Silicon`, `04 Protocol Fabric`, `05 Max Velocity`) with interactive slider, milestone tabs, and auto-play toggle.
  - **Dynamic Theme Synchronisation**: Canvas stroke colors, reticles, and scanning sweep lines dynamically adapt to Solaris, Matrix, Crimson, and Daylight palettes via `MutationObserver` on `document.documentElement`.
  - **Feature Architecture Bento Grid**: 6 cybernetic cards detailing 4K/8K DASH merging, segmented HTTP chunking, audio tagging, in-browser media seeking, playlist ingestion, and SSRF security.
  - **Supported Platforms Matrix & Comparison Table**: Interactive platform tags and transparent traditional vs OmniDownloader comparison.
- **`AppShell.tsx`**:
  - Universal shell wrapping ALL routes with a persistent floating HUD navigation bar, mobile drawer, and standardized multi-column footer.
  - Dynamic route matching via `isItemActive(item)` supporting `activeTab` overrides and query-param detection (`/?view=console`).
  - Houses the brand mark with animated pulse, quick navigation links with active glow pills, `Ctrl+K` command trigger, `ThemeSwitcher` popover, and `BrowserExtensionModal`.
- **`CommandPalette.tsx`**:
  - Universal `Ctrl+K` / `Cmd+K` command search palette modal.
  - Instant navigation across pages (`Overview & 3D Acceleration Core`, `Downloader Workspace Console`, `Queue`, `History`, `Analytics`, `Sites`, `Settings`, `About`).
  - Quick action shortcuts (Clear History, Export History CSV/JSON, Check Health, Toggle Extension Modal).
  - Fast-path URL detection: typing or pasting any URL or magnet URI allows single-keystroke download dispatch (`Enter to analyze & download`).
  - Interactive theme selector pills for rapid switching between all 4 color presets.
- **`ThemeSwitcher.tsx`**:
  - Luxury dynamic theme popover with live hex swatches, active state checkmarks, and flagship badges.
  - Dynamically switches and applies the 4 design system palettes (`solaris`, `matrix`, `crimson`, `daylight`) to `document.documentElement.dataset.theme`.
  - Persists preference in `localStorage` under `omni-color-theme` and coordinates seamless color variable updates across canvas engines and UI cards.

---

### 7.4 Client State Management & Persistence (`frontend/src/hooks/useStore.ts`)
Built with Zustand and `persist` middleware (synchronized to `localStorage` under key `omnidownload-store`):
- `settings: Settings | null`: Cached user preferences.
- `history: HistoryItem[]`: Cached historical records (up to 100 entries persisted via `partialize`).
- `queue: DownloadInfo[]`: In-memory active queue (strictly excluded from `localStorage` persistence via `partialize` to eliminate ghosting of completed/stale downloads).
- `useStoreHydration()`: React hook verifying client hydration state before rendering local-storage dependent elements.

---

### 7.5 Frontend Progress Synchronization & Clamping (`frontend/src/components/download/DownloadQueue.tsx`)
- **WebSocket OnMessage Handler**:
  - Clamps incoming progress during `downloading` status to `[0, 98.9]` while downloading, allowing exact `99%` during FFmpeg muxing (detected via `progress >= 99 && speed === 0`).
  - Sets exact `100%` when `status === "completed"`.
  - Preserves `existing.progress` and `existing.downloaded_size` on `paused` or `failed` packets.
  - Zeroes speed and ETA immediately during post-processing (99%) or terminal states (`paused`, `failed`, `completed`).
  - **Stale Size Protection**: If `existing.downloaded_size >= existing.file_size` while the item is actively downloading (`nextProgress < 98%`), discards the stale 100% size to prevent progress pinning.
  - **Live Byte Interpolation**: If raw byte telemetry is omitted during fragment/HLS downloads (`nextDownloadedSize === 0`), accurately interpolates live bytes as `Math.round((nextProgress / 100) * nextFileSize)`.
- **Database Fallback Polling (`loadQueue`)**:
  - Safely merges server polling data with live WebSocket progress every 3 seconds.
  - Applies identical stale-size discard and byte interpolation guards so polling snapshots cannot freeze or regress live UI numbers.
- **UI Progress Bar & Percentage**:
  - Clamps visual progress to `Math.min(99, Math.round(download.progress))` while status is `downloading`.
  - Progress bar renders gradient animation during active download and transitions to solid completed state only when finished.

---

### 7.6 API Client & WebSocket Consumer (`frontend/src/services/api.ts`)
- Encapsulates Axios HTTP requests with automatic `X-API-Key` header injection from `localStorage`.
- Establishes resilient WebSocket connections with automatic exponential backoff reconnection.
- Maintains `subscribedIds: Set<string>` to automatically re-transmit subscription messages for all active downloads upon WebSocket reconnect (`ws.onopen`).
- Maps incoming packets to registered UI progress callbacks via `progressCallbacks: Map<string, (progress) => void>`.

---

## 8. Browser Extension (Manifest V3)

Located in `browser-extension/`:
- **`manifest.json`**: Manifest V3 extension configuration with permissions: `contextMenus`, `activeTab`, `scripting`, `storage`, `cookies`, `webRequest`.
- **`background.js`**:
  - **Stream Sniffer**: Uses `chrome.webRequest.onBeforeRequest` to capture `.m3u8` (HLS) and `.mpd` (DASH) stream manifests on the fly.
  - Caches up to 10 latest streams per tab in `chrome.storage.session` (with in-memory fallback) and updates the extension action badge count.
  - Enriches stream entries with request headers (`User-Agent`, `Referer`, `Origin`) via `chrome.webRequest.onSendHeaders`.
  - Creates context menu items ("Download with OmniDownload").
- **`content.js` & `content.css`**:
  - Injected into web pages to detect video elements (`<video>`, `<audio>`).
  - Overlays a sleek floating "Download with OmniDownload" badge directly on detected media players.
- **`popup.html` & `popup.js`**:
  - Displays current backend health status and active page media analysis.
  - **1-Click Cookie Sync**: Reads active tab domain cookies via `chrome.cookies.getAll`, formats them into standard Netscape `cookies.txt` syntax, and POSTs directly to `/api/settings/cookies`.
  - **Sniffed Stream Downloader**: Displays detected streams with stream type pills (HLS/DASH) and 1-click "⬇ Video" and "🎵 Audio" download buttons.
- **`icons/`**: Standard extension icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`).

---

## 9. Automated Test Suite & Quality Assurance

The project includes an automated test suite executed via `pytest` and `pytest-asyncio`.

### Test Architecture (`tests/conftest.py`):
- Sets up an in-memory SQLite database (`sqlite+aiosqlite:///:memory:`) for test isolation.
- Defines an asynchronous event loop fixture for async test cases.
- Provides `mock_yt_dlp` monkeypatch fixtures for offline extractor validation.

### Test Coverage Summary (94 Tests Passing):
1. **`test_security.py` (29 tests)**: Validates SSRF defenses, private IP bans, loopback filtering, URI scheme restrictions, path traversal attempts, and filename sanitization.
2. **`test_extractors.py` (18 tests)**: Tests URL domain pattern matching, metadata parsing across YouTube, Reddit, Twitter, Instagram, Facebook, generic links, DASH combined audio/video size estimation, and flat playlist extraction.
3. **`test_tagger.py` (15 tests)**: Verifies bracketed noise removal, artist/title separation, and ID3 tag formatting.
4. **`test_engine.py` (11 tests)**: Verifies download engine dispatch, pause, resume, cancel, callback mechanisms, monotonic progress updates, multi-stream yt-dlp hook handling, time string parsing, and clipping/enhancement options.
5. **`test_api_endpoints.py` (5 tests)**: Validates playlist SSRF rejection, playlist metadata response structure, download probe 404s, and HTTP 206 Partial Content Range byte streaming.
6. **`test_queue.py` (6 tests)**: Validates priority sorting, concurrency limits, and scheduled task promotion.
7. **`test_torrent.py` (6 tests)**: Validates `.torrent` metadata extraction and magnet link validation.
8. **`test_segmented.py` (4 tests)**: Verifies range request detection, byte chunk allocation, and probe handling.

To run the test suite:
```powershell
.\backend\venv\Scripts\python.exe -m pytest -v
```

---

## 10. Configuration & Environment Reference

All configuration keys can be specified in `.env` at the root directory or in `backend/.env`:

| Variable | Type | Default Value | Description |
|---|---|---|---|
| `APP_NAME` | string | `OmniDownload` | Name displayed in headers, logs, and Swagger docs |
| `APP_VERSION` | string | `1.0.0` | Semantic version string |
| `DEBUG` | boolean | `false` | Enables verbose SQL logging and stack traces |
| `HOST` | string | `0.0.0.0` | Server host binding address |
| `PORT` | integer | `8000` | Server port binding |
| `DOWNLOAD_DIR` | string | `./downloads` | Directory where completed downloads are saved |
| `TEMP_DIR` | string | `./temp` | Scratchpad directory for chunks and muxing |
| `MAX_FILE_SIZE` | integer | `10737418240` (10 GB) | Maximum file size allowed in bytes |
| `MAX_CONCURRENT_DOWNLOADS` | integer | `2` | Number of simultaneous download workers |
| `DEFAULT_RETRIES` | integer | `3` | Retry attempts on transient network failure |
| `REQUEST_TIMEOUT` | integer | `30` | Network request timeout in seconds |
| `FFMPEG_PATH` | string | `ffmpeg` | Path or command name for FFmpeg binary |
| `FFPROBE_PATH` | string | `ffprobe` | Path or command name for FFprobe binary |
| `DATABASE_URL` | string | `sqlite+aiosqlite:///./data/omnidownload.db` | SQLAlchemy async connection string |
| `CORS_ORIGINS` | list | `["http://localhost:3000","http://127.0.0.1:3000"]` | Allowed CORS origins for browser security |
| `RATE_LIMIT_REQUESTS` | integer | `100` | Rate limiter allowed requests |
| `RATE_LIMIT_WINDOW` | integer | `60` | Rate limiter window in seconds |
| `USER_AGENT` | string | Chrome 124 Spoof String | User-Agent used by scrapers and HTTP clients |

---

## 11. Execution & Deployment Runbook

### Option 1: Unified Console Runner (Recommended for Local Dev)
Streams colored logs from both the backend (`[BACKEND]`) and frontend (`[FRONTEND]`) into a single terminal window, with clean shutdown on `Ctrl+C`:
```bash
python start.py
```

### Option 2: PowerShell Multi-Window Launcher
Launches backend and frontend in separate PowerShell windows:
```powershell
.\start.ps1
```
*(If execution policy restricts scripts: `powershell -ExecutionPolicy Bypass -File .\start.ps1`)*

### Option 3: Windows Batch File
Double-click `start.bat` in Windows File Explorer or execute from CMD:
```cmd
start.bat
```

### Option 4: Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# View container logs
docker-compose logs -f

# Terminate services
docker-compose down
```

### Service Endpoints:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Docs (Swagger)**: `http://localhost:8000/docs`
- **Backend Health Check**: `http://localhost:8000/health`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/{client_id}`

---

## 12. Developer & AI Agent Extension Guide (How-To Cookbooks)

### Cookbook A: How to Add a New Site Extractor
To add support for a new platform (e.g., Dailymotion):
1. **Create Extractor Class** in `backend/extractors/dailymotion.py`:
   ```python
   import asyncio
   from extractors.base import BaseExtractor, VideoInfo
   from models.schemas import ContentType
   
   class DailymotionExtractor(BaseExtractor):
       name = "dailymotion"
       domains = ["dailymotion.com", "dai.ly"]
       
       def supports(self, url: str) -> bool:
           return self.matches_domain(url)
           
       async def _extract_info(self, url: str) -> VideoInfo:
           ydl = self._create_ydl()
           data = await asyncio.to_thread(ydl.extract_info, url, download=False)
           formats = self._parse_formats(data.get("formats", []))
           return VideoInfo(
               id=data["id"],
               title=data.get("title", "Dailymotion Video"),
               thumbnail=data.get("thumbnail"),
               duration=data.get("duration"),
               formats=formats,
               source=self.name,
               content_type=ContentType.VIDEO,
           )
   ```
2. **Register Extractor** in `backend/extractors/__init__.py`:
   ```python
   from extractors.dailymotion import DailymotionExtractor
   ExtractorRegistry.register(DailymotionExtractor())
   ```
3. **Add Automated Test** in `tests/test_extractors.py`:
   ```python
   def test_dailymotion_extractor_supports():
       extractor = ExtractorRegistry.get_extractor("https://www.dailymotion.com/video/x7tgad0")
       assert extractor is not None
       assert extractor.name == "dailymotion"
   ```

### Cookbook B: How to Add a New API Route
1. Define endpoint in `backend/api/routes.py`:
   ```python
   @router.post("/custom-action", tags=["Downloads"])
   @limiter.limit("30/minute")
   async def custom_action(req: CustomRequest, request: Request, response: Response):
       return {"success": True}
   ```
2. Update frontend API service in `frontend/src/services/api.ts`:
   ```typescript
   async customAction(data: CustomRequest): Promise<CustomResponse> {
     const response = await this.client.post<CustomResponse>("/custom-action", data)
     return response.data
   }
   ```

### Cookbook C: Safety Rules for AI Agents
- **Never bypass `check_ssrf(url)` or `async_check_ssrf(url)`**: Any network call with a user-supplied URL must undergo SSRF verification before network transmission.
- **Never perform raw string path joins for user filenames**: Always pass filenames through `sanitize_filename()` before saving to `download_dir` or `temp_dir`.
- **Always update both Database and WebSockets**: When updating a download's status in `DownloadEngine`, write changes using `get_scoped_session()` and broadcast the corresponding update via `ConnectionManager.send_progress` and `ConnectionManager.broadcast`.
- **Preserve async concurrency**: Use `asyncio.to_thread` for blocking CPU, DNS, or synchronous subprocess calls so the FastAPI async loop remains non-blocking.

---

## 13. Known Edge Cases & Architectural Gotchas Solved

### 13.1 YouTube Fragment 0 Initialization Spike
- **Symptom**: In fragmented DASH downloads (like 4K YouTube videos), the UI progress bar instantly leaped to 100% and froze solid while downloading gigabytes.
- **Root Cause**: On the initialization header (fragment 0 of 511), `yt-dlp` reported `downloaded_bytes = 712` and `total_bytes_estimate = 712`. The formula `(712 / 712) * 100` yielded 100.0%. The frontend's monotonic `Math.max` locked onto 100%.
- **Solution**:
  - Fragment 0 is held at `0.0%`.
  - Progress is calculated using fragment progression `(frag_index / frag_count) * 100`.
  - Downloading status is capped at 99.0% until actual completion.
  - The frontend discards `>= 99%` values during active download status.

---

### 13.2 Missing 4K/8K Options in Format Picker
- **Symptom**: Videos with 4K or 8K options only displayed up to 1080p in the format picker.
- **Root Cause**: High-resolution YouTube streams are video-only DASH formats (`acodec == "none"`). The parser was discarding them or failing to recognize their resolution.
- **Solution**:
  - Rewrote `_parse_formats` in `backend/extractors/base.py` to correctly extract DASH video streams, parse `filesize_approx`, and map them to standard video format models.
  - Bound Node.js JS runtime and EJS components to satisfy YouTube's cipher solving requirements.

---

### 13.3 File Skip on Format Upgrade (Format Tagging)
- **Symptom**: Downloading a 4K video after previously downloading a 720p version of the same video was skipped immediately by `yt-dlp`.
- **Root Cause**: Output template was `%(title)s [%(id)s].%(ext)s`. Because the file existed, `yt-dlp` skipped the download without re-downloading the requested 4K format.
- **Solution**:
  - Included the format tag in the filename: `%(title)s [%(id)s] [%(format_tag)s].%(ext)s`.

---

### 13.4 SQLite Concurrency & Database Locks (WAL Mode & Retry Scopes)
- **Symptom**: `sqlite3.OperationalError: database is locked` during rapid WebSocket updates or concurrent batch queue imports.
- **Root Cause**: Default SQLite rollback journal mode locks the entire file during write operations; long-lived sessions cause contention.
- **Solution**:
  - Attached a listener on `engine.sync_engine` to enforce `PRAGMA journal_mode=WAL;`, `PRAGMA synchronous=NORMAL;`, and `PRAGMA busy_timeout=5000;` on all new connections.
  - Implemented `get_scoped_session()` context manager in `backend/core/database.py` with automatic retry on locked tables.
  - Throttled database progress writes to 500ms intervals while streaming live WebSockets in real-time.

---

### 13.5 Dual-Stream (Video + Audio) DASH Progress Reset & Size Telemetry
- **Symptom**: In multi-stream DASH downloads (e.g. YouTube 1080p/4K video + audio), downloaded size exceeded total size (e.g. `219.68 MB / 2.88 MB`), downloaded size dropped when audio stream started (e.g. `2.9 GB` to `29.44 MB`), progress froze at `85%` with stale speed/ETA during FFmpeg muxing, and polled DB snapshots caused rubber-banding.
- **Root Cause**:
  1. `_parse_formats` in `backend/extractors/base.py` set video DASH stream `filesize` without adding the separate audio stream size, or fell back to audio format size (`2.88 MB`).
  2. `yt-dlp` resets `downloaded_bytes` per stream pass; global `known_total` from the video stream bled into the audio pass, squashing audio progress to ~1.35% and freezing progress at `85%`.
  3. `postprocessor_hooks` emitted `progress = 99.0` with `speed = 0`, but the frontend discarded `>= 99%` while `status === "downloading"`, and the backend failed to update SQLite, allowing polling to revert state to the last video tick.
- **Solution**:
  - In `backend/extractors/base.py`, pre-computed `best_audio_size` and combined it with video DASH stream estimates (`video_size + best_audio_size`), leaving `None` if video size is unknown.
  - In `backend/download/engine.py` (`_download_ytdlp`), implemented scoped per-stream tracking (`stream_totals`, `stream_downloaded`) so audio progress calculates cleanly against its own stream total (`85%–97%`), and accumulated cumulative downloaded bytes across all finished streams.
  - Dynamically broadcast `combined_total` and throttled SQLite writes via `_update_db_progress`, enforcing monotonic `downloaded_size` and `file_size` growth.
  - In `postprocessor_hook`, updated both WebSocket and SQLite with `progress = 99.0`, `speed = 0`, `eta = 0`.
  - In `frontend/src/components/download/DownloadQueue.tsx`, allowed `99%` during post-processing (`speed === 0`), enforced monotonic `downloaded_size` clamping, dynamically expanded `file_size`, and protected live WebSocket state during `/api/queue` merges.

---

### 13.6 DNS Rebinding & Open Redirect SSRF Guard
- **Symptom**: Initial URL validation passed, but target servers performing HTTP 301/302 redirects could point to private/loopback network targets (`127.0.0.1`, `169.254.169.254`).
- **Root Cause**: `check_ssrf(url)` was only called once on the input URL before client request dispatch.
- **Solution**:
  - Attached an `event_hooks={"response": [_validate_redirect_ssrf]}` hook to `httpx.AsyncClient` in `SegmentedDownloader` and `GenericExtractor`.
  - Re-evaluates `check_ssrf()` on `response.headers["location"]` for all redirect hops, blocking TOCTOU SSRF attacks.

---

### 13.7 Startup State Reconciliation & In-flight Orphan Purging
- **Symptom**: Server crashes or manual shutdowns left downloads permanently stuck in `downloading` status, and orphaned chunk files (`*_part_*.tmp`, `.part`, `.ytdl`) accumulated on disk.
- **Root Cause**: In-flight downloads were not reconciled upon application boot; cancelled segmented downloads failed to remove unstitched chunks.
- **Solution**:
  - In `backend/main.py` lifespan startup, queried all `DOWNLOADING` downloads and reset them to `QUEUED` (or `FAILED` if max retries exceeded).
  - Added an automated startup cleaner scanning `settings.temp_dir` to delete stale temporary files older than 24 hours.
  - Wrapped `SegmentedDownloader.download()` in `try ... finally` blocks to ensure `shutil.rmtree(temp_dir)` runs on cancellation or failure.

---

### 13.8 WebSocket Subscription Race Condition & Fast Completion Snapshot Replay
- **Symptom**: Downloads completing in <500ms completed before the frontend finished receiving the download ID and sending `{"type": "subscribe"}`.
- **Root Cause**: The terminal WebSocket packet was broadcast before the subscription existed on the connection.
- **Solution**:
  - Added `self.last_progress` caching to `ConnectionManager`.
  - Replayed the latest state snapshot immediately upon client subscription (`subscribe_to_download`).
  - Broadcast all terminal states (`completed`, `failed`, `cancelled`, `paused`) globally to all connected clients.

---

### 13.9 Frontend WebSocket Re-Subscription & Non-Resetting Terminal States
- **Symptom**: Reconnected WebSocket sockets dropped active download subscriptions; `paused` or `failed` status packets reset the displayed progress bar to 0%.
- **Root Cause**: The frontend didn't re-transmit subscriptions on socket reconnect; progress was reset when speed/eta dropped to 0.
- **Solution**:
  - Added persistent `subscribedIds: Set<string>` in `ApiService` that auto-resends subscriptions on `ws.onopen`.
  - Preserved `existing.progress` and `existing.downloaded_size` on `paused` and `failed` events in `DownloadQueue.tsx`.

---

### 13.10 Non-Blocking Async SSRF Wrapper (`async_check_ssrf`)
- **Symptom**: High volume or slow DNS lookups in `check_ssrf(url)` blocked the asyncio main event loop, causing WebSocket ping timeouts and UI freezing during batch imports.
- **Root Cause**: `socket.getaddrinfo` executed synchronously inside async redirect event hooks in `SegmentedDownloader` and `GenericExtractor`.
- **Solution**:
  - Introduced `async_check_ssrf(url)` in `backend/core/security.py` wrapping lookups in non-blocking event-loop executor threads (`asyncio.to_thread`).
  - Switched `_validate_redirect_ssrf` hooks in `SegmentedDownloader` and `GenericExtractor` to use `await async_check_ssrf(redirect_url)`.
  - Maintained synchronous `check_ssrf(url)` and `validate_url(url)` signatures for full backward compatibility across unit tests.

---

### 13.11 In-Memory Queue Pool Rehydration on Boot
- **Symptom**: Interrupted `DOWNLOADING` tasks reset to `QUEUED` in SQLite on startup remained indefinitely dormant without ever resuming.
- **Root Cause**: `DownloadQueue` in `backend/queue/manager.py` maintains an in-memory priority queue that is empty on cold process startup; updating SQLite status alone did not notify the queue worker.
- **Solution**:
  - In `backend/main.py` lifespan startup, queried all `DownloadStatus.QUEUED` records ordered by priority (`-priority, created_at`).
  - Re-enqueued each recovered download into `queue_manager.add(q_dl.id, priority=q_dl.priority)` so interrupted downloads seamlessly resume without user intervention.

---

### 13.12 Subprocess Lifecycle & Zombie Prevention on HLS Cancel/Pause
- **Symptom**: Pausing or cancelling active HLS stream downloads left underlying `ffmpeg` worker processes running in the background, consuming CPU and locking output files.
- **Root Cause**: While the Python coroutine cancelled or exited, the spawned `asyncio.subprocess.Process` was not explicitly terminated.
- **Solution**:
  - Added an active process registry `self._active_processes: Dict[str, asyncio.subprocess.Process]` in `DownloadEngine`.
  - Stored references upon spawning `ffmpeg` in `_download_hls` and added termination handling in `cancel_download` and `pause_download`.
  - Ensured `_download_hls` contains a `finally` block terminating `process` with a 2-second graceful fallback to `process.kill()`.

---

### 13.13 Hardened OS File Explorer Path Resolution
- **Symptom**: Path normalization quirks on Windows caused `explorer.exe` to fail when paths contained forward slashes `/`, and non-existent files crashed silently.
- **Root Cause**: Unnormalized target paths passed directly to system explorers without verifying filesystem existence.
- **Solution**:
  - Normalized all target paths via `os.path.normpath(os.path.abspath(target_path))` in `backend/api/routes.py`.
  - Validated that the file or directory exists on disk via `os.path.exists()`, raising HTTP 404 if deleted or moved externally.
  - On Windows, passed `["explorer.exe", f"/select,{norm_path}"]` with `shell=False` to safely highlight target files without command injection or flag confusion.

---

### 13.14 Parallel Non-Blocking URL Validation in Batch Downloads
- **Symptom**: Submitting a 50-URL batch in `/api/batch-download` took 10–30 seconds and timed out client Axios requests (`REQUEST_TIMEOUT = 30s`).
- **Root Cause**: URLs were validated, resolved, and committed sequentially in a blocking for-loop with individual database transactions.
- **Solution**:
  - Offloaded URL parsing and DNS/SSRF checks into concurrent workers using `asyncio.gather(*(_validate_single_url(u) for u in req.urls), return_exceptions=True)`.
  - Batched all newly generated `Download` models into a single atomic SQLite transaction commit before notifying `queue_manager`.

---

### 13.15 LocalStorage Queue Isolation to Prevent Stale State Ghosting
- **Symptom**: Stale or completed downloads persisted in `localStorage` momentarily flashed or remained ghosted in the UI on page refresh if the backend queue was empty.
- **Root Cause**: Zustand `persist` middleware was storing the volatile active `queue` array in browser storage.
- **Solution**:
  - Configured Zustand `partialize` in `frontend/src/hooks/useStore.ts` to strictly persist `settings` and `history` (up to 100 items), excluding `queue`.
  - Kept the UI `queue` state purely hydrated from the authoritative backend `/api/queue` endpoint with live WebSocket reconciliation.

---

### 13.16 Multi-Stream DASH Fragment Progress Telemetry & Live Byte Interpolation
- **Symptom**: In multi-stream DASH fragment downloads (e.g., YouTube 1080p format 270 with HLS m3u8 fragments + Opus audio format 251), the UI progress climbed from 48% to 73%, suddenly reset down to 27%, and climbed again to 53%. Simultaneously, the size indicator showed a static `52.72 MB / 52.72 MB` across all ticks even though the completed MP4 video successfully downloaded and saved to disk (`45.8 MB`).
- **Root Cause**:
  1. **Multi-Stream Reset**: `yt-dlp` downloads multi-stream formats sequentially. Stream 1 (video, 66 fragments) completed at 73% (fragment 48/66). `yt-dlp` then reset its internal progress counter to 0% when starting Stream 2 (audio, ~5.5 MB), which reached 27% (1.5 MB) and 53% (2.9 MB). Without multi-stream scaling in the engine, raw progress dropped visibly in the UI.
  2. **Stale Downloaded Size Clamping**: When retried or re-downloaded, `existing?.downloaded_size` retained the completed size (`52.72 MB`), and `Math.max(existing?.downloaded_size || 0, incomingDownloaded)` pinned `nextDownloadedSize` permanently to `52.72 MB`.
  3. **Fragment Telemetry Gaps**: Fragment downloads often lack combined stream byte totals in intermediate hook ticks, causing the UI to display identical numbers on both sides of the slash.
- **Solution**:
  - **Engine Multi-Stream Partitioning** (`backend/download/engine.py`):
    - Automatically identifies multi-stream downloads (`is_multistream = True`).
    - Scales Stream 1 (Video) across `0.0% – 85.0%` and Stream 2 (Audio) across `85.0% – 97.0%`.
    - Enforces strictly non-decreasing progress via `last_progress` (`max(last_progress, scaled_progress)`).
    - Tracks per-stream downloaded bytes in `stream_downloaded` and sums cumulative bytes across all streams.
    - Emits zeroed byte counts (`downloaded: 0, downloaded_size: 0, speed: 0, eta: 0`) in `start_msg`.
  - **Frontend Stale Size Discard & Interpolation** (`frontend/src/components/download/DownloadQueue.tsx`):
    - Discards stale full sizes if `existing?.downloaded_size >= existing?.file_size` while `nextProgress < 98%`.
    - When byte telemetry is omitted during fragment downloads, accurately interpolates `nextDownloadedSize = Math.round((nextProgress / 100) * nextFileSize)`.
    - Synchronized `loadQueue()` fallback merge with identical protections against stale snapshot freezing.

---

### 13.17 Video Time-Range Clipping, Subtitles & SponsorBlock (Phase 1)
- **Symptom**: Downloading a specific segment (e.g. 30 seconds from a 2-hour podcast) required downloading the entire video; videos contained sponsored sponsor segments and lacked subtitles.
- **Root Cause**: `yt-dlp` defaults to fetching the full container stream without range callbacks, subtitle write flags, or postprocessor subtitle embedding.
- **Solution**:
  - In `backend/models/schemas.py`, extended `AnalyzeResponse` with `subtitles: List[str]` and `chapters: Optional[List[dict]]`. Extended `DownloadRequest` with `start_time`, `end_time`, `subtitle_langs`, `embed_subtitles`, `embed_chapters`, and `sponsorblock_remove`.
  - In `backend/download/engine.py` (`_download_ytdlp`), implemented `parse_time_str` supporting `HH:MM:SS`, `MM:SS`, or raw seconds.
  - When `start_time` or `end_time` is specified, configured `download_ranges = yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)])` with `force_keyframes_at_cuts = True`.
  - Appended `clip_{start_sec}-{end_sec}` to `format_tag` so clipped clips never collide with or overwrite full video downloads on disk (preserving Rule 13.3).
  - Configured `writesubtitles: True`, `subtitleslangs`, `writeautomaticsub: True`, and `FFmpegEmbedSubtitle` postprocessor when subtitle options are enabled.
  - Configured `add_chapters: True` and `sponsorblock_remove: ["sponsor", "selfpromo", "interaction"]`.
  - Built a collapsible Cybernetic **"Clip & Enhancements"** HUD in `UrlAnalyzer.tsx` with start/end time inputs, quick chapter chips, subtitle multi-select pills, and enhancement toggles.

---

### 13.18 Smart Playlist, Album & Carousel Ingestion with Subfolder Isolation (Phase 2)
- **Symptom**: Large playlists or music albums dumped all media files into the root `downloads/` folder, creating naming collisions and cluttering disk storage; analyzing whole playlists was slow because extractors attempted deep parsing on every item.
- **Root Cause**: Base extractors did not support flat playlist extraction (`extract_flat="in_playlist"`), and `DownloadEngine` always wrote directly to `settings.download_dir`.
- **Solution**:
  - Implemented `extract_playlist` in `BaseExtractor` using `yt-dlp` with `extract_flat="in_playlist"` and `playlistend=200`, returning lightweight `PlaylistAnalyzeResponse` with entry titles, durations, URLs, and thumbnails.
  - Added `POST /api/analyze-playlist` protected by `async_check_ssrf(url)` and SlowAPI rate limiting.
  - Extended `DownloadRequest` and `BatchDownloadRequest` with optional `subfolder: Optional[str] = None`.
  - In `DownloadEngine`, sanitized `subfolder` with `sanitize_filename()` and placed outputs inside `os.path.join(settings.download_dir, safe_subfolder)`, creating the folder if it does not exist.
  - Built a sleek **Playlist Selector Modal** in `UrlAnalyzer.tsx` featuring select/deselect all, individual item checkboxes, preset format picker, and a "Save inside `<Playlist Title>` subfolder" toggle that dispatches batch downloads.

---

### 13.19 Cybernetic Media Player & HTTP 206 Partial Content Range Streaming (Phase 3)
- **Symptom**: Playing downloaded videos directly in the browser required downloading the complete multi-gigabyte file before playback could start, and seeking was non-functional in HTML5 `<video>` and `<audio>` players.
- **Root Cause**: `GET /api/download/{download_id}/file` returned a standard static `FileResponse` without byte chunk range negotiation.
- **Solution**:
  - Built `GET /api/download/{download_id}/stream` implementing the standard HTTP `Range: bytes={start}-{end}` protocol (`RFC 7233`).
  - Returns `HTTP 206 Partial Content` with `Accept-Ranges: bytes`, `Content-Range: bytes {start}-{end}/{total_size}`, and `Content-Length: {chunk_length}` headers, reading files via an asynchronous generator in 64 KB chunks.
  - Added `FFmpegService.probe(file_path)` and endpoint `GET /api/download/{download_id}/probe` returning container format, video/audio codec, resolution, and bitrate telemetry.
  - Created `CyberneticMediaPlayer.tsx` modal with glowing violet/cyan HUD, live telemetry pills, volume/speed controls, "Copy File Path", and "Open in Explorer" actions. Integrated directly into `DownloadQueue.tsx` and `app/history/page.tsx`.

---

### 13.20 Manifest V3 Browser Extension v2: 1-Click Cookie Sync & Stream Sniffer (Phase 4)
- **Symptom**: Users downloading age-restricted or private videos had to manually export Netscape `cookies.txt` using third-party browser extensions; sniffed video streams were lost when the extension service worker went idle.
- **Root Cause**: MV3 background service workers terminate after ~30 seconds of inactivity, wiping in-memory maps; cookies required manual file uploads.
- **Solution**:
  - In `browser-extension/background.js`, implemented `chrome.webRequest.onBeforeRequest` to capture `.m3u8` and `.mpd` URLs immediately as network requests fire.
  - Stored the latest 10 streams per tab in persistent `chrome.storage.session` (with in-memory fallback), updating the extension action badge count.
  - Enriched stream entries with `Referer`, `User-Agent`, and `Origin` headers via `chrome.webRequest.onSendHeaders`.
  - Added a **"Sync Browser Cookies"** button in `popup.html` and `popup.js`: dynamically queries active tab domain cookies via `chrome.cookies.getAll`, formats them into standard Netscape `cookies.txt` syntax, and POSTs directly to `http://localhost:8000/api/settings/cookies`.
  - Displayed 1-click "⬇ Video" and "🎵 Audio" stream download buttons in the popup.

---

### 13.21 Solaris Carbon Multi-Theme Palette, Kinetic Input & Velocity HUD Overhaul
- **Objective**: Overhaul the entire frontend interface with hardware-inspired aesthetics, dynamic theming, velocity animations, and global command bars without breaking backend contracts, WebSocket telemetry clamping, or v2.0 feature sets.
- **Implementation**:
  - **Multi-Theme Engine (`globals.css`, `tailwind.config.ts`, `ThemeSwitcher.tsx`)**:
    - Replaced old hardcoded blue-slate/violet tokens with semantic CSS variable channels: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--accent-primary`, `--accent-secondary`, `--accent-velocity`, `--accent-muxing`, and `--text-primary`.
    - Implemented 4 runtime-switchable theme presets via `data-theme` attribute: `solaris` (Flagship Solaris Carbon `#09090B` / `#FF5E1A`), `matrix` (Acid Matrix `#050806` / `#00FF87`), `crimson` (Crimson Overdrive `#0B0608` / `#F43F5E`), and `daylight` (Titanium Daylight `#F4F5F7`).
    - Persisted theme selection in `localStorage` under `omni-color-theme` with instantaneous hydration and swatch picker popup in the header and Appearance settings.
  - **Floating Titanium HUD & `Ctrl+K` Global Command Bar (`AppShell.tsx`, `CommandPalette.tsx`)**:
    - Replaced standard header with a floating, pill-shaped anodized titanium HUD with background aurora mesh and ambient noise texture.
    - Added universal `Ctrl+K` / `Cmd+K` Command Bar supporting instant URL paste & analysis, direct page jumping, and theme switching.
  - **Kinetic URL Analyzer & Global `Ctrl+V` Capture (`UrlAnalyzer.tsx`)**:
    - Added global window `paste` listener that automatically captures links, populates the input bar, triggers a shockwave ripple border glow (`animate-shockwave`), and auto-analyzes.
    - Integrated intelligent platform detection displaying animated badges for YouTube, Reddit, Instagram, Twitter/X, TikTok, SoundCloud, TeraBox, Pinterest, BitTorrent, HLS/DASH streams, and Direct Media.
    - Formats upgraded with `.omni-glass-card` elevation and active accent selection rings.
  - **Velocity-Reactive Dual-Layer Progress & 16-Segment LED Hardware Track (`DownloadQueue.tsx`, `queue/page.tsx`)**:
    - Main progress bar upgraded with `from-[rgb(var(--accent-primary))] via-[rgb(var(--accent-secondary))] to-[rgb(var(--accent-velocity))]` gradient and `animate-shimmer-fast` specular light sweep.
    - Added 16-segment micro-LED track that lights up sequentially beneath the progress bar.
    - When `status === "downloading"` and `progress >= 99%` (post-processing), automatically transitions to Laser Amber-Gold (`--accent-muxing`) with `animate-mux-pulse` and `"⚡ MUXING AUDIO & VIDEO STREAMS (99%)"`, preventing users from believing downloads are frozen during multiplexing.
    - Clamped live telemetry numbers formatted with `font-mono tabular-nums` in anodized pills.
    - Added mouse-tracking radial spotlight border highlights (`--mouse-x`, `--mouse-y`) across all download cards.
  - **Cybernetic Bento Grid Dashboard & Cross-Page Polish (`dashboard/page.tsx`, `sites/page.tsx`, `history/page.tsx`, `settings/page.tsx`, `CyberneticMediaPlayer.tsx`)**:
    - Transformed Analytics Dashboard into an interactive Cybernetic Bento Grid with animated bar charts, radial spotlight cards, and live telemetry summaries.
    - Replaced all legacy hardcoded violet/cyan color tokens across Sites, History, Settings, and Media Player with dynamic semantic variables.

---

### 13.22 UI/UX Upgrade, Complete Color Purge & 3D Deconstruction Landing Page Overhaul
- **Objective**: Purge all hardcoded colors (`text-white`, `bg-slate-950`, `border-white/`, discordant violet/cyan gradients) that caused severe contrast/invisibility bugs in the **Daylight** light-mode theme, connect the 3D Engine Deconstruction showcase (`EngineDeconstructionLanding.tsx`) directly to the runtime multi-theme CSS variable engine, and embed global HUD controls.
- **Root Causes**:
  - Legacy components retained hardcoded `text-white` on non-gradient backgrounds and pitch-black `bg-slate-950` cards, rendering white-on-white text in Daylight mode.
  - `EngineDeconstructionLanding.tsx` relied on 1,500+ lines of manual inline CSS with hardcoded hex codes (`#05070e`, `#7c3aed`, `#38bdf8`), remaining static regardless of theme selection and lacking the header's `ThemeSwitcher` and `CommandPalette`.
- **Implementation**:
  - **Full Color Purge Across Application Pages**:
    - Replaced all `bg-slate-950/60` and `border-white/[0.08]` with `.omni-glass-card` (specular reflections dynamically bound to `rgb(var(--border) / 0.7)` and `rgb(var(--foreground) / 0.05)`).
    - Replaced `text-white` with `text-foreground` and `text-white/45..70` with `text-muted-foreground` across `app/page.tsx`, `app/about/page.tsx`, `AppShell.tsx`, `ThemeSwitcher.tsx`, `CommandPalette.tsx`, `UrlAnalyzer.tsx`, and `sites/page.tsx`.
    - Standardized button gradients using semantic `gradient-primary` (`linear-gradient(135deg, rgb(var(--accent-primary)), rgb(var(--accent-secondary)))`).
  - **Dynamic Theme Canvas Engine (`EngineDeconstructionLanding.tsx`)**:
    - Implemented `themeColorsRef` and a `MutationObserver` on `document.documentElement` that reads `--bg-base`, `--accent-primary`, `--accent-secondary`, and `--accent-velocity` dynamically.
    - Canvas background, precision corner brackets, laser scanning sweep line, center pulse, and packet indicators dynamically synchronize in real-time when switching between Solaris, Matrix, Crimson, and Daylight palettes.
  - **Integrated Luxury HUD Bar on Landing Page**:
    - Embedded `ThemeSwitcher` popover and `CommandPalette` (`Ctrl+K`) bar directly into the top HUD bar of the 3D landing page.
    - Added responsive mobile navigation drawer with direct links to Console, Queue, Telemetry, and Sites.
  - **Hero URL Fast-Path Ingestion (`EngineDeconstructionLanding.tsx` & `UrlAnalyzer.tsx`)**:
    - Added an interactive URL input bar in the landing hero; submitting a URL navigates directly to `/?view=console&url=${encodeURIComponent(url)}`.
    - `UrlAnalyzer.tsx` inspects `window.location.search` on mount, automatically populates the input, and executes analysis.
  - **Mobile & Touch Viewport Optimization**:
    - Replaced `100vh` with `100dvh` to eliminate mobile browser address bar clipping.
    - Scaled HUD cards with responsive clamps and safe-area margins.
- **Verification**:
  - `tsc --noEmit`: 0 errors.
  - `npm run build`: 11/11 routes built successfully.
  - `pytest tests/ -v`: 94/94 tests passing.

---

### 13.23 Unified Landing Page & Application Architecture
- **Symptom**: The Landing Page (`/` and `/landing`) and the application workspace pages (`/queue`, `/history`, `/dashboard`, `/sites`, `/settings`, `/about`, and Downloader Console) felt like two completely different websites. The landing page was a scroll-locked 100vh canvas with a custom absolute header, no footer, omitted navigation items (`Settings`, `About`), and sci-fi aerospace turbine nomenclature, while the console and dashboard featured standard top sticky navigation, multi-column footers, and a prominent jarring banner ("3D Engine Dissection Mode - 15.2 TBPS SATURATION").
- **Root Cause**:
  1. The landing page rendered standalone without `AppShell`, creating a duplicate, un-synchronized header bar and dropping the global footer entirely.
  2. The 3D canvas trapped the viewport inside an artificial `750vh` invisible scroll track, preventing natural page scrolling and prohibiting standard product sections.
  3. Disconnected navigation arrays in `AppShell` and `CommandPalette` referred to `/landing` as "3D Dissection" instead of a cohesive product overview.
- **Solution**:
  - **Universal `AppShell` Wrapping**: Wrapped both the Landing Page (`/`, `/landing`) and Downloader Console in `AppShell`, standardizing the sticky `h-16` luxury HUD, 4-theme styling, `Ctrl+K` command palette, and rich multi-column footer across all 11 routes.
  - **Multi-Section Product Landing Page (`EngineDeconstructionLanding.tsx`)**:
    - Removed the duplicate conflicting header and mobile menu.
    - Embedded the 3D acceleration engine as an interactive **Stage Component** with interactive stage selector tabs (`01 Assembled` to `05 Max Velocity`), scrub slider, and auto-play controls, maintaining full canvas theme synchronization.
    - Added comprehensive product sections: Hero with Fast-Path Downlink Input Bar & Telemetry Badges, Features Architecture Bento Grid (4K/8K DASH, Segmented Turbo, FFmpeg Mux, MusicBrainz, In-Browser Seeking, Zero-Trust SSRF), Supported Platforms Matrix, Traditional vs OmniDownloader Comparison Table, and CTA strip.
  - **Downloader Console Harmony (`app/page.tsx`)**:
    - Removed the awkward "3D Engine Dissection Mode" banner from the workspace.
    - Integrated a sleek `[ Overview & 3D Showcase ]` button directly into the hero header for fluid switching between product overview and downloading console.
  - **Synchronized Navigation**: Standardized navigation items (`Overview` -> `/`, `Downloader` -> `/?view=console`, `Queue` -> `/queue`, `Analytics` -> `/dashboard`, `Sites` -> `/sites`, `Settings` -> `/settings`, `About` -> `/about`).

---

### 13.24 Ultra-Premium Luxury HUD Header Redesign
- **Symptom**: Visual inspection revealed multiple polish flaws in the top navigation bar:
  1. "Supported Sites" awkwardly wrapped into two lines ("Supported" on top of "Sites"), disrupting vertical rhythm.
  2. The active tab ("Overview") used an aggressive, solid coral-red opaque block (`gradient-primary`) that clashed with the sleek dark glass HUD aesthetic.
  3. The brand logo area featured stacked badges and tiny secondary telemetry text ("OMNIDOWNLOAD SOLARIS / • ACCELERATION ACTIVE") causing vertical crowding.
  4. The right side had three disjointed, unaligned buttons ("Command ⌘K", "Solaris 🎨", "Browser Extension 🧩") with mismatched heights, borders, and paddings.
- **Root Cause**:
  - Lack of `whitespace-nowrap shrink-0` on navigation tab items and excessively long label string ("Supported Sites" vs "Sites").
  - Solid linear gradient fill used on active state instead of luminous translucent glass styling.
  - Separate un-docked buttons for command palette, theme switcher, and browser extension.
- **Implementation**:
  - **Single-Line Tab Labeling & Wrapping Prevention**:
    - Renamed `"Supported Sites"` to `"Sites"` across `navigation` in [`AppShell.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/AppShell.tsx).
    - Enforced `whitespace-nowrap shrink-0` across all desktop and compact navigation links.
  - **Luminous Glass HUD Active Indicator**:
    - Replaced solid `gradient-primary` active tab fill with a luminous translucent glass HUD pill:
      `bg-accent-primary/15 text-accent-primary border border-accent-primary/35 shadow-[0_0_12px_rgba(var(--accent-primary)/0.25)] font-bold px-3 py-1.5 rounded-full text-xs`.
    - Restyled nav container to a soft pill glass track: `bg-elevated/80 p-1 rounded-full border border-white/[0.08] backdrop-blur-xl shadow-inner`.
  - **Streamlined Brand Telemetry Mark**:
    - Replaced the stacked multi-line brand mark with a single horizontal high-tech mark: `OMNIDOWNLOAD` with an inline live telemetry beacon pill (`ACTIVE` with pulsing green dot `bg-accent-velocity shadow-[0_0_6px_rgb(var(--accent-velocity))]`).
  - **Unified Utility Toolbar Dock**:
    - Consolidated Command Palette (`⌘K`), Theme Switcher, and Browser Extension triggers into a single unified pill-shaped dock:
      `flex items-center gap-1 p-1 rounded-full bg-elevated/80 border border-white/[0.08] backdrop-blur-xl shadow-inner`.
    - Separated controls with subtle vertical hairline dividers (`w-px h-3.5 bg-border/50`).
    - Standardized [`ThemeSwitcher.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/ThemeSwitcher.tsx) and [`BrowserExtensionModal.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/BrowserExtensionModal.tsx) trigger pills with matching heights, rounded-full geometry, and hover feedback.
- **Verification**:
  - `npm run build`: 11/11 static pages generated with 0 errors.
  - `pytest tests/ -v`: 94/94 tests passing.

---

### 13.25 Pydantic Float Coercion & Queue 500 Error Resolution
- **Symptom**: `GET /api/queue` returned 500 Internal Server Error when polling or loading the queue:
  `pydantic_core._pydantic_core.ValidationError: 1 validation error for DownloadInfo`
  `file_size`
  `  Input should be a valid integer, got a number with a fractional part [type=int_from_float, input_value=656637150.5, input_type=float]`
- **Root Cause**:
  1. `yt-dlp` extracts `filesize_approx` or `total_bytes_estimate` as floating-point numbers computed from bitrate and duration (e.g. `656637150.5`).
  2. In `backend/download/engine.py`, `d.get("total_bytes_estimate")` was assigned directly to `stream_totals` and `combined_total` without integer rounding, then written directly into SQLite's `file_size` column (which stores floats dynamically).
  3. When `GET /api/queue` or `GET /api/download/{id}` serialized rows using `db_download_to_info`, Pydantic v2's strict `file_size: int = 0` rejected the fractional float.
- **Implementation**:
  - **Schema Pre-Validation Coercion (`backend/models/schemas.py`)**:
    - Added `@field_validator(..., mode="before")` on `DownloadInfo`, `HistoryItem`, `ProgressUpdate`, `FormatModel`, `DownloadRequest`, `DailyActivity`, and `AnalyticsStatsResponse`.
    - Automatically rounds and coerces floats or numeric strings (`int(round(v))`) for `file_size`, `downloaded_size`, `speed`, `eta`, `priority`, `retries`, `total`, and `downloaded`.
  - **Route Mapping Defensive Casting (`backend/api/routes.py`)**:
    - Wrapped `d.file_size`, `d.downloaded_size`, `d.speed`, `d.eta`, `d.priority`, `d.retries`, `d.max_retries` in `int(round(...))` within `db_download_to_info` and `db_history_to_item`.
  - **Engine Progress Integer Normalization (`backend/download/engine.py`)**:
    - Normalized `raw_downloaded`, `raw_total`, and `combined_total` in `progress_hook` and `postprocessor_hook` with `int(round(...))`.
    - Sanitized all inputs in `_update_db_progress` so SQLite rows only ever receive exact integer byte counts.
  - **Regression Test (`tests/test_api_endpoints.py`)**:
    - Added `test_queue_handles_fractional_file_size_float` asserting that a record with `file_size=656637150.5` and `downloaded_size=328318575.25` returns HTTP 200 with sanitized integer sizes.
- **Verification**:
  - `pytest tests/ -v`: 95/95 tests passing (100%).
  - `npm run build`: 11/11 static routes generated with 0 errors.

---

### 13.26 LiquidGlassKit iOS Liquid Glassmorphism Design System & Default Theme
- **Inspiration**: [`LiquidGlassKit`](https://github.com/muhittincamdali/LiquidGlassKit) (by Muhittin Çamdallı) implementing Apple visionOS and iOS 18 native liquid glass physics.
- **Implementation**:
  - **Core Glassmorphism Engine (`frontend/src/app/globals.css`)**:
    - Established `:root`, `[data-theme="liquid"]`, and `.dark` as the default **Liquid Glass iOS** palette:
      - Deep Crystal Obsidian Glass background (`#080B11`, `8 11 17`)
      - Translucent Liquid Glass surface (`#0F141E`, `15 20 30`)
      - Elevated Frosted Prism (`#161D2C`, `22 29 44`)
      - Apple Electric Azure primary accent (`#0A84FF`, `10 132 255`)
      - VisionOS Liquid Violet secondary accent (`#5E5CE6`, `94 92 230`)
      - iOS Hyper-Spring Mint velocity accent (`#30D158`, `48 209 88`)
      - Apple Studio Amber muxing accent (`#FF9F0A`, `255 159 10`)
    - Added dedicated CSS utility classes:
      - `.liquid-glass-card`: Semi-transparent crystal fill, heavy multi-stop blur (`blur(28px) saturate(190%) contrast(102%) brightness(104%)`), dual-stroke specular top edge highlight (`border-top: 1.5px solid rgb(255 255 255 / 0.35)`), and physical inner bevel shadows (`inset 0 1.5px 1px 0 rgb(255 255 255 / 0.22)`).
      - `.liquid-glass-pill`: Floating capsule for navigation docks, segmented buttons, and tabs.
      - `.liquid-glass-input`: Translucent frosted textfield with crisp specular focus states.
      - `.liquid-glass-btn`: Tactile micro-haptic interactive button (`active:scale-[0.98]`).
    - Upgraded `.omni-glass-card` to inherit the new Liquid Glass specular physics for full backwards compatibility across all pages.
    - Enhanced `.bg-ambient-aurora` radial mesh with Apple Electric Azure and VisionOS Liquid Violet gradients.
  - **Theme Switcher & Settings Elevation (`ThemeSwitcher.tsx` & `settings/page.tsx`)**:
    - Added `"liquid"` as the #1 Flagship theme in `OMNI_THEMES`.
    - Initialized default state to `"liquid"`, defaulting any uninitialized browser session to the iOS Liquid Glass aesthetic.
    - Updated settings appearance grid to feature "Liquid Glass iOS" as the primary choice alongside `Solaris Carbon`, `Acid Matrix`, `Crimson Overdrive`, and `Titanium Daylight`.
  - **HUD Header & Modals (`AppShell.tsx`, `CommandPalette.tsx`, `BrowserExtensionModal.tsx`)**:
    - Applied `.liquid-glass-pill` to navigation tracks and utility toolbar dock.
    - Updated brand telemetry indicator to display `LIQUID GLASS` with a live pulsing green beacon dot.
    - Applied `.liquid-glass-card` to command search palette and extension modals.
- **Verification**:
  - `npm run build`: 11/11 static pages generated with 0 errors.
  - `pytest tests/ -v`: 95/95 tests passing (100%).

---

### 13.27 Ultra-Luxury HUD Header Redesign & LiquidGlass Optics
- **Inspiration**: Premium automotive HUDs, Linear, Apple visionOS floating docks, and LiquidGlassKit.
- **Problem Solved**:
  - Eliminates text wrapping on `"Supported Sites"` (now streamlined to `"Sites"` with `whitespace-nowrap`).
  - Eliminates "button soup" by unifying `Search ⌘K`, `Theme Switcher`, and `Extension` into a single, cohesive `.liquid-glass-pill` floating dock with hairline glass dividers (`w-px h-3.5 bg-white/20`).
  - Replaces harsh opaque solid buttons with luminous jewel pills (`.active-tab-specular`) featuring 1.5px top specular reflection (`inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.70)`) and rich radial ambient glows.
  - Streamlines brand telemetry into tracked modern typography `OmniDownload` with a live pulsing emerald beacon dot (`bg-accent-velocity`).
- **Files Modified**:
  - [`frontend/src/app/globals.css`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/globals.css): Calibrated `.liquid-glass-header`, `.liquid-glass-pill`, and `.active-tab-specular`.
  - [`frontend/src/components/layout/AppShell.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/AppShell.tsx): Unified navigation & utility dock architecture.
  - [`frontend/src/components/layout/ThemeSwitcher.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/ThemeSwitcher.tsx): Polished button trigger to use `useOmniTheme()` and glowing dynamic swatch orb.
- **Verification**:
  - `npm run build`: 11/11 pages statically generated with 0 errors.
  - `pytest tests/ -v`: 95/95 tests passing (100%).
  - Visual verification with Playwright across Liquid White Glass and Solaris Carbon themes (`header_luxury_liquid_crop.png`, `header_luxury_solaris_crop.png`).

---

### 13.28 Liquid Glass Studio Shader Integration & Continuous SDF Optics
- **Inspiration**: [`iyinchao/liquid-glass-studio`](https://github.com/iyinchao/liquid-glass-studio) by Yin Chao, implementing real-time WebGL2 optical refraction, Abbe chromatic dispersion, and directional Fresnel glare.
- **Problem Solved**:
  - Elevates the flagship "Liquid Glass iOS" aesthetic with physical optics and real-time hardware shaders.
  - Implements 45° directional specular glare (135° incident angle) across both CSS glass surfaces and WebGL2 shaders.
  - Eliminates interior piecewise SDF branch artifacts (the "hourglass" artifact) by implementing Inigo Quilez's continuously differentiable Euclidean `sdRoundedBox` SDF.
  - Pre-multiplies alpha in GLSL (`finalColor * totalAlpha, totalAlpha`) with `premultipliedAlpha: true` and `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)` to ensure crystal-clear canvas transparency and seamless HTML5 compositing.
- **Files Modified / Added**:
  - [`frontend/src/app/globals.css`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/globals.css): Directional 45° Fresnel glare, chromatic Abbe dispersion borders (`rgba(94, 92, 230, 0.12)`, `rgba(10, 132, 255, 0.15)`), `.squircle-card` and `.squircle-pill` superellipse geometry.
  - [`frontend/src/components/ui/LiquidGlassLens.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/ui/LiquidGlassLens.tsx): Hardware-accelerated WebGL2 interactive lens overlay mounted over the 3D Engine Stage with spring-physics mouse tracking, continuous `sdRoundedBox` SDF, 45° directional glare, and chromatic dispersion bevel rim.
  - [`frontend/src/components/landing/EngineDeconstructionLanding.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/landing/EngineDeconstructionLanding.tsx): Mounted `LiquidGlassLens` dynamically over the interactive 3D Exploded Engine viewport.
  - [`frontend/src/components/layout/AppShell.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/AppShell.tsx): Optimized container width (`max-w-[1440px]`) and padding for balanced 3-zone HUD layout.
- **Verification**:
  - `pytest tests/ -v`: 95/95 tests passing (100%).
  - Playwright visual capture and inspection verifying crystal-clear center transparency, crisp 2px specular rim, 45° directional glare, and dynamic spring mouse tracking (`engine_stage_verification.png`, `engine_stage_hover_lens.png`, `header_liquid_perfect.png`, `header_solaris_perfect.png`).

---

### 13.29 Overview vs Downloader Navigation Synchronization (Single-Click Instant Switch)
- **Symptom**: Clicking between "Overview" and "Downloader" in the header navigation or landing hero buttons required multiple clicks to switch views, or failed to switch unless another page was visited.
- **Root Cause**:
  1. In [`app/page.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/page.tsx), `view` state was held in a local `useState<"landing" | "console">("landing")` initialized via `useEffect` with an empty dependency array `[]`.
  2. Because "Overview" (`href="/"`) and "Downloader" (`href="/?view=console"`) share the same route pathname (`/`), Next.js client-side navigation only changed query parameters and did not unmount/remount `HomePage`. The empty-dependency `useEffect` never re-executed upon query string changes.
  3. `handleLaunchConsole` and `handleReturnToLanding` called raw `window.history.pushState()`, bypassing Next.js router listeners entirely.
- **Implementation**:
  - **Reactive `useSearchParams` Integration**:
    - Replaced local `useState` and empty `useEffect` in [`app/page.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/page.tsx) with Next.js's reactive `useSearchParams()` hook:
      `const isConsole = searchParams.get("view") === "console"`
      `const view = isConsole ? "console" : "landing"`.
    - Wrapped the page component in `<Suspense fallback={null}>` to preserve Next.js 14 SSG static compilation compatibility.
  - **Next.js `router.push()` Integration**:
    - Replaced `window.history.pushState()` in `handleLaunchConsole` and `handleReturnToLanding` with `router.push("/?view=console")` and `router.push("/")`.
- **Verification**:
  - Automated Playwright browser tests verifying single-click instantaneous transition between `Overview` and `Downloader` in both directions (`verified_overview_single_click.png`, `verified_downloader_single_click.png`).
  - Next.js production build: `npm run build` compiled 11/11 static pages with 0 errors.
  - Backend regression test suite: `pytest` 95/95 passed.

---

### 13.30 Complete Removal of Liquid Theme & Restoration of Solaris Carbon Default
- **User Request**: Completely remove the "liquid" theme and anything related to it.
- **Actions Taken**:
  1. **Deleted `LiquidGlassLens.tsx`**: Removed the WebGL2 liquid glass lens overlay from `frontend/src/components/ui/LiquidGlassLens.tsx`.
  2. **Unmounted Lens in 3D Engine Stage**: Removed `<LiquidGlassLens />` and its import from [`EngineDeconstructionLanding.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/landing/EngineDeconstructionLanding.tsx).
  3. **Reverted Theme Engine (`ThemeSwitcher.tsx`)**:
     - Removed `"liquid"` from `OmniTheme` type and `OMNI_THEMES` array.
     - Restored **Solaris Carbon** (`solaris`) as the primary default flagship theme and cold-boot fallback.
     - Preserved the 4 core cybernetic hardware themes: `Solaris Carbon`, `Acid Matrix`, `Crimson Overdrive`, and `Titanium Daylight`.
  4. **Purged Liquid CSS & Restored Clean Cybernetic HUD (`globals.css`)**:
     - Removed `:root, [data-theme="liquid"]` white glass definitions and set `:root, [data-theme="solaris"], .dark` to Solaris Carbon OLED values.
     - Removed all `.liquid-glass-*` rules (`.liquid-glass-card`, `.liquid-glass-pill`, `.liquid-glass-header`, `.liquid-glass-input`, `.liquid-glass-btn`) and `[data-theme="liquid"] ... !important` overrides.
     - Restored `.omni-glass-card`, `.header-hud`, and `.nav-capsule-pill` with theme-reactive variables (`rgb(var(--bg-surface) / 0.8)`).
     - Restored `.bg-ambient-aurora` to dynamically harmonize with the active theme's accent variables.
  5. **Purged Modal & Component Classnames**:
     - Replaced `liquid-glass-card` and `liquid-glass-pill` across [`AppShell.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/AppShell.tsx), [`CommandPalette.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/CommandPalette.tsx), and [`BrowserExtensionModal.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/BrowserExtensionModal.tsx) with `.header-hud`, `.nav-capsule-pill`, and `.omni-glass-card`.
  6. **Purged Settings Page**:
     - Cleaned [`settings/page.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/settings/page.tsx) to default to `solaris` and removed any liquid fallback references.
- **Verification**:
  - Codebase grep confirmed 0 occurrences of `liquid` anywhere in `frontend/src`.
  - Next.js production build: `npm run build` compiled 11/11 static pages with 0 errors.
  - Backend regression test suite: `pytest` passed 95/95 tests (100%).
  - Visual Playwright verification captured across Overview, Downloader Workspace, and Settings Appearance in Solaris Carbon (`solaris_pure_landing.png`, `solaris_pure_downloader.png`, `solaris_pure_appearance.png`).

---

### 13.31 Three New Themes From Image Palettes & Anti-Flash Theme Sanitization
- **User Request**:
  - Provided 3 WhatsApp image palettes:
    1. `"C:\Users\singh\Downloads\WhatsApp Image 2026-10-30 at 12.52.15 AM.jpeg"` (Nordic Slate / Oceanic Deep)
    2. `"C:\Users\singh\Downloads\WhatsApp Image 2026-10-30 at 12.52.28 AM.jpeg"` (Cashmere Dusk / Velvet Plum)
    3. `"C:\Users\singh\Downloads\WhatsApp Image 2026-10-30 at 12.54.10 AM.jpeg"` (Boreal Jade / Deep Pine)
  - Provided cropped header screenshot showing lingering liquid theme badge (`• FROSTED WHITE GLASS`) and `Liquid` switcher button from stale browser cache/localStorage.
- **Actions Taken**:
  1. **Anti-Flash & Stale Cache Sanitization (`layout.tsx`)**:
     - Added an inline initialization script in `<head>` of [`layout.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/layout.tsx).
     - Automatically intercepts `localStorage.getItem("omni-color-theme")`: if set to `"liquid"` or any invalid string, immediately overwrites it with `"solaris"` and sets `data-theme="solaris"` on `<html>` before first paint, permanently eliminating any stale "Liquid" or "FROSTED WHITE GLASS" flash.
  2. **Implemented 3 New Themes in `globals.css`**:
     - **Nordic Slate (`nordic`)**:
       - Base `#06141B` (`6 20 27`), Surface `#11212D` (`17 33 45`), Elevated `#253745` (`37 55 69`), Border `#4A5C6A` (`74 92 106`), Accent Primary `#9BA8AB` (`155 168 171`), Foreground `#CCD0CF` (`204 208 207`), Velocity `#6EC8D7` (`110 200 215`). Tag: `"Deep Oceanic"`.
       - Custom `.omni-glass-card`: Gradient with ice-mist top specular border (`rgb(155 168 171 / 0.6)`).
     - **Cashmere Dusk (`cashmere`)**:
       - Base `#3E3239` (`62 50 57`), Surface `#6B5560` (`107 85 96`), Elevated `#826976` (`130 105 118`), Border `#9E8189` (`158 129 137`), Accent Primary `#C7A9A3` (`199 169 163`), Secondary `#E8D2C4` (`232 210 196`), Foreground `#F7EFE7` (`247 239 231`). Tag: `"Velvet Plum"`.
       - Custom `.omni-glass-card`: Gradient with rose-velvet top specular border (`rgb(199 169 163 / 0.6)`).
     - **Boreal Jade (`boreal`)**:
       - Base `#051F20` (`5 31 32`), Surface `#0B2B26` (`11 43 38`), Elevated `#163832` (`22 56 50`), Border `#235347` (`35 83 71`), Accent Primary `#8EB69B` (`142 182 155`), Secondary `#DAF1DE` (`218 241 222`), Velocity `#52E7B0` (`82 231 176`). Tag: `"Pine Emerald"`.
       - Custom `.omni-glass-card`: Gradient with pine-emerald top specular border (`rgb(142 182 155 / 0.6)`).
  3. **Updated [`ThemeSwitcher.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/ThemeSwitcher.tsx)**:
     - Expanded `OmniTheme` type to `"solaris" | "nordic" | "cashmere" | "boreal" | "matrix" | "crimson" | "daylight"`.
     - Registered all 7 themes with color swatches and tags in `OMNI_THEMES`.
     - In `useOmniTheme()`, added dynamic fallback verifying the current attribute against `OMNI_THEMES` and auto-correcting any invalid/liquid values to `"solaris"`.
  4. **Updated [`CommandPalette.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/layout/CommandPalette.tsx)**:
     - Dynamically generated theme switch actions for all 7 themes in the Cmd+K command search list.
  5. **Updated [`settings/page.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/settings/page.tsx)**:
     - Updated valid theme validator list and 4-column responsive grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
- **Verification**:
  - `npm run build`: 11/11 static pages generated with 0 errors.
  - `pytest`: 95/95 test cases passing (100%).
  - Playwright visual verification:
    - Captured `verified_settings_7themes.png` verifying all 7 cards.
    - Captured header and page screenshots for each theme (`theme_nordic_header.png`, `theme_cashmere_header.png`, `theme_boreal_header.png`, `theme_solaris_header.png`).
    - Verified complete absence of `FROSTED WHITE GLASS` or `Liquid` in DOM and header.

---

### 13.33 Cloudflare Security Audit Remediation & Defense Hardening (Phase 1-6)
- **Context**:
  - Full codebase security audit executed conforming to Cloudflare Security Audit standard across all 6 phases: Target Acquisition, Coverage Mapping, Hypothesis Generation, Vulnerability Analysis, Validation/Exploit Proofs, and Reporting.
  - Audit output stored in `C:\Users\singh\security-audit-skill\OmniDownloader\run-1\` (`findings.json`, `coverage-ledger.json`, `REPORT.md`, `FINDINGS-DETAIL.md`).
  - Passed both `validate-findings.cjs` and `validate-coverage-ledger.cjs` schema validations (100%).
- **Vulnerabilities Identified & Remediated**:
  1. **Finding 1 (High - CWE-918 SSRF via `format_id`)**:
     - *Root Cause*: `req.format_id` in `DownloadRequest` allowed passing raw `http://` or `https://` URLs which `DownloadEngine._download_task` converted into `target_download_url` and streamed without SSRF validation.
     - *Remediation*:
       - Added explicit `validate_url` and `await check_ssrf(valid_fmt)` in `backend/api/routes.py` (`create_download`).
       - Added defense-in-depth `validate_url` and `await check_ssrf(valid_fmt)` check in `backend/download/engine.py` (`_download_task`) before assigning `target_download_url`.
  2. **Finding 2 (High - CWE-306 Missing Authentication on Administrative Settings Endpoints)**:
     - *Root Cause*: When `require_api_key: true` was enabled, `PUT /api/settings`, `POST /api/settings/api-key/generate`, `DELETE /api/settings/api-key`, `POST /api/settings/cookies`, and `DELETE /api/settings/cookies` lacked the `verify_api_key` dependency, allowing unauthenticated network actors to disable authentication or overwrite cookies.
     - *Remediation*:
       - Added `api_key: Optional[str] = Depends(verify_api_key)` to all 5 administrative endpoints in `backend/api/routes.py`.
  3. **Finding 3 (Low - CWE-200 Host File & Directory Existence Oracle via `POST /api/open-folder`)**:
     - *Root Cause*: `POST /api/open-folder` accepted unconstrained arbitrary host paths and returned 404 vs 200 before launching system explorer processes, enabling local filesystem existence probing.
     - *Remediation*:
       - Enforced directory confinement restricting `norm_path` to `settings.download_dir` or `settings.temp_dir` unless the path originates from a verified database `download_id`. Raises HTTP 403 otherwise.
       - Added `api_key: Optional[str] = Depends(verify_api_key)` to `open_folder` and `open_download_folder`.
  4. **Finding 4 (Low - CWE-942 Permissive CORS Web Extension Wildcard)**:
     - *Root Cause*: `allow_origin_regex` in `backend/main.py` allowed any arbitrary `chrome-extension://.*` or `moz-extension://.*` with `allow_credentials=True`.
     - *Remediation*:
       - Pinned `allow_origin_regex` strictly to localhost origins: `r"^(http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?)$"`.
- **Automated Verification**:
  - Added new regression test suite `TestAuditRemediations` in [`tests/test_security.py`](file:///g:/Side%20Projects/OmniDownloader/tests/test_security.py).
  - Full test suite: 98/98 tests passing (100%).

---

### 13.34 JioSaavn Extractor & Featured Playlist Support
- **Issue**:
  - JioSaavn playlist URLs (e.g. `https://www.jiosaavn.com/featured/chhath-puja-/qrWIQ3Gcmsc_`) were failing to download.
  - **Root Causes**:
    1. **Missing Extractor**: No dedicated `JioSaavnExtractor` was registered in `backend/extractors/`. URLs defaulted to `GenericExtractor` (simple HTTP GET), bypassing yt-dlp's JioSaavn decryption engine.
    2. **Frontend Playlist Detection**: `isPlaylistUrl` in `frontend/src/components/download/UrlAnalyzer.tsx` only matched `/playlist`, `/sets/`, `/album/`, and `list=`. JioSaavn uses `/featured/` and `/s/playlist/`, preventing the UI from showing the "Analyze Playlist" button.
    3. **Internal yt-dlp Smuggle Fragments**: yt-dlp's flat playlist extraction returned URLs with internal metadata fragments (`#__youtubedl_smuggle=...`).
- **Remediation**:
  1. Created [`backend/extractors/jiosaavn.py`](file:///g:/Side%20Projects/OmniDownloader/backend/extractors/jiosaavn.py) supporting `jiosaavn.com` and `saavn.com` with single track and playlist extraction, audio bitrates (up to 320kbps), and album art.
  2. Registered `JioSaavnExtractor` in [`backend/extractors/__init__.py`](file:///g:/Side%20Projects/OmniDownloader/backend/extractors/__init__.py).
  3. Updated `isPlaylistUrl` in [`frontend/src/components/download/UrlAnalyzer.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/components/download/UrlAnalyzer.tsx) to match JioSaavn `/featured/` and `/s/playlist/`.
  4. Sanitized yt-dlp smuggle fragments in [`backend/extractors/base.py`](file:///g:/Side%20Projects/OmniDownloader/backend/extractors/base.py).
  5. Added JioSaavn to the platform showcase in [`frontend/src/app/sites/page.tsx`](file:///g:/Side%20Projects/OmniDownloader/frontend/src/app/sites/page.tsx).
  6. Added tests in [`tests/test_extractors.py`](file:///g:/Side%20Projects/OmniDownloader/tests/test_extractors.py).
  7. **Batch Queue Capacity & Instant Ingestion**:
     - Increased `validate_urls` cap in [`backend/models/schemas.py`](file:///g:/Side%20Projects/OmniDownloader/backend/models/schemas.py) from 50 to 250 URLs, preventing 422 errors on playlists with >50 tracks (such as the 55-track Chhath Puja playlist).
     - Added optional `items` metadata parameter to `BatchDownloadRequest` across backend and frontend. When queueing an analyzed playlist, track titles, thumbnails, and durations are passed directly from the client, eliminating redundant sequential `analyze` roundtrips (queueing 55 items dropped from ~110 seconds to **0.06 seconds**).
- **Verification**:
  - 99/99 pytest unit tests passed (100%).
  - Playlist extraction verified: 55 tracks extracted and queued in 0.06s.
  - Frontend production build succeeded with 0 errors.

---

### 13.35 Windows File Permission Hardening & Server Diagnostics Audit
- **Context & Diagnostics**:
  - Full system audit performed across FastAPI backend (`:8000`) and Next.js frontend (`:3000`).
  - **Identified Issue**: Windows file system / Defender lock on `frontend/.next/server/middleware-build-manifest.js` (`EPERM: operation not permitted`), which previously resulted in 500 Internal Server Errors when loading `http://localhost:3000`.
- **Remediation**:
  1. Configured `distDir: '.build'` in [`frontend/next.config.js`](file:///g:/Side%20Projects/OmniDownloader/frontend/next.config.js), isolating compile outputs from the locked `.next` path.
  2. Updated [`.gitignore`](file:///g:/Side%20Projects/OmniDownloader/.gitignore) to exclude `frontend/.build/` and `.build/`.
  3. Included `.build/types/**/*.ts` in [`frontend/tsconfig.json`](file:///g:/Side%20Projects/OmniDownloader/frontend/tsconfig.json).
- **Verification**:
  - **Backend**: 99/99 pytest tests passed (100%). `/health`, `/api/settings`, `/api/queue`, `/api/history`, `/api/extractors`, and WebSocket (`/ws/{client_id}`) all verified functional.
  - **Frontend Production Build**: `npm run build` compiled 11/11 static pages with 0 errors.
  - **Frontend Dev Server**: HTTP 200 OK verified across all 7 routes (`/`, `/dashboard`, `/queue`, `/history`, `/settings`, `/sites`, `/about`).
  - **Reverse Proxy**: `http://localhost:3000/api/settings` verified rewriting to `:8000` with 200 OK.
  - **Visual Capture**: Captured [`verified_server_homepage.png`](file:///C:/Users/singh/.gemini/antigravity/brain/7f72232e-13ba-45a1-9a24-e53f28d04b62/verified_server_homepage.png) confirming clean UI rendering.











