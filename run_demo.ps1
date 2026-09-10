# LogSentinel Single-Command Demo Launcher for Windows
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " 🚀 LogSentinel — AI-Driven Log Anomaly Detector (Windows Demo)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# Check if Docker is available
$dockerAvailable = Get-Command docker-compose -ErrorAction SilentlyContinue

if ($dockerAvailable) {
    Write-Host "🐳 Docker detected. Building and launching services via Docker Compose..." -ForegroundColor Green
    docker-compose up --build -d
    Write-Host "✅ Containers launched successfully!" -ForegroundColor Green
    Write-Host "   - Frontend Dashboard: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   - FastAPI Backend API: http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🚀 Launching Autonomous Log Stream Simulator..." -ForegroundColor Cyan
    python backend/scripts/simulate_logs.py --rate 3 --mode mixed
} else {
    Write-Host "⚠️ Docker Compose not found. Starting local python & node processes..." -ForegroundColor Yellow
    Set-Location backend
    pip install -r requirements.txt
    python -m app.ml.train
    Start-Process uvicorn -ArgumentList "app.main:app --host 0.0.0.0 --port 8000"
    Set-Location ../frontend
    npm install
    Start-Process npm -ArgumentList "run dev"
    Set-Location ..
    Start-Sleep -Seconds 3
    python backend/scripts/simulate_logs.py --rate 3 --mode mixed
}
