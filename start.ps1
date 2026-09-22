# OmniDownload PowerShell Launcher
$RootDir = $PSScriptRoot

Write-Host "==============================================" -ForegroundColor Green
Write-Host "       Starting OmniDownload Dev Servers      " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Locate Python in backend virtual environment or fallback to system python
$BackendPy = "python"
if (Test-Path "$RootDir\backend\venv\Scripts\python.exe") {
    $BackendPy = "$RootDir\backend\venv\Scripts\python.exe"
}

Write-Host "Backend Python: $BackendPy" -ForegroundColor Yellow
Write-Host "Backend Dir:    $RootDir\backend" -ForegroundColor Yellow
Write-Host "Frontend Dir:   $RootDir\frontend" -ForegroundColor Yellow
Write-Host ""

# Start Backend in a new PowerShell window
Write-Host "Launching Backend (FastAPI on http://127.0.0.1:8000)..." -ForegroundColor Cyan
Start-Process powershell.exe -WorkingDirectory "$RootDir\backend" -ArgumentList "-NoExit", "-Command", "& `"$BackendPy`" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

# Start Frontend in a new PowerShell window
Write-Host "Launching Frontend (Next.js on http://localhost:3000)..." -ForegroundColor Magenta
Start-Process powershell.exe -WorkingDirectory "$RootDir\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "`nBoth servers have been launched in separate terminal windows!" -ForegroundColor Green
Write-Host "Backend Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Magenta

