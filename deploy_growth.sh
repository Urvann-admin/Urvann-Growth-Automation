#!/bin/bash
# Deploy script for Urvann Growth Automation (this project).
# Run on server: bash deploy_growth.sh
#
# IMPORTANT – Do not cause the build folder to disappear:
# - Do NOT run 'rm -rf' on the project directory or .next before/after pull.
# - Do NOT deploy by cloning into a fresh directory and then only running
#   'npm start' without running 'npm run build' first.
# - Do NOT use a cron or cleanup job that deletes .next or the app directory.
# - Always run 'npm run build' after pulling code, then start with 'npm run start'
#   (or use the standalone server; see below).
set -e

echo "=== Deploying Urvann Growth Automation ==="
echo ""

# Set this to your project directory on the server
APP_DIR="${APP_DIR:-$(pwd)}"
cd "$APP_DIR"

echo "=== Git status ==="
git status 2>&1 | head -5
echo ""

echo "=== Pulling latest changes ==="
git stash 2>&1 || true
git pull origin main 2>&1 || echo "Not a git repo or no remote"
echo ""

echo "=== Installing dependencies ==="
npm ci 2>/dev/null || npm install
echo ""

echo "=== Building (creates/updates .next) ==="
npm run build
echo ""

echo "=== Restarting app ==="
# If using PM2:
if command -v pm2 &>/dev/null; then
  pm2 restart urvann-growth-automation 2>/dev/null || pm2 start npm --name "urvann-growth-automation" -- start
  sleep 2
  pm2 list | grep -E "urvann|growth" || true
else
  echo "PM2 not found. Run manually: npm run start"
fi
echo ""

echo "✅ Growth deployment complete."
echo ""
echo "Optional: To run from standalone (if .next is ever removed elsewhere), after build run:"
echo "  cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "  PORT=3000 node .next/standalone/server.js"
