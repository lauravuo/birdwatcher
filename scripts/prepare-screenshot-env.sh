#!/bin/bash

# Exit on error
set -e

echo "🧹 Preparing environment for screenshots..."

# 1. Clean up existing processes
echo "🧹 Cleaning up existing emulators..."
npm run clean:emulators || true

# 2. Setup environment variables
echo "⚙️  Setting up environment..."
cp .env.test .env
export VITE_USE_EMULATOR=true
# Load .env vars into current shell just in case, but dotenv-cli handles it for the test
# export $(cat .env | xargs)

# Check for Java (required for emulators)
if ! command -v java &> /dev/null; then
    echo "❌ Error: Java is not installed or not in PATH. Firebase emulators require Java."
    exit 1
fi

# 3. Start Emulators in background
echo "🔥 Starting Firebase Emulators..."
# Force project demo-test to match .env.test
# Use npx to ensure local version (v15+) is used, not system (v7.11)
npx firebase emulators:start --only auth,firestore --project demo-test > emulator.log 2>&1 &
EMULATOR_PID=$!

# Wait for emulator to be ready
echo "⏳ Waiting for emulators to start..."
timeout=60
count=0
echo "   Waiting for Auth (9099) and Firestore (8080)..."

while ! nc -z localhost 9099 || ! nc -z localhost 8080; do   
  sleep 1
  count=$((count + 1))
  if [ $count -ge $timeout ]; then
      echo "❌ Error: Emulators failed to start within $timeout seconds."
      echo "   Check emulator.log for details."
      echo "   Common issues: Java missing, ports 8080/9099 in use, or project config mismatch."
      kill $EMULATOR_PID 2>/dev/null || true
      exit 1
  fi
done
echo "✅ Emulators are up!"

# 4. Start Dev Server
echo "🚀 Starting Vite Dev Server..."
npm run dev > /dev/null 2>&1 &
DEV_SERVER_PID=$!

sleep 5

# 5. Run Seeding Script
echo "🌱 Seeding test data..."
# Run the playwright setup script using the project that handles setup
# We use dotenv to ensure test process has env vars
RUN_SEED_SCRIPT=1 npx dotenv -e .env -- npx playwright test e2e/setup/seed-screenshot-data.spec.ts --project=chromium

echo ""
echo "✅ Environment Ready!"
echo "🌐 open http://localhost:5173"
echo "Press CTRL+C to stop the environment"

# 6. Wait for user to exit
# This keeps the script running so the background processes (emulator, vite) stay alive
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $EMULATOR_PID 2>/dev/null || true
  kill $DEV_SERVER_PID 2>/dev/null || true
  # Also run clean:emulators to be sure
  npm run clean:emulators
  exit
}

trap cleanup INT

wait
