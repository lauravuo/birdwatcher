# GitHub Copilot Instructions for Birdwatcher Project

## Project Overview
Birdwatcher is a mobile-first web application for birdwatchers to track and share their sightings within groups. Built with React, TypeScript, and Firebase.

## Commit Message Standards

- **Always use Conventional Commits format**
  - Examples: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `style:`, `perf:`
  - Use lowercase for the scope (e.g., `feat(ui): add new button`)
  - **Do not exceed 50 characters for the summary line**
  - Format: `<type>(<scope>): <subject>`

### Examples
```
feat: add user authentication
fix: resolve memory leak in data fetching
chore: update dependencies
docs: update README with setup instructions
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

