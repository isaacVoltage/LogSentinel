#!/bin/bash
set -e

echo "=================================================================="
echo " 🚀 LogSentinel — AI-Driven Log Anomaly Detector (Demo Setup)"
echo "=================================================================="

# Check if Docker Compose is installed
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "🐳 Docker detected. Building and launching services via Docker Compose..."
    docker-compose up --build -d
    echo "✅ Containers launched successfully!"
    echo "   - Frontend Dashboard: http://localhost:3000"
    echo "   - FastAPI Backend API: http://localhost:8000/docs"
    echo ""
    echo "🚀 Starting Log Simulator stream (Rate: 3 logs/sec, Mode: MIXED)..."
    python3 backend/scripts/simulate_logs.py --rate 3 --mode mixed
else
    echo "⚠️ Docker not detected. Setting up local Python & Node environments..."
    cd backend
    pip install -r requirements.txt
    python3 -m app.ml.train
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ../frontend
    npm install
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    sleep 3
    python3 backend/scripts/simulate_logs.py --rate 3 --mode mixed
fi
