#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "── Emma Revelation — 3D Music Hub & WebSocket Artist OS ────────"

# 1. Verify Node.js & npm (works cleanly with Kali nvm or NodeSource)
if ! command -v node >/dev/null 2>&1; then
  echo "[error] Node.js is not installed. Install Node.js (v20+) or nvm first."
  exit 1
fi

echo "[ok]   Node.js present: $(node -v) · npm $(npm -v)"

# 2. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "[setup] Installing npm packages (React, Three.js, Framer Motion, WebSocket, Tailwind)..."
  npm install
  echo "[ok]   Packages installed"
else
  echo "[ok]   node_modules already present"
fi

# 3. Detect local LAN IP (e.g. 192.168.1.51 on Kali)
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$LAN_IP" ]; then
  LAN_IP="localhost"
fi

echo "────────────────────────────────────────────────────────────────"
echo "[ready] Starting React + TypeScript + Three.js + WebSocket Server..."
echo "  ➜  Open on this PC:     http://localhost:5173"
echo "  ➜  Open on your Phone:  http://${LAN_IP}:5173  (same Wi-Fi)"
echo "  ➜  WebSocket Hub:       ws://${LAN_IP}:5173/ws-studio"
echo "────────────────────────────────────────────────────────────────"

exec npx vite --host 0.0.0.0 --port 5173
