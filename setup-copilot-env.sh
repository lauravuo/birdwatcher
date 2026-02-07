#!/bin/bash
#
# Setup script for Copilot environment
# This script ensures Java 21 and Firebase emulator are properly configured
#

set -e

echo "🔧 Setting up Copilot environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check and setup Java 21
echo ""
echo "📦 Step 1: Checking Java version..."

CURRENT_JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
echo "Current Java version: $CURRENT_JAVA_VERSION"

if [ "$CURRENT_JAVA_VERSION" -lt 21 ]; then
    echo -e "${YELLOW}⚠️  Java 21 or higher is required (current: $CURRENT_JAVA_VERSION)${NC}"
    echo "Installing Java 21..."
    
    # Check if running on Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y openjdk-21-jdk
        
        # Set Java 21 as default
        sudo update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java || \
        sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1 || \
        echo "Could not set alternatives, continuing..."
        
        export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
        export PATH=$JAVA_HOME/bin:$PATH
    else
        echo -e "${RED}❌ Unsupported system. Please install Java 21 manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Java 21+ is already installed${NC}"
fi

# Verify Java version after setup
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo -e "${RED}❌ ERROR: Java version is still $JAVA_VERSION after setup!${NC}"
    echo "Please install Java 21+ manually and set JAVA_HOME"
    exit 1
fi

echo -e "${GREEN}✓ Java version verified: $(java -version 2>&1 | head -1)${NC}"
echo "JAVA_HOME: ${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}"

# Step 2: Check Node.js dependencies
echo ""
echo "📦 Step 2: Checking Node.js dependencies..."

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo -e "${GREEN}✓ Node modules already installed${NC}"
fi

# Step 3: Verify Firebase emulator is available
echo ""
echo "📦 Step 3: Verifying Firebase emulator..."

if [ -f "node_modules/.bin/firebase" ]; then
    echo -e "${GREEN}✓ Firebase CLI is available${NC}"
    
    # Try to download emulator JARs (this will use the cache if available)
    echo "Checking Firebase emulator cache..."
    
    # Set JAVA_HOME for Firebase
    export JAVA_HOME=${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}
    
    # Download emulators (will skip if already cached)
    ./node_modules/.bin/firebase setup:emulators:firestore || echo "Firestore emulator setup skipped (may already be cached)"
    
    echo -e "${GREEN}✓ Firebase emulator is ready${NC}"
else
    echo -e "${RED}❌ Firebase CLI not found. Run 'npm install' first.${NC}"
    exit 1
fi

# Step 4: Summary
echo ""
echo "========================================="
echo -e "${GREEN}✓ Copilot environment setup complete!${NC}"
echo "========================================="
echo ""
echo "Java version: $(java -version 2>&1 | head -1)"
echo "JAVA_HOME: ${JAVA_HOME:-Not set}"
echo "Firebase CLI: Available at ./node_modules/.bin/firebase"
echo ""
echo "You can now run:"
echo "  ./start-dev-emulator.sh   # Start emulator with test data"
echo "  npm run dev:emulator      # Start dev server with emulator"
echo ""
