#!/bin/bash

# Temporarily modify playwright config to reuse existing server
BACKUP_FILE=$(mktemp)
cp playwright.config.ts "$BACKUP_FILE"

# Replace forbidOnly and add reuseExistingServer
sed -i 's/forbidOnly: !!process.env.CI,/forbidOnly: false,/' playwright.config.ts
sed -i 's/reuseExistingServer: !process.env.CI,/reuseExistingServer: true,/' playwright.config.ts

# Run the test
npx playwright test screenshots-leaderboard.spec.ts

# Restore the original config
mv "$BACKUP_FILE" playwright.config.ts

exit $?
