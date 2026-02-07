# Firebase Emulator Setup for Development

This guide explains how to use the Firebase Emulator for local development and testing.

## Quick Setup (Recommended)

**For Copilot environments, run the setup script first:**

```bash
./setup-copilot-env.sh
```

This automated script will:
- ✓ Install Java 21 if needed
- ✓ Set Java 21 as the default version
- ✓ Install Node.js dependencies
- ✓ Verify Firebase emulator availability
- ✓ Download emulator JARs (when network allows)

After setup completes, you can start using the emulator immediately.

## Why Use the Emulator?

The Firebase Emulator provides several advantages:
- **No real Firebase project needed** - Perfect for development and testing
- **Faster iteration** - No network latency
- **Test data isolation** - Safe environment for experiments
- **Cost-free** - No Firebase usage charges
- **Screenshot-friendly** - Use test data for documentation

## Prerequisites

### Java 21 or Higher

The Firebase Emulator requires Java 21 or higher.

**Check your Java version:**
```bash
java -version
```

**Install Java 21 (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install openjdk-21-jdk
```

**Set Java 21 as default:**
```bash
sudo update-alternatives --config java
# Select Java 21 from the list

# Set JAVA_HOME (add to ~/.bashrc for persistence)
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

**Verify setup:**
```bash
java -version
# Should show version 21.x.x
```

## Quick Start

### Option 1: All-in-One Script (Recommended)

The easiest way to start development with the emulator:

```bash
./start-dev-emulator.sh
```

This script will:
1. Start the Firebase Emulator
2. Seed it with test data
3. Launch the dev server
4. Display test user credentials

Press `Ctrl+C` to stop all services.

### Option 2: Manual Steps

If you prefer more control or the script doesn't work:

**Terminal 1 - Start Emulator:**
```bash
npm run emulator:start
```

Wait for the message: "All emulators ready!"

**Terminal 2 - Seed Test Data:**
```bash
npm run emulator:seed
```

**Terminal 3 - Start Dev Server:**
```bash
npm run dev:emulator
```

## Test Data

After seeding, you'll have access to:

### Test Users

| Email | Password | Current Month Birds | Previous Month Birds |
|-------|----------|---------------------|---------------------|
| alice@example.com | password123 | 5 | 2 |
| bob@example.com | password123 | 4 | 4 |
| charlie@example.com | password123 | 4 | 1 |
| david@example.com | password123 | 2 | 3 |
| eve@example.com | password123 | 1 | 0 |

### Test Group

- **Name:** Birdwatchers United
- **Join Code:** DEMO2024
- **Members:** All 5 test users

The test data is designed to demonstrate:
- Different bird counts for leaderboard sorting
- Tied scores (Bob and Charlie have same count)
- Empty states (Eve has no data in previous month)
- Month-to-month variation

## Emulator UI

The Firebase Emulator UI provides a web interface to inspect and manage data:

**Access at:** http://localhost:4000

Features:
- View Firestore collections and documents
- See authenticated users
- Clear all data
- View operation logs

## Environment Configuration

The emulator uses `.env.test` configuration:

```env
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-test.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-test
VITE_FIREBASE_STORAGE_BUCKET=demo-test.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_USE_EMULATOR=true
```

The app detects `VITE_USE_EMULATOR=true` and automatically connects to:
- Auth Emulator: `localhost:9099`
- Firestore Emulator: `localhost:8080`

## Troubleshooting

### Port Already in Use

If you see "Port already in use" errors:

```bash
npm run clean:emulators
```

This kills any lingering emulator processes.

### Emulator Won't Start

Check Java version:
```bash
java -version
# Must be 21 or higher
```

Check if ports are available:
```bash
lsof -i :8080,9099,4000
```

### Seed Script Fails

Ensure the emulator is running before seeding:
```bash
curl http://localhost:8080
# Should return HTML, not connection refused
```

### Can't Connect from Browser

Make sure you're using `npm run dev:emulator`, not `npm run dev`.

The emulator mode requires the `VITE_USE_EMULATOR=true` environment variable.

## CI/CD Integration

The GitHub Actions workflow uses the emulator for E2E tests:

```yaml
- name: Run E2E tests with emulator
  run: npm run test:e2e:emulator
```

The `test:e2e:emulator` script:
1. Starts the emulator
2. Runs Playwright tests
3. Shuts down the emulator

## Cleaning Up

To stop all services:
- If using the script: Press `Ctrl+C`
- If running manually: Stop each terminal process
- To kill lingering processes: `npm run clean:emulators`

## Advanced Usage

### Custom Seed Data

Edit `scripts/seed-emulator.js` to customize:
- User names and emails
- Bird sighting data
- Group configurations
- Add more groups or users

After editing, run:
```bash
npm run emulator:seed
```

### Persistent Data

By default, emulator data is cleared when stopped. To persist data:

Edit `firebase.json`:
```json
{
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### Export/Import Data

Export current emulator state:
```bash
npx firebase emulators:export ./emulator-data
```

Start with exported data:
```bash
npx firebase emulators:start --import=./emulator-data
```

## Best Practices

1. **Always use emulator for development** - Avoid touching production data
2. **Seed fresh data regularly** - Keep test scenarios consistent
3. **Test edge cases** - Use the varied test data to verify all states
4. **Take screenshots** - Use emulator mode for PR documentation
5. **Clear data between tests** - Restart emulator for clean state

## References

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Local Development Best Practices](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)
