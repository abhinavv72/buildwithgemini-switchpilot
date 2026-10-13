#!/bin/bash
set -e
echo "Starting JobPilot backend server on port 4000..."
npx tsx server/index.ts &
SERVER_PID=$!

echo "Starting JobPilot Vite frontend on port 5173..."
npx vite --host 127.0.0.1 --port 5173 &
VITE_PID=$!

trap "kill $SERVER_PID $VITE_PID 2>/dev/null" EXIT
wait
