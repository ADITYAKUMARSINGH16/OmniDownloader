# OmniDownload — Universal Media & File Downloader

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.1+-000000.svg?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**OmniDownload** is a modern, high-performance universal downloader application built with a plugin-based architecture. Download videos, music, and files from popular social media platforms, cloud storage, and direct links with real-time progress tracking, automatic FFmpeg audio/video merging, and a sleek Next.js 14 interface.

---

## ✨ Features

- **🌐 Universal Downloader**: Effortlessly download from YouTube, Reddit, Twitter/X, Instagram, Facebook, TeraBox, and direct HTTP/HTTPS URLs.
- **🎛️ Resolution & Format Selection**: Select resolutions from 4K (2160p), 1440p, 1080p, 720p, down to 480p/360p, or download audio-only tracks (MP3/M4A/Opus) with estimated file sizes and bitrates.
- **🎬 Intelligent Audio/Video Merging**: Automatically combines high-resolution video streams (e.g. YouTube DASH) with the best available audio track via FFmpeg into a playable MP4 container.
- **⚡ Live Progress & Speed Tracking**: WebSocket-driven real-time updates showing live download percentage, download speed (KB/s / MB/s), ETA countdown, and file sizes.
- **📂 Native "Open Folder" Support**: Launch your system's file explorer (Windows Explorer, macOS Finder, Linux file manager) directly to the downloaded file with a single click.
- **🚦 Queue & Concurrency Management**: Configurable concurrent downloads, priority queueing, retry logic, and pause/resume/cancel controls.
- **📊 Real-time Dashboard**: Live statistics tracking active downloads, speeds, and completed files.
- **📜 Download History**: Persistent SQLite-backed history with search, sorting, and one-click re-download or deletion.
- **🧩 Browser Extension**: Manifest V3 extension for Chrome, Edge, and Brave with right-click context menu and media detection.
- **🛡️ Security First**: SSRF protection against private IP ranges, URL scheme validation, filename sanitization, and path traversal prevention.
- **🎨 Modern Glassmorphic UI**: Built with Next.js 14 App Router, Tailwind CSS, Lucide Icons, and dark/light mode support.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** or **3.12**
- **Node.js 18+** or **20+**
- **FFmpeg & FFprobe**: Required for media processing and audio/video merging. Must be installed and accessible on your system `PATH`.
  - *Windows (via winget)*: `winget install Gyan.FFmpeg`
  - *macOS (via Homebrew)*: `brew install ffmpeg`
  - *Ubuntu/Debian*: `sudo apt update && sudo apt install -y ffmpeg`
- **Docker & Docker Compose** *(Optional, for containerized run)*

---

### Option 1: One-Command All-in-One Launch (Recommended for Local Dev)

OmniDownload includes built-in launcher scripts that automatically detect your Python virtual environment (`backend/venv`) and launch both the **FastAPI backend** and **Next.js frontend** concurrently:

- **PowerShell (Separate Windows)**:
  ```powershell
  .\start.ps1
  ```
  *(If PowerShell execution policy is restricted: `powershell -ExecutionPolicy Bypass -File .\start.ps1`)*

- **Unified Python Runner (Same Terminal)**:
  ```bash
  python start.py
  ```
  *Streams colored `[BACKEND]` and `[FRONTEND]` logs into one console and cleans up child processes on Ctrl+C.*

- **Windows Batch File (Double-Click)**:
  ```cmd
  start.bat
  ```

---

### Option 2: Run with Docker Compose (Fastest Containerized)

```bash
# Clone repository
git clone https://github.com/ADITYAKUMARSINGH16/OmniDownloader.git
cd OmniDownloader

# Start services
docker-compose up -d --build

# View logs (optional)
docker-compose logs -f
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

To stop services:
```bash
docker-compose down
```

---

### Option 3: Manual Local Development Setup

#### 1. Backend (FastAPI)

**Windows (PowerShell):**
```powershell
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```

**Linux / macOS:**
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```

The backend starts at **`http://localhost:8000`** with live auto-reload capability and interactive Swagger docs at **`http://localhost:8000/docs`**.

#### 2. Frontend (Next.js 14)

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend will be available at **`http://localhost:3000`**.

---

## ⚙️ Configuration

Environment variables can be configured in a `.env` file at the root or within `backend/`:

```env
# Application
APP_NAME=OmniDownload
APP_VERSION=1.0.0
DEBUG=false

# Server
HOST=0.0.0.0
PORT=8000

# File Storage
DOWNLOAD_DIR=./downloads
TEMP_DIR=./temp

# Download Concurrency & Limits
MAX_FILE_SIZE=10737418240       # 10 GB limit
MAX_CONCURRENT_DOWNLOADS=2      # Concurrent tasks
DEFAULT_RETRIES=3
REQUEST_TIMEOUT=30

# FFmpeg Executable Paths (defaults to PATH)
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/omnidownload.db

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

---

## 🏗️ Project Architecture

```
OmniDownload/
├── backend/                       # FastAPI Python Service
│   ├── api/                      # REST & WebSocket Routes
│   │   ├── routes.py             # Download, Queue, History, Settings & File Explorer APIs
│   │   └── websocket.py          # WebSocket Connection Manager
│   ├── core/                     # Application Configuration & Security
│   │   ├── config.py             # Pydantic Settings
│   │   ├── database.py           # Async SQLAlchemy Engine & Session Generator
│   │   ├── exceptions.py         # Custom Error Handlers
│   │   └── security.py           # SSRF Validator, Safe Paths, Sanitization
│   ├── download/                 # Download Engine
│   │   └── engine.py             # yt-dlp & HTTP Engine with Audio Merge & Progress Hooks
│   ├── extractors/               # Extractor Plugin System
│   │   ├── base.py               # BaseExtractor & ExtractorRegistry
│   │   ├── youtube.py            # YouTube Extractor
│   │   ├── reddit.py             # Reddit Extractor
│   │   ├── twitter.py            # Twitter/X Extractor
│   │   ├── instagram.py          # Instagram Extractor
│   │   ├── facebook.py           # Facebook Extractor
│   │   ├── terabox.py            # TeraBox Cloud Extractor
│   │   └── generic.py            # Generic Direct Link Extractor
│   ├── models/                   # Data Schemas & DB Models
│   │   ├── database.py           # SQLAlchemy DownloadItem, QueueItem, Setting
│   │   └── schemas.py            # Pydantic Schemas & Quality Definitions
│   ├── queue/                    # Queue Manager
│   │   └── manager.py            # Priority Queue & Concurrency Worker
│   ├── services/                 # Background Services
│   │   └── ffmpeg.py             # FFmpeg Subprocess Wrapper
│   ├── main.py                   # FastAPI Application Entry Point
│   └── requirements.txt          # Python Dependencies
│
├── frontend/                      # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── page.tsx          # Main Dashboard & Quick Stats
│   │   │   ├── queue/page.tsx    # Live Download Queue
│   │   │   ├── history/page.tsx  # Download History & Search
│   │   │   ├── sites/page.tsx    # Supported Platforms Catalog
│   │   │   └── settings/page.tsx # App Settings & Storage Configuration
│   │   ├── components/           # React Components
│   │   │   ├── download/         # UrlAnalyzer, DownloadQueue, Format Selector
│   │   │   ├── layout/           # Navbar, Sidebar, Footer
│   │   │   └── ui/               # shadcn/ui Design Elements
│   │   ├── hooks/                # Custom Hooks (useWebSocket, useDownload)
│   │   ├── services/             # API Client & Axios Instance
│   │   └── types/                # TypeScript Interfaces
│   ├── package.json              # Frontend Dependencies
│   └── next.config.js            # Next.js Configuration & API Proxying
│
├── browser-extension/             # Browser Extension (Manifest V3)
│   ├── manifest.json             # Extension Manifest
│   ├── background.js             # Context Menu & Download Dispatcher
│   ├── content.js                # On-Page Media Sniffer
│   ├── popup.html                # Quick Download Popup
│   └── popup.js                  # Popup Controller
│
├── tests/                         # Test Suite
│   ├── test_engine.py            # Download Engine Tests
│   ├── test_extractors.py        # Extractor Parsing Tests
│   ├── test_queue.py             # Queue Lifecycle Tests
│   └── test_security.py          # Security & SSRF Protection Tests
│
├── start.ps1                      # PowerShell All-in-One Launcher (Multi-Window)
├── start.py                       # Unified Python Runner (Same Terminal with Clean Exit)
├── start.bat                      # Windows Batch File Launcher
├── docker-compose.yml             # Container Orchestration
├── Dockerfile.backend             # Backend Container Definition
├── Dockerfile.frontend            # Frontend Container Definition
├── IDEA.md                        # Product Vision & Architecture Design
├── to.md                          # Quick Run Guide
└── README.md                      # Complete Project Documentation
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Analyzes a URL and extracts media metadata, thumbnails, and available formats |
| `POST` | `/api/download` | Enqueues a new download with chosen format, quality, and metadata |
| `GET` | `/api/download/{id}` | Gets status and metadata for a specific download |
| `POST` | `/api/download/{id}/pause` | Pauses an active download |
| `POST` | `/api/download/{id}/resume` | Resumes a paused download |
| `POST` | `/api/download/{id}/cancel` | Cancels an ongoing download and cleans temp files |
| `POST` | `/api/download/{id}/retry` | Retries a failed download |
| `DELETE` | `/api/download/{id}` | Removes a download record and deletes local files |
| `POST` | `/api/download/{id}/open-folder` | Opens system file explorer highlighting the downloaded file |
| `GET` | `/api/download/{id}/file` | Streams or downloads the file directly to the client browser |
| `POST` | `/api/open-folder` | Opens a custom folder path or highlights a file in file explorer |
| `GET` | `/api/queue` | Fetches active downloads, queued items, and queue metrics |
| `GET` | `/api/history` | Fetches completed and archived downloads with filtering |
| `DELETE` | `/api/history` | Clears completed download history |
| `GET` | `/api/settings` | Retrieves current application settings |
| `PUT` | `/api/settings` | Updates concurrency, speed limits, directories, etc. |
| `WS` | `/ws/{client_id}` | Real-time WebSocket connection for live download progress, speed, and ETA broadcasts |

---

## 🌐 Supported Sites

| Platform | Domains | Media Supported | Format Options |
|---|---|---|---|
| **YouTube** | `youtube.com`, `youtu.be` | Videos, Shorts, Music | 4K (2160p), 1440p, 1080p, 720p, 480p, MP3/M4A Audio |
| **Reddit** | `reddit.com`, `v.redd.it` | Video posts, GIFs, Galleries | Highest available resolution with auto-merged audio |
| **Twitter / X** | `twitter.com`, `x.com` | Video clips, GIFs | Multiple MP4 bitrates |
| **Instagram** | `instagram.com` | Reels, Posts, Stories | Direct MP4 streams |
| **Facebook** | `facebook.com`, `fb.watch` | Public videos, Reels | HD & SD MP4 |
| **TeraBox** | `terabox.com`, `teraboxapp.com` | Shared files and videos | Direct download links |
| **Direct Links** | Any HTTP/HTTPS link | ISO, ZIP, PDF, Video, Audio | Raw chunked stream download |

---

## 🔌 Browser Extension (Manifest V3)

Easily send links from your browser directly to your OmniDownload queue:

1. Open Chrome, Edge, or Brave and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `browser-extension` folder.
4. Right-click any video or link on any website and select **"Download with OmniDownload"**, or click the extension popup to analyze the active tab.

---

## 🧪 Testing

Run the automated backend test suite (49+ unit tests covering extractors, queue, security, and engine):

```bash
# Run tests from project root using backend venv
.\backend\venv\Scripts\pytest.exe -v

# Or run from inside backend directory:
cd backend
pytest ..\tests -v
```

Verify frontend build integrity:

```bash
cd frontend
npm run build
```

---

## 🛡️ Security

OmniDownload is engineered with defense-in-depth security principles:
- **SSRF Prevention**: All URLs are validated against private, loopback, link-local, and reserved IP ranges (RFC 1918, RFC 3927, RFC 4193).
- **Safe Filenames**: Strict sanitation ensures filenames cannot contain relative traversal sequences (`../`, `..\`) or illicit filesystem characters.
- **Restricted Protocols**: Only `http://` and `https://` schemes are processed.
- **Resource Protection**: Maximum file size and concurrency limits prevent disk and bandwidth exhaustion.

---

## 👤 Author

**Aditya Kumar Singh**
- GitHub: [@ADITYAKUMARSINGH16](https://github.com/ADITYAKUMARSINGH16)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

OmniDownload is designed for downloading publicly accessible media and files that you own or have explicit permission to download. Please respect copyright laws and the Terms of Service of the respective platforms.