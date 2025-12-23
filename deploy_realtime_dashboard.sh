#!/bin/bash

# Deploy Real-Time Dashboard Script
# Run this on the server: bash deploy_realtime_dashboard.sh

set -e

echo "=== Deploying Real-Time Dashboard ==="
echo ""

cd ~/Urvann-Real-Time-Dashboard

echo "=== Checking git status ==="
git status 2>&1 | head -5
echo ""

echo "=== Pulling latest changes ==="
git stash 2>&1 || true
git pull origin main 2>&1 || echo "Not a git repo or no remote configured"
echo ""

echo "=== Installing backend dependencies ==="
cd backend
npm install
echo ""

echo "=== Installing frontend dependencies ==="
cd ../frontend
npm install
echo ""

echo "=== Building frontend ==="
npm run build
echo ""

echo "=== Restarting PM2 service ==="
cd ..
pm2 restart urvann-real-time-dashboard-backend
sleep 3
echo ""

echo "=== Verifying service ==="
pm2 list | grep real-time
echo ""

echo "=== Testing endpoint ==="
curl -s -o /dev/null -w "Real-Time Dashboard: HTTP %{http_code}\n" http://localhost:5002/dashboard/realtime-orders
echo ""

echo "✅ Real-Time Dashboard deployment complete!"

