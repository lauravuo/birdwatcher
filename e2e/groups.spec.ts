import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { clearAllTestData, getGroupByCode } from "./helpers/firestore-helpers";

test.describe("Groups UI with Emulator", () => {
	test.beforeEach(async ({ page }) => {
		// Capture browser logs
		page.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
		});

		// Clear all test data before each test
		await clearAllTestData();

		// 1. Create test user in emulator (Node context)
		const credentials = getTestUserCredentials();
		await createTestUser(credentials.email, credentials.password);

		// 2. Navigate and sign in (Browser context)
		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);

		// Wait for redirect to dashboard/groups
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
		await page.waitForTimeout(500);
	});

	test("displays group management interface in dev mode", async ({ page }) => {
		// Check header
		await expect(page.getByText("Your Groups")).toBeVisible();
		await expect(
			page.getByText("You haven't joined any groups yet"),
		).toBeVisible();

		// Check Create Form (Dev Only)
		await expect(
			page.getByRole("heading", { name: "Create New Group (Dev Only)" }),
		).toBeVisible();
	});

	test("successfully joins group via URL", async ({ page }) => {
		const ownerEmail = "owner@birdwatcher.test";
		const ownerPassword = "password123";
		const joinCode = "test-birds-2024";

		// 1. Create and Sign in as Owner to create the group via UI
		await createTestUser(ownerEmail, ownerPassword);
		const { signInInBrowser, signOutInBrowser } = await import(
			"./helpers/browser-auth"
		);

		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);

		// Ensure we are signed in as owner
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		// 2. Create the group via UI
		await page.getByLabel("Group Name:").fill("Test Birds Group");
		await page.getByLabel("Unique Join Code:").fill(joinCode);
		await page.getByRole("button", { name: "Create Group" }).click();

		// Verify owner sees the new group
		await expect(page.getByText("Test Birds Group")).toBeVisible({
			timeout: 10000,
		});

		// 3. Sign out owner and sign back in as the primary test user
		await signOutInBrowser(page);
		const credentials = getTestUserCredentials();
		const user = await createTestUser(credentials.email, credentials.password);
		await signInInBrowser(page, credentials.email, credentials.password);
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		// 4. Navigate with join code to test the joining flow
		await page.goto(`/?group=${joinCode}`);

		// Wait for auto-join
		await expect(page).not.toHaveURL(/group=/, { timeout: 10000 });

		// Verify group appears in the list for the primary user
		await expect(page.getByText("Test Birds Group")).toBeVisible({
			timeout: 10000,
		});

		// Verify it was correctly updated in Firestore (multi-user check)
		const group = await getGroupByCode(joinCode);
		expect(group?.memberIds).toContain(user.uid);
	});

	test("shows error for invalid join code", async ({ page }) => {
		await page.goto("/?group=invalid-code-xyz");

		// Wait for auto-join attempt
		await page.waitForTimeout(2000);

		// Should show error message
		const errorMessage = page.getByText(/Failed to auto-join group/);
		await expect(errorMessage).toBeVisible({ timeout: 10000 });
	});
});
