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
- `npm run dev` - Start development server (production mode)
- `npm run dev:emulator` - Start development server with Firebase Emulator (test data mode)
- `npm run build` - Build for production (runs TypeScript compiler + Vite build)
- `npm run lint` - Check code style
- `npm run format` - Fix code style issues
- `npm test` - Run unit tests in watch mode
- `npm run test:all` - Run complete test suite
- `npm run emulator:start` - Start Firebase emulator
- `npm run emulator:seed` - Seed emulator with test data
- `./start-dev-emulator.sh` - All-in-one: start emulator, seed data, and run dev server

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure Firebase credentials (see `docs/FIREBASE_SETUP.md`)
3. For testing, use `.env.test` with emulator settings

### Development with Firebase Emulator (Recommended for Testing & Screenshots)

**Prerequisites:**
- Java 21 or higher must be installed and set as default
- Verify with: `java -version`
- Set JAVA_HOME if needed: `export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64`

**Quick Start with Emulator:**
```bash
# All-in-one script (starts emulator, seeds data, runs dev server)
./start-dev-emulator.sh

# Or manually:
# 1. Start emulator (in one terminal)
npm run emulator:start

# 2. Seed test data (in another terminal)
npm run emulator:seed

# 3. Start dev server with emulator config
npm run dev:emulator
```

**Test Users (after seeding):**
- alice@example.com / password123 (5 birds current month, 2 previous)
- bob@example.com / password123 (4 birds current month, 4 previous)
- charlie@example.com / password123 (4 birds current month, 1 previous)
- david@example.com / password123 (2 birds current month, 3 previous)
- eve@example.com / password123 (1 bird current month, 0 previous)

**Test Group:**
- Name: "Birdwatchers United"
- Join Code: `DEMO2024`

This setup is ideal for:
- Taking screenshots of features without real user data
- Testing the application locally
- Developing new features with realistic data
- Verifying UI changes across different user scenarios

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

## Taking Screenshots for PRs

When making UI changes, always provide screenshots to show the impact:

**Setup for Screenshots:**
1. Use the emulator mode to avoid exposing real user data
2. Start with: `./start-dev-emulator.sh` or `npm run dev:emulator` (after starting emulator)
3. Log in with one of the test users (e.g., alice@example.com / password123)
4. Navigate to the feature you've changed
5. Take screenshots showing:
   - Normal state
   - Edge cases (empty states, error states)
   - Different user scenarios (if applicable)
   - Mobile and desktop views (if responsive changes)

**Screenshot Tips:**
- Use browser dev tools to simulate different screen sizes
- Capture the full context (not just a small portion)
- Show meaningful data (the seeded test data provides good variety)
- Annotate screenshots if needed to highlight specific changes

