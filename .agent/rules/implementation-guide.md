---
trigger: always_on
---

## Node version

* always use Node version defined in .nvmrc

## Task completion

* before task is finalized npm run test:all should pass

## Commiting & PR Workflow

* **Conventional Commits**: Use conventional commit style for all messages.
    - **Trigger Release**: Use `feat:` for new features or `fix:` for bug fixes (including UI/Layout fixes) that should be deployed immediately.
    - **Don't Trigger**: Use `chore:`, `style:`, `docs:`, `test:`, or `refactor:` for internal changes that do not need to trigger a new application release.
* **PRs Only**: Always perform changes via a Pull Request (PR), never directly to the `main` branch.
* **Post-Implementation Steps**:
    1.  **Draft PR**: Create the PR as a "draft" initially.
    2.  **Monitor CI**: Use the GitHub CLI (`gh pr checks --watch`) to monitor the status of CI jobs.
    3.  **Ready for Review**: Only mark the PR as "Ready for Review" once all CI checks have passed successfully.
    4.  **Clean Code**: Before finalizing, ensure all temporary comments, debug logs, or unfinished code have been removed.

## Firebase & Testing

* **Use Emulators**: Always use the Firebase Emulator Suite for development and testing. Never test against the production database.
* **E2E Helpers**: When writing E2E tests, use the existing helpers in `e2e/helpers/` for authentication and data seeding to ensure tests are isolated and reliable.
* **Environment**: Ensure `.env.test` is used when running E2E tests.
* **Test Resilience**: 
    * Prefer `data-testid` selectors over `getByRole` or `getByText` for common navigation elements (tabs, main action buttons).
    * Relying on accessible names (e.g., `getByRole("button", { name: "Members" })`) can lead to "strict mode violation" errors if multiple elements share similar labels as the UI evolves.
    * Always provide a unique `data-testid` for new interactive components to ensure tests remain stable.

### Firebase Emulator — How to Run E2E Tests

**ALWAYS follow these steps exactly. Deviating causes port conflicts and emulator startup failures.**

#### Step 1 — Kill any orphaned emulator processes FIRST

Before starting any E2E test run, always clean up stale emulator processes and PID files:

```bash
npm run clean:emulators
```

This kills processes on ports 8080, 9099, 4000, 4400 and removes `.firebase/emulators.pid`.

#### Step 2 — Run E2E tests via the managed script

Use the single script that starts the emulator, runs the tests, and shuts it down automatically:

```bash
npm run test:e2e:emulator
```

This is equivalent to:
```bash
firebase emulators:exec --only auth,firestore --project demo-test "npm run test:e2e"
```

`emulators:exec` manages the full emulator lifecycle — it starts emulators, waits for them to be ready, runs the test command, then shuts them down. **Do NOT manually run `npm run emulator:start` before this.**

#### Step 3 — If startup still fails

If `test:e2e:emulator` fails with port-in-use or connection errors:

1. Run `npm run clean:emulators` again
2. Wait 3–5 seconds for ports to fully release
3. Retry `npm run test:e2e:emulator`

If it continues to fail, check with `lsof -ti:8080,9099` to identify blocking processes.

#### DO NOT do these things

* ❌ Do NOT run `npm run emulator:start` and then `npm run test:e2e` in the same script — they conflict.
* ❌ Do NOT assume the emulator is already running and call `npm run test:e2e` directly (unless you manually verified emulators are up).
* ❌ Do NOT skip `npm run clean:emulators` when a previous run may have left processes behind.

## Internationalization (i18n)

* **Use `t()`**: All user-facing text must be wrapped in the `t()` function from `useTranslation`.
* **Sync Locales**: When adding new keys to `en.json`, remember to add them to `fi.json` (even if just as a placeholder) to keep strict parity.

## Styling

* **Mobile-First**: Design for mobile screens first, then use media queries for larger screens.
* **Vanilla CSS**: Continue using vanilla CSS with the existing nature-inspired theme variables defined in `index.css`/`App.css`.
* **Mobile Layout Optimization**: Be proactive in hiding non-essential desktop-first sections (like redundant headers) in mobile views to improve focus and reduce clutter.

## Code Quality

* **Biome**: Run `npm run format` and `npm run lint` regularly. The project uses Biome, so avoid Prettier/ESLint configurations if they conflict.
* **Constants**: Avoid using "magic numbers" in the code. If a value (like a limit, a count, or a configuration parameter) is likely to be changed or used in multiple places, define it as a constant in `src/constants.ts` (for application-wide constants) or within the relevant component/service.
* **Optional Resilience**: When working with optional properties (like `Sighting.type`), ensure UI components handle their absence gracefully (e.g., hiding icons, providing fallback text). When mocking sightings for tests or shared components, double-check if those optional fields should be present.

## Heading Hierarchy

* **Maintain Hierarchy**: Always follow a logical heading hierarchy (H1 -> H2 -> H3 -> H4). 
    * `h1`: Application title (usually in Header)
    * `h2`: Page or main view title (e.g., Group Name, "Your Groups")
    * `h3`: Major sections within a page or tab
    * `h4`: Sub-sections or individual cards within a major section
