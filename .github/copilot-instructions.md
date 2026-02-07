# GitHub Copilot Instructions for Birdwatcher Project

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

## Code Quality

- **After making any logic changes, you MUST run the project's linting command**
  - Run: `npm run lint`
  - If linting fails, fix all errors before finalizing the task
  - Use `npm run format` to auto-fix formatting issues

- **Always run tests after making changes**
  - Unit tests: `npm test`
  - E2E tests: `npm run test:e2e` or `npm run test:e2e:emulator`

## Development Workflow

1. Make your code changes
2. Run `npm run format` to auto-fix formatting
3. Run `npm run lint` to check for issues
4. Run tests to verify functionality
5. Commit using Conventional Commits format
6. Push changes (pre-push hooks will run tests)

## Project-Specific Guidelines

- Use tabs for indentation (configured in biome.json)
- Use double quotes for strings in JavaScript/TypeScript
- Follow existing code patterns and naming conventions
- Write tests for new features and bug fixes
