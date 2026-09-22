# OmniDownload — How to Run

A comprehensive guide to running both the backend and frontend of OmniDownload locally or in containers.

---

## ⚡ Option 1: One-Command All-in-One Launch (Recommended for Local Dev)

OmniDownload provides preconfigured launcher scripts that automatically detect your Python virtual environment (`backend/venv`), set up paths, and start both the **FastAPI backend** and **Next.js frontend** concurrently.

### A. PowerShell Script (Separate Windows)
Launches the backend and frontend in their own PowerShell terminal windows:
```powershell
.\start.ps1
```
> **Tip:** If PowerShell restricts script execution, run:
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\start.ps1
> ```

### B. Unified Python Runner (Same Terminal)
Streams both backend and frontend logs into a single terminal window with colored tags (`[BACKEND]` / `[FRONTEND]`) and cleanly terminates both processes on <kbd>Ctrl</kbd> + <kbd>C</kbd>:
```bash
python start.py
```

### C. Windows Batch File (Double-Click)
Double-click `start.bat` in Windows File Explorer or execute in Command Prompt:
```cmd
start.bat
```

---

## 🐳 Option 2: Run with Docker Compose

Make sure Docker and Docker Compose are installed and running.

```bash
# 1. Start all services (Backend + Frontend) in the background
docker-compose up -d --build

# 2. View container logs in real time (optional)
docker-compose logs -f

# 3. Stop all services when done
docker-compose down
```

---

## 🛠️ Option 3: Manual Step-by-Step Local Setup

Use this if you prefer running each server manually in separate terminal windows.

### Prerequisites
- **Python 3.11+** or **3.12**
- **Node.js 18+** or **20+**
- **FFmpeg & FFprobe** on your system `PATH` (e.g., `winget install Gyan.FFmpeg` on Windows)

### Terminal 1: Backend (FastAPI)
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (first time setup)
pip install -r requirements.txt

# Run the backend server with hot-reload
uvicorn main:app --reload --host 127.0.0.1 --port 8000
# (or python main.py)
```
*Backend runs at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

### Terminal 2: Frontend (Next.js 14)
```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies (first time setup)
npm install

# Start the Next.js development server
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

---

## 🌐 Application URLs

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:3000](http://localhost:3000) | Main user interface and downloader dashboard |
| **Backend API Docs** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive Swagger documentation & testing |
| **Backend Health Check** | [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) | Service health check |
| **WebSocket Stream** | `ws://127.0.0.1:8000/ws/{client_id}` | Real-time download progress broadcasting |

---

## 🧪 Running the Automated Test Suite

To run the backend test suite (unit tests for extractors, queue, download engine, and security):

```powershell
# Run from project root using backend venv
.\backend\venv\Scripts\pytest.exe -v
```