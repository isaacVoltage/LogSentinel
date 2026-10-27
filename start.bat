@echo off
title LogSentinel Launcher
echo ==================================================================
echo   LogSentinel - AI-Driven Real-Time Log Anomaly Detector
echo ==================================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "LogSentinel Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Frontend on http://localhost:3000 ...
start "LogSentinel Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo.
echo ==================================================================
echo   LogSentinel services are now running!
echo   - Web Dashboard:  http://localhost:3000
echo   - Backend Swagger: http://localhost:8000/docs
echo ==================================================================
echo.
echo To simulate logs, you can run:
echo   python backend\scripts\simulate_logs.py --rate 3 --mode mixed
echo.
pause
