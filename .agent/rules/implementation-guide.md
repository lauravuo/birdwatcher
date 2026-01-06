---
trigger: always_on
---

## Node version

* always use Node version defined in .nvmrc

## Task completion

* before task is finalized npm run test:all should pass

## Commiting

* use conventional commit style
* always do changes via PR, not directly to main branch

## Firebase & Testing

* **Use Emulators**: Always use the Firebase Emulator Suite for development and testing. Never test against the production database.
* **E2E Helpers**: When writing E2E tests, use the existing helpers in `e2e/helpers/` for authentication and data seeding to ensure tests are isolated and reliable.
* **Environment**: Ensure `.env.test` is used when running E2E tests.

## Internationalization (i18n)

* **Use `t()`**: All user-facing text must be wrapped in the `t()` function from `useTranslation`.
* **Sync Locales**: When adding new keys to `en.json`, remember to add them to `fi.json` (even if just as a placeholder) to keep strict parity.

## Styling

* **Mobile-First**: Design for mobile screens first, then use media queries for larger screens.
* **Vanilla CSS**: Continue using vanilla CSS with the existing nature-inspired theme variables defined in `index.css`/`App.css`.

## Code Quality

* **Biome**: Run `npm run format` and `npm run lint` regularly. The project uses Biome, so avoid Prettier/ESLint configurations if they conflict.
