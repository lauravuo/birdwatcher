# Birdwatcher Project Instructions

## Project Overview
Birdwatcher is a mobile-first web application for tracking bird sightings, built with React, TypeScript, and Firebase.

## Technology Stack
- **Frontend**: React 19, Vite, TypeScript, React Router v7
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **Styling**: Vanilla CSS (nature-inspired theme)
- **Testing**: Vitest (Unit), Playwright (E2E)
- **Tooling**: Biome (Linting/Formatting)

## Core Development Rules

### 1. Code Quality & Standards
- **Linter**: Run `npm run lint` and `npm run format` (Biome) before committing.
- **TypeScript**: strict typing, no `any`, types in `src/types`.
- **Commits**: Follow **Conventional Commits** (e.g., `feat:`, `fix:`, `chore:`). Keep summaries < 72 chars.

### 2. Testing
- **Unit Tests**: `npm test` (Vitest). Mock all Firebase services.
- **E2E Tests**: `npm run test:e2e:emulator` (Playwright).
- **Mandatory**: `npm run test:all` MUST pass before finalizing any task.

### 3. Firebase & Emulators
- **Development**: ALWAYS use the Firebase Emulator (`npm run emulator:start`).
- **Security**: Never commit real credentials. Use `.env.test` for E2E.

### 4. Internationalization (i18n)
- **Requirement**: WRAP ALL user-facing text in `t()` from `useTranslation`.
- **Sync**: Add keys to both `en.json` and `fi.json` simultaneously.

## UI Changes & Verification
- **Mobile-First**: Design for mobile first, then desktop.
- **Visual Verification**: When making UI changes, you **MUST** take screenshots.
  - **See [docs/SCREENSHOT_GUIDE.md](../docs/SCREENSHOT_GUIDE.md)** for the required workflow and setup.
