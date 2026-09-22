@echo off
title OmniDownload Launcher
echo ==============================================
echo       Starting OmniDownload Dev Servers
echo ==============================================

:: Find python in venv if available
set BACKEND_PY=python
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set BACKEND_PY="%~dp0backend\venv\Scripts\python.exe"
)

:: Start Backend in separate window
echo Starting Backend (FastAPI on http://localhost:8000)...
start "OmniDownload Backend" cmd /k "cd /d "%~dp0backend" && %BACKEND_PY% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: Start Frontend in separate window
echo Starting Frontend (Next.js on http://localhost:3000)...
start "OmniDownload Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Backend Docs: http://localhost:8000/docs
echo Frontend:     http://localhost:3000
echo.
pause
