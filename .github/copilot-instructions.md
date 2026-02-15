# GitHub Copilot Instructions for Birdwatcher Project

## Project Overview
Birdwatcher is a mobile-first web application for birdwatchers to track and share their sightings within groups. Built with React, TypeScript, and Firebase.

## Commit Message Standards

- **Always use Conventional Commits format**
  - Examples: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `style:`, `perf:`
  - Use lowercase for the scope (e.g., `feat(ui): add new button`)
  - **Keep summary line under 72 characters**
  - Format: `<type>(<scope>): <subject>`

### Examples
```
feat: add user authentication
fix: resolve memory leak in data fetching
chore: update dependencies
docs: update README with setup info
test: add e2e tests for login flow
```

## Tech Stack
- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Styling**: Vanilla CSS with nature-inspired theme
- **Internationalization**: i18next + react-i18next
- **Routing**: React Router DOM v7

## Development Tools
- **Linting/Formatting**: Biome (use `npm run lint` to check, `npm run format` to fix)
- **Unit Testing**: Vitest with happy-dom
- **E2E Testing**: Playwright with Firebase Emulator
- **CI/CD**: GitHub Actions

## Code Style Conventions

### Formatting
- Use **tabs** for indentation (not spaces)
- Use **double quotes** for strings in JavaScript/TypeScript
- Organize imports automatically
- Run `npm run format` before committing

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid using `any` type when possible
- Place type definitions in `src/types` directory

### React Components
- Use functional components with hooks
- Export components as named exports (e.g., `export function ComponentName()`)
- Use the `useTranslation` hook for all user-facing text (see i18n section)
- Component files use `.tsx` extension

### File Organization
- Components: `src/components/`
- Contexts: `src/contexts/`
- Hooks: `src/hooks/`
- Firebase utilities: `src/lib/`
- Types: `src/types/`
- Localization files: `src/locales/`
- Test utilities: `src/test/`

## Internationalization (i18n)
- All user-facing text must use i18next translation keys
- Import `useTranslation` hook: `import { useTranslation } from "react-i18next";`
- Use translation in components: `const { t } = useTranslation(); ... t("key.subkey")`
- Translation files are in `src/locales/` (en.json, fi.json)
- Add new keys to all language files

## Firebase Integration
- Firebase config loaded from environment variables (see `.env.example`)
- Use Firebase Emulator for local development and testing
- Authentication: Google Sign-in only
- Firestore security rules defined in `firestore.rules`
- Never commit actual Firebase credentials

## Testing

### Unit Tests (Vitest)
- Test files use `.test.tsx` or `.test.ts` extension
- Run tests: `npm test` (watch mode) or `npm test -- --run` (single run)
- Tests should mock Firebase services
- Focus on logic isolation and component rendering

### E2E Tests (Playwright)
- E2E tests are in `e2e/` directory
- Run with emulator: `npm run test:e2e:emulator`
- Tests validate Firebase security rules and real integrations
- Use `.env.test` for test environment variables

### Before Committing
- Run `npm run test:all` to execute full test suite (lint + unit + build + E2E)
- Alternatively run commands individually:
  1. `npm run lint`
  2. `npm test -- --run`
  3. `npm run build`
  4. `npm run test:e2e:emulator`

## Build and Development

### Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript compiler + Vite build)
- `npm run lint` - Check code style
- `npm run format` - Fix code style issues
- `npm test` - Run unit tests in watch mode
- `npm run test:all` - Run complete test suite
- `npm run emulator:start` - Start Firebase emulator

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure Firebase credentials (see `docs/FIREBASE_SETUP.md`)
3. For testing, use `.env.test` with emulator settings

## Security Considerations
- Never commit secrets or API keys
- Use environment variables for configuration
- Follow Firestore security rules (see `firestore.rules`)
- Validate user permissions on both client and server

## Documentation
- Main docs are in `docs/` directory
- `docs/TESTING.md` - Comprehensive testing guide
- `docs/FIREBASE_SETUP.md` - Firebase configuration instructions
- Update docs when making significant changes

## Code Quality

- **After making any logic changes, you MUST run the project's linting command**
  - Run: `npm run lint`
  - If linting fails, fix all errors before finalizing the task
  - Use `npm run format` to auto-fix formatting issues

- **Always run tests after making changes**
  - Unit tests: `npm test`
  - E2E tests: `npm run test:e2e` or `npm run test:e2e:emulator`

## Development Workflow

1. Create feature branch from main
2. Make your code changes
3. Write tests for new features and follow existing patterns
4. Run `npm run format` to auto-fix formatting
5. Run `npm run lint` to check for issues
6. Run tests to verify functionality
7. Commit using Conventional Commits format (see above)
8. Run `npm run test:all` before pushing
9. Push changes (pre-push hooks will run tests)
10. Submit PR with clear description

## Project-Specific Guidelines

- Follow existing code patterns and naming conventions
- Use tabs for indentation (configured in biome.json)
- Use double quotes for strings in JavaScript/TypeScript
- Write tests for new features and bug fixes
- CI runs on PRs: lint, unit tests, build, E2E tests
- Deployment to Firebase Hosting on merge to main

## Taking Screenshots for UI Changes

When implementing UI changes, **ALWAYS** take multiple screenshots to attach to the pull request. This helps reviewers understand the visual impact of your changes.

### Prerequisites

1. **Use Firebase Emulator with Development Server**
   - The development server must connect to the Firebase emulator (not production)
   - This ensures a safe, isolated environment for testing

2. **Set up environment for emulator**
   - Use `.env.test` configuration which sets `VITE_USE_EMULATOR=true`
   - Emulator uses ports: 9099 (Auth), 8080 (Firestore), 4000 (Emulator UI)

### Step-by-Step Screenshot Process

#### 1. Start the Firebase Emulator
```bash
# Start emulator in background (detached mode)
npm run emulator:start
```

Wait for the emulator to fully start (usually 10-20 seconds). You should see:
```
✔  All emulators ready! View status and logs at http://localhost:4000
```

#### 2. Configure Environment for Emulator
```bash
# Create a temporary .env file for screenshots
cp .env.test .env
```

This ensures the dev server connects to the emulator instead of production.

#### 3. Start Development Server
```bash
# In a new terminal/session, start the dev server
npm run dev
```

Wait for Vite to start. You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

#### 4. Seed Test Data

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

#### 5. Navigate and Take Screenshots

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

#### 6. Take Screenshots Using Available Tools

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

#### 7. Screenshot Best Practices

- **Name screenshots descriptively**: `add-sighting-form.png`, `group-leaderboard-mobile.png`
- **Capture full page when needed**: Use `fullPage: true` for long pages
- **Show context**: Include navigation, breadcrumbs, headers to show where in the app the feature is
- **Multiple angles**: Different viewport sizes, states, and user perspectives
- **Before/After**: If changing existing UI, show both old and new states (use git checkout to show old)

#### 8. Clean Up After Screenshots

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

### When to Take Screenshots

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

### Example Screenshot Workflow

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

### Troubleshooting

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

