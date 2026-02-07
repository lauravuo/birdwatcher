#!/bin/bash
#
# Simple dev server start script with mock data mode
# This bypasses the emulator and uses a mock/demo mode
#

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Birdwatcher Development Server${NC}\n"
echo -e "${GREEN}Note: Running in standard dev mode${NC}"
echo -e "${GREEN}For emulator mode, ensure Firebase emulators are downloaded first${NC}\n"

# Start the dev server
npm run dev
