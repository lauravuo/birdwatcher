#!/bin/bash
#
# Start development environment with Firebase emulator
# This script starts the Firebase emulator, seeds it with test data,
# and launches the dev server
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Birdwatcher Development Environment with Emulator${NC}\n"

# Check if Java 21 is available
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -ge 21 ]; then
        echo -e "${GREEN}✓ Java $JAVA_VERSION detected${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Java 21 or higher is recommended. Current version: $JAVA_VERSION${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Warning: Java not found. Please install Java 21 or higher.${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    # Clean up emulator processes
    npm run clean:emulators > /dev/null 2>&1 || true
    echo -e "${GREEN}Cleanup complete${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Firebase emulator in background
echo -e "${BLUE}📦 Starting Firebase Emulator...${NC}"
npm run emulator:start > emulator.log 2>&1 &
EMULATOR_PID=$!

# Wait for emulator to be ready
echo -e "${YELLOW}Waiting for emulator to start...${NC}"
MAX_WAIT=30
COUNTER=0
until curl -s http://localhost:8080 > /dev/null 2>&1 || [ $COUNTER -eq $MAX_WAIT ]; do
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done
echo ""

if [ $COUNTER -eq $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠ Emulator took longer than expected to start${NC}"
    echo -e "${YELLOW}  Check emulator.log for details${NC}"
    echo -e "${BLUE}  Continuing anyway...${NC}"
else
    echo -e "${GREEN}✓ Firebase Emulator is ready${NC}"
fi

# Seed the emulator with test data
echo -e "\n${BLUE}🌱 Seeding emulator with test data...${NC}"
if npm run emulator:seed; then
    echo -e "${GREEN}✓ Test data seeded successfully${NC}"
    echo -e "\n${GREEN}Test Users:${NC}"
    echo -e "  • alice@example.com / password123"
    echo -e "  • bob@example.com / password123"
    echo -e "  • charlie@example.com / password123"
    echo -e "  • david@example.com / password123"
    echo -e "  • eve@example.com / password123"
    echo -e "\n${GREEN}Group Join Code:${NC} DEMO2024\n"
else
    echo -e "${YELLOW}⚠ Failed to seed data, but continuing...${NC}"
fi

# Start the development server
echo -e "${BLUE}🌐 Starting development server...${NC}"
echo -e "${GREEN}Opening Birdwatcher on http://localhost:5173${NC}\n"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

npm run dev:emulator

# This line should not be reached due to the trap
wait
