@echo off
setlocal
cd /d "%~dp0"

title OmniDownload Dev Launcher

echo ==============================================
echo        Starting OmniDownload Dev Servers     
echo ==============================================

:: 1. Locate Python executable (prefer backend\venv)
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_CMD=%~dp0backend\venv\Scripts\python.exe"
) else (
    set "PY_CMD=python"
)

:: 2. Check if user requested separate terminal windows: start.cmd --separate
if "%1"=="--separate" goto :launch_separate
if "%1"=="-s" goto :launch_separate

:: 3. Default: Unified runner with colored logs in one terminal (Ctrl+C cleanly stops both)
if exist "%~dp0start.py" (
    "%PY_CMD%" "%~dp0start.py"
    if errorlevel 1 pause
    exit /b %errorlevel%
)

:launch_separate
echo Launching Backend (FastAPI on http://127.0.0.1:8000)...
start "OmniDownload - Backend" cmd /k "cd /d "%~dp0backend" && "%PY_CMD%" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Launching Frontend (Next.js on http://localhost:3000)...
start "OmniDownload - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers have been launched in separate terminal windows!
echo Backend Docs: http://127.0.0.1:8000/docs
echo Frontend App: http://localhost:3000
echo.
pause
