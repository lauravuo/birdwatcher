# Testing Guide

## Running Tests Locally

### Unit Tests (Vitest)
Unit tests don't require the emulator and test isolated functions with mocks.

```bash
# Watch mode (re-runs on file changes)
npm test

# Run once
npm test -- --run

# Run specific test file
npm test src/lib/firestore.test.ts
```

### E2E Tests (Playwright with Firebase Emulator)
E2E tests use real Firebase Auth and Firestore via the emulator.

**Recommended Command (All-in-One)**
```bash
npm run test:e2e:emulator
```
This command uses `dotenv-cli` to load `.env.test` and `firebase emulators:exec` for safe lifecycle management (starts emulators, runs tests, stops emulators).

**Manual Control (Better for Debugging)**
```bash
# Terminal 1: Start emulator
npm run emulator:start

# Terminal 2: Run E2E tests
VITE_USE_EMULATOR=true npm run test:e2e
```

**Option 2: All-in-One Command**
```bash
npm run test:all
```

This command:
1. Runs unit tests (`npm test -- --run`)
2. Cleans up existing emulator ports
3. Starts emulators, runs E2E tests, and shuts them down automatically.

### Emulator UI
When the emulator is running, access the UI at:
- **Emulator UI**: http://localhost:4000
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080

## CI/CD Testing

### Pull Request Checks (`.github/workflows/pr.yml`)
Automatically runs on every PR:
1. Lint check (`npm run lint`)
2. Unit tests (`npm test`)
3. Build (`npm run build`)
4. E2E tests with emulator (`firebase emulators:exec`)

### Release Workflow (`.github/workflows/release.yml`)
Runs on merge to `main`:
1. Build production bundle
2. Semantic versioning
3. Deploy to Firebase Hosting
4. Deploy Firestore Rules

## Testing Strategy & Gaps

### Why Unit Tests?
Unit tests (`vitest`) are designed for **logic isolation**. We use them to test:
- Helper functions (e.g., join code normalization).
- Component rendering states.
- Mocked service interactions.

### Why Unit Tests didn't catch rules issues?
During the `firebase-tools` update, certain E2E tests failed because:
1. **Mocking**: Unit tests mock `firebase/firestore`. They assume the library works as expected and don't interact with real rules.
2. **Environment**: They run in Node, skipping the browser-specific logic and emulator connectivity.

### The Role of E2E Tests
We rely on **Playwright + Emulators** for:
- **Security Rules Validation**: Ensuring only authorized users can read/write data.
- **Integration**: Ensuring the frontend correctly interacts with the real Firebase SDK and backend services.
- **Cross-Browser**: Verifying behavior in Chromium/WebKit.

## Troubleshooting

### E2E Tests Fail Locally
- Ensure emulator is running (`npm run emulator:start`)
- Set `VITE_USE_EMULATOR=true` environment variable
- Check that ports 9099 (Auth) and 8080 (Firestore) are available

### CI Tests Fail
- Check GitHub Actions logs
- Verify Firebase service account has correct IAM roles:
  - Firebase Hosting Admin
  - Firebase Rules Admin
  - Service Usage Consumer

### Unit Tests Fail
- Unit tests don't need emulator
- Check that mocks are properly configured
- Run `npm ci` to ensure dependencies are fresh
