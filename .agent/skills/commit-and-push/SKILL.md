---
name: commit-and-push
description: Commit local changes, push to remote, create a PR, and ensure all checks pass before marking it ready for review.
---

# Commit and Push Skill

This skill automates the full workflow of committing local changes, pushing them to GitHub, creating a pull request, and ensuring all CI checks pass.

## Prerequisites

- `gh` CLI must be installed and authenticated
- Git remote `origin` must be configured
- Working directory must be a git repository

## Steps

### 1. Ensure Clean State and Determine Changes

```bash
# Check current branch and status
git status
git branch --show-current
git diff --stat
git diff --cached --stat
```

- If there are no changes (staged or unstaged), abort with a message.
- Note the list of changed files for the commit message.

### 2. Create or Switch to a Feature Branch

```bash
# Check the current branch
CURRENT_BRANCH=$(git branch --show-current)
```

- If already on a branch other than `main`, continue using it.
- If on `main`, create a new branch:
  - Generate a descriptive branch name from the changes (e.g., `feat/add-user-auth`, `fix/login-error`, `chore/update-deps`).
  - Use the conventional commit type as the branch prefix (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`, `style/`).

```bash
git checkout -b <branch-name>
```

- Make sure `main` is up to date before branching:

```bash
git fetch origin main
git rebase origin/main
```

### 3. Stage and Commit Changes

- Stage all changes:

```bash
git add -A
```

- Create a commit message using **conventional commit** style:
  - Format: `<type>(<optional scope>): <description>`
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `style`
  - The description should be concise but descriptive.
  - For multi-file changes, include a body with bullet points listing what changed.
  - Example:

```
feat(auth): add Google Sign-In support

- Add GoogleAuthProvider configuration
- Update LoginButton component with Google option
- Add i18n keys for Google sign-in text
```

- Commit the changes:

```bash
git commit -m "<commit message>"
```

### 4. Handle Pre-Commit Hook Failures

The pre-commit hook runs:
1. `npm run format` (Biome formatter — may modify files)
2. `npm run build` (TypeScript compilation)
3. `npm test` (Vitest unit tests)

If the commit fails:

- **Formatting issues**: The formatter auto-fixes files. Stage the newly formatted files and retry the commit:
  ```bash
  git add -A
  git commit -m "<same commit message>"
  ```
- **Build errors**: Fix the TypeScript errors, stage, and retry.
- **Test failures**: Fix the failing tests, stage, and retry.

Repeat until the commit succeeds.

### 5. Push to Remote

```bash
git push -u origin <branch-name>
```

### 6. Handle Pre-Push Hook Failures

The pre-push hook runs E2E tests via the Firebase Emulator if code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.html`) changed:

```bash
npm run test:e2e:emulator
```

If the push fails due to E2E test failures:

- Review the Playwright test output to identify the failing test(s).
- Fix the issue in the source code or test files.
- Stage and commit the fix (a new commit — don't amend unless it's trivial):
  ```bash
  git add -A
  git commit -m "fix: resolve e2e test failure in <test-name>"
  ```
- Retry the push:
  ```bash
  git push -u origin <branch-name>
  ```

Repeat until the push succeeds.

### 7. Create a Draft Pull Request

Use the GitHub CLI to create a **draft** PR:

```bash
gh pr create --draft --title "<PR title>" --body "<PR body>"
```

- **Title**: Use the conventional commit message as the PR title.
- **Body**: Write a clear description including:
  - **What** changed and **why**
  - A bullet list of key changes
  - Any relevant context (e.g., related issues, breaking changes)
  - Example:

```markdown
## Summary

Add Google Sign-In support to the authentication flow.

## Changes

- Add GoogleAuthProvider configuration in `firebase.ts`
- Update `LoginButton` component with Google sign-in option
- Add i18n keys in `en.json` and `fi.json`
- Add unit tests for the new auth provider

## Notes

- No breaking changes
- Tested with Firebase Emulator
```

### 8. Wait for PR Checks to Pass

Monitor the PR check status:

```bash
gh pr checks --watch
```

This will block until all checks complete. The PR CI workflow (`pr.yml`) runs:
1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. E2E tests with emulator (`npm run test:e2e:emulator`)

### 9. Fix CI Failures (if any)

If checks fail:

1. Review the failure details:
   ```bash
   gh pr checks
   ```
2. View the CI logs for the failing job:
   ```bash
   gh run view --log-failed
   ```
3. Fix the issue locally.
4. Stage, commit, and push the fix:
   ```bash
   git add -A
   git commit -m "fix: resolve CI failure — <brief description>"
   git push
   ```
5. Go back to **Step 8** and wait for checks again.

Repeat until all checks pass.

### 10. Mark PR as Ready for Review

Once all checks are green, convert the draft PR to a regular PR:

```bash
gh pr ready
```

Confirm the PR is ready:

```bash
gh pr view --web
```

## Error Handling

- **Merge conflicts**: If `git rebase origin/main` causes conflicts, resolve them manually, then `git rebase --continue`.
- **Auth failures**: If `gh` commands fail with authentication errors, run `gh auth login` first.
- **Stale branch**: If the PR falls behind `main`, rebase and force-push:
  ```bash
  git fetch origin main
  git rebase origin/main
  git push --force-with-lease
  ```
