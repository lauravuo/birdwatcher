# Taking Screenshots for UI Changes

When implementing UI changes, **ALWAYS** take multiple screenshots to attach to the pull request. This helps reviewers understand the visual impact of your changes.

## Prerequisites

1. **Use Firebase Emulator with Development Server**
   - The development server must connect to the Firebase emulator (not production)
   - This ensures a safe, isolated environment for testing

2. **Set up environment for emulator**
   - Use `.env.test` configuration which sets `VITE_USE_EMULATOR=true`
   - Emulator uses ports: 9099 (Auth), 8080 (Firestore), 4000 (Emulator UI)

## Step-by-Step Screenshot Process

### 1. Start the Firebase Emulator
```bash
# Start emulator in background (detached mode)
npm run emulator:start
```

Wait for the emulator to fully start (usually 10-20 seconds). You should see:
```
✔  All emulators ready! View status and logs at http://localhost:4000
```

### 2. Configure Environment for Emulator
```bash
# Create a temporary .env file for screenshots
cp .env.test .env
```

This ensures the dev server connects to the emulator instead of production.

### 3. Start Development Server
```bash
# In a new terminal/session, start the dev server
npm run dev
```

Wait for Vite to start. You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

### 4. Seed Test Data

Follow the patterns from existing E2E tests in the `e2e/helpers/` directory:

**Example: Seed a complete test scenario**
```typescript
// Create a script or use browser console at http://localhost:5173

// Import helpers (use browser console with exposed window.auth and window.db)
import { createTestUser } from './e2e/helpers/auth-helpers';
import { seedGroup, seedSightings, seedUserProfile } from './e2e/helpers/firestore-helpers';

// Create test user
const user = await createTestUser('test@example.com', 'password123', 'Test User');

// Seed user profile
await seedUserProfile({
  id: user.uid,
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: null
});

// Seed a group
const groupId = await seedGroup({
  name: 'Bird Watchers Group',
  joinCode: 'birdwatchers',
  ownerId: user.uid,
  memberIds: [user.uid]
});

// Seed sightings
await seedSightings([
  {
    bird: 'Turdus merula',
    birdName: 'Mustarastas',
    date: '2026-02-15',
    time: '10:30',
    groupId: groupId,
    userId: user.uid,
    userName: 'Test User',
    observationType: 'visual',
    locationName: 'Helsinki Central Park',
    notes: 'Beautiful singing bird',
    createdAt: Date.now()
  },
  // Add more sightings as needed for different scenarios
]);
```

**Alternative: Use Playwright's test setup**
```bash
# Run a single E2E test to seed data without assertions
# Modify a test temporarily to stop before assertions
npx playwright test --headed --debug e2e/sightings.spec.ts
```

**Manual seeding via Emulator UI**
- Navigate to http://localhost:4000
- Use the Firestore UI to manually add documents
- Use the Auth UI to create test users

### 5. Navigate and Take Screenshots

1. Open browser to http://localhost:5173
2. Sign in with test credentials (if needed)
3. Navigate to relevant pages showing your changes
4. **Take multiple screenshots capturing:**
   - Initial state / before interaction
   - During interaction (if applicable)
   - Final state / after changes
   - Different screen sizes (mobile, tablet, desktop) if relevant
   - Different states (empty state, loading, error, success)
   - Different user roles/permissions if applicable

### 6. Take Screenshots Using Available Tools

When implementing this process, you have access to browser automation tools for taking screenshots:

**Using Playwright directly in a script:**
```typescript
// Create a temporary Playwright script (e.g., /tmp/take-screenshots.ts)
import { test } from '@playwright/test';

test('capture screenshots', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Navigate to the feature you changed
  await page.getByRole('button', { name: 'Sign In' }).click();
  // ... perform any needed interactions ...
  
  // Take screenshot
  await page.screenshot({ 
    path: 'feature-initial-state.png',
    fullPage: true 
  });

  // After interaction
  await page.getByRole('button', { name: 'Add Sighting' }).click();
  await page.screenshot({ 
    path: 'feature-dialog-open.png' 
  });
});
```

Then run: `npx playwright test /tmp/take-screenshots.ts --headed`

**Or use browser automation tools available to you** to navigate and capture screenshots systematically.

### 7. Screenshot Best Practices

- **Name screenshots descriptively**: `add-sighting-form.png`, `group-leaderboard-mobile.png`
- **Capture full page when needed**: Use `fullPage: true` for long pages
- **Show context**: Include navigation, breadcrumbs, headers to show where in the app the feature is
- **Multiple angles**: Different viewport sizes, states, and user perspectives
- **Before/After**: If changing existing UI, show both old and new states (use git checkout to show old)

- **Use `page.setViewportSize({ width: 1280, height: 720 })`** (or similar) to ensure consistent dimensions.

### Authenticated Screenshots

To take screenshots of the logged-in view:

1.  **Use Helpers:** Import `createTestUser` and `signInInBrowser` from `e2e/helpers`.
2.  **Set Locale:** Force a specific locale (e.g., English) to ensure consistent text assertions.
3.  **Wait for UI:** Ensure the dashboard or specific elements (like "Your Groups") are visible before capturing.

```typescript
import { test, expect } from '@playwright/test';
import { createTestUser, getTestUserCredentials } from './helpers/auth-helpers';
import { signInInBrowser } from './helpers/browser-auth';

test('capture authenticated screenshot', async ({ page }) => {
  // force English
  await page.addInitScript(() => { localStorage.setItem("language", "en"); });

  const { email, password } = getTestUserCredentials();
  await createTestUser(email, password); // ensure user exists

  await page.goto('/');
  await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();

  await signInInBrowser(page, email, password);
  await expect(page.getByRole('heading', { name: 'Your Groups' })).toBeVisible();

  await page.screenshot({ path: 'authenticated-screenshot.png', fullPage: true });
});
```

### 8. Clean Up After Screenshots

```bash
# Stop development server (Ctrl+C in terminal where it's running)
# Or if running in background, find and stop by port:
lsof -ti:5173 | xargs kill

# Stop Firebase emulator (Ctrl+C in its terminal)
# Or if running in background:
lsof -ti:8080,9099,4000 | xargs kill

# If processes don't stop gracefully, use force kill:
# lsof -ti:8080,9099,4000,5173 | xargs kill -9

# Restore your .env file if needed
# (Don't commit .env changes)
git checkout .env  # if you had a different .env before
```

## When to Take Screenshots

Take screenshots for ANY of these changes:
- ✅ New UI components or features
- ✅ Changes to existing component styling/layout
- ✅ Responsive design changes
- ✅ Navigation or routing changes
- ✅ Form changes (new fields, validation, layout)
- ✅ Changes to lists, tables, or data display
- ✅ Modal dialogs or overlays
- ✅ Error states or loading states
- ✅ Accessibility improvements (show before/after)
- ❌ Backend-only changes (no UI impact)
- ❌ Pure refactoring with no visual changes
- ❌ Configuration or build changes

## Example Screenshot Workflow

Here's a complete example for adding a new button to a form:

```bash
# 1. Start emulator (use async bash with detach for background)
npm run emulator:start &
EMULATOR_PID=$!
sleep 15  # Wait for emulator to start

# 2. Setup environment
cp .env.test .env

# 3. Start dev server in background
npm run dev &
DEV_SERVER_PID=$!
sleep 5  # Wait for Vite to start

# 4. Use Playwright to seed and screenshot
# Create a temporary script: /tmp/screenshot-script.ts

# 5. Run the script with Playwright
npx playwright test /tmp/screenshot-script.ts --headed

# 6. Cleanup (graceful shutdown)
kill $DEV_SERVER_PID  # Stop dev server by PID
lsof -ti:8080,9099,4000 | xargs kill  # Stop emulator by port
```

## Troubleshooting

**Emulator won't start**
- Check if ports 8080, 9099, 4000 are already in use
- Run: `npm run clean:emulators` to kill existing processes

**Dev server can't connect to emulator**
- Verify `VITE_USE_EMULATOR=true` in your .env
- Check that emulator is running: visit http://localhost:4000

**Data not appearing**
- Check browser console for errors
- Verify Firestore security rules allow your test user to read/write
- Check emulator UI at http://localhost:4000 to see if data exists

**Screenshots are blank or wrong content**
- Ensure dev server is fully loaded before taking screenshots
- Wait for async data to load (use appropriate waits in Playwright)
- Check that you're on the correct URL
