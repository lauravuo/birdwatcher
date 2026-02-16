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

### 1. Automated Setup (Recommended)

Run the preparation script which starts emulators, seeds data, and launches the dev server:

```bash
./scripts/prepare-screenshot-env.sh
```

The script will output the test user credentials and keep the environment running.

- **User**: owner@example.com
- **Password**: password123
- **Group**: Bird Watchers Helsinki

### 2. Manual Setup (Alternative)

If you need custom control:

#### 1. Start the Firebase Emulator
```bash
# Start emulator in background
npm run emulator:start
```

#### 2. Configure Environment
```bash
cp .env.test .env
```

#### 3. Start Development Server
```bash
npm run dev
```

#### 4. Seed Test Data manually...


### 5. Navigate and Take Screenshots

1. Open browser to http://localhost:5173
2. Log in with the test user credentials
3. Navigate to the desired views

## 6. Troubleshooting

### Authentication Issues (Network Error / Auth Emulator Failed)
If you see `Firebase: Error (auth/network-request-failed)` or the Auth emulator doesn't start:

1.  **Check Java**: Firebase emulators require Java. Run `java -version`.
2.  **Check Ports**: Ensure ports 9099 (Auth) and 8080 (Firestore) are free.
    ```bash
    lsof -i :9099
    lsof -i :8080
    ```
3.  **Project ID**: The script uses `--project demo-test`. Ensure your `.env` or local config doesn't conflict.
4.  **Local vs System Firebase**: The script uses `npx firebase` to use the local project version. If you have a global version (check `firebase --version`), it might be outdated (e.g., v7.x lacks Auth emulator). Always use `npx firebase` or the provided script.

### Seeding Errors (PERMISSION_DENIED)
If you see `PERMISSION_DENIED` during seeding:
- The seeding script must run in a specific order: Owner -> Members -> Group -> Sightings.
- Ensure the script is using the `seed-screenshot-data.spec.ts` which handles authentication for each user creation step.
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

```

Then run: `npm run test:e2e -- /tmp/take-screenshots.ts --headed`

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
npm run test:e2e -- /tmp/screenshot-script.ts --headed --project=chromium

# 6. Cleanup (graceful shutdown)
kill $DEV_SERVER_PID  # Stop dev server by PID
lsof -ti:8080,9099,4000 | xargs kill  # Stop emulator by port
```

### 7. Screenshot Best Practices

- **Use Deterministic IDs for Seeding**: When capturing details pages (e.g., `/groups/:id/sightings/:id`), do not rely on auto-generated IDs. Use `setDoc` with a known string ID so you can construct the URL reliably.
  ```typescript
  // Bad: Random ID
  // await seedSighting({ ... }); 
  
  // Good: Known ID
  await setDoc(doc(db, 'sightings', 'fixed-sighting-id'), { 
    id: 'fixed-sighting-id', 
    ...sightingData 
  });
  await page.goto('/groups/g-123/sightings/fixed-sighting-id');
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

**"Auth API Key not valid" Error**
- Ensure your `.env.test` has a valid-looking `VITE_FIREBASE_API_KEY`. simple strings like "demo-key" might fail client-side validation in some SDK versions. Use something like `AIzaSyDOCS_EXAMPLE_API_KEY`.

**Environment Variables missing in Test**
- Do not run `npx playwright test` directly if you rely on `.env.test`.
- Use `npm run test:e2e -- <your-file>` instead, which sets up `dotenv`.
