import { expect, type Page, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { signInInBrowser, signOutInBrowser } from "./helpers/browser-auth";
import { clearAllTestData, getGroupByCode } from "./helpers/firestore-helpers";

test.describe("Groups UI with Emulator", () => {
	const createGroup = async (
		page: Page,
		groupName: string,
		joinCode: string,
	) => {
		const ownerEmail = "owner@birdwatcher.test";
		const ownerPassword = "password123";

		// 1. Create and Sign in as Owner to create the group via UI
		await createTestUser(ownerEmail, ownerPassword, "GroupOwner");
		const { signInInBrowser, signOutInBrowser } = await import(
			"./helpers/browser-auth"
		);

		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);

		// Ensure we are signed in as owner
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		// 2. Create the group via UI
		await page.getByLabel("Group Name:").fill(groupName);
		await page.getByLabel("Unique Join Code:").fill(joinCode);
		await page.getByRole("button", { name: "Create Group" }).click();

		// Verify owner sees the new group
		await expect(page.getByText(groupName)).toBeVisible({
			timeout: 10000,
		});
	};
	const logTypes: string[] = [];
	test.beforeEach(async ({ page }) => {
		while (logTypes.length > 0) {
			logTypes.pop();
		}

		// Capture browser logs
		page.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
			logTypes.push(msg.type());
		});

		// Clear all test data before each test
		await clearAllTestData();

		// 1. Create test user in emulator (Node context)
		const credentials = getTestUserCredentials();
		await createTestUser(credentials.email, credentials.password, "Tester");

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

		expect(logTypes).not.toContain("error");
	});

	test("successfully joins group via URL", async ({ page }) => {
		const joinCode = "test-birds-2024";
		await createGroup(page, "Test Birds Group", joinCode);

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

		expect(logTypes).not.toContain("error");
	});

	test("shows error for invalid join code", async ({ page }) => {
		await page.goto("/?group=invalid-code-xyz");

		// Wait for auto-join attempt
		await page.waitForTimeout(2000);

		// Should show error message
		const errorMessage = page.getByText(/Failed to auto-join group/);
		await expect(errorMessage).toBeVisible({ timeout: 10000 });
	});

	test("shows member list when a group is selected", async ({ page }) => {
		const joinCode = "test-birds-group-click";
		const groupName = "Test Birds Group Click";
		await createGroup(page, groupName, joinCode);

		// 2. Click the group in the list
		const groupItem = page.getByRole("button", { name: new RegExp(groupName) });
		await expect(groupItem).toBeVisible();
		await groupItem.click();

		// 3. Verify member list is shown
		await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
		await expect(page.getByText(/Members \(1\)/)).toBeVisible();

		// Verify owner is in the list
		await expect(page.locator(".member-name")).toContainText("GroupOwner");
		await expect(page.locator(".owner-badge")).toContainText("Owner");

		// 4. Test back button
		await page.getByRole("button", { name: "← Back" }).click();
		await expect(page.getByText("Your Groups")).toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("shows single group by default without back button", async ({
		page,
	}) => {
		const joinCode = "single-group-member";
		const groupName = "Single Group Member";
		const ownerEmail = "owner-member@birdwatcher.test";
		const ownerPassword = "password123";
		const memberEmail = "member-only@birdwatcher.test";
		const memberPassword = "password456";

		// 1. Owner creates a group
		await createTestUser(ownerEmail, ownerPassword, "GroupOwner");
		const { signInInBrowser, signOutInBrowser } = await import(
			"./helpers/browser-auth"
		);

		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);

		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		await page.getByLabel("Group Name:").fill(groupName);
		await page.getByLabel("Unique Join Code:").fill(joinCode);
		await page.getByRole("button", { name: "Create Group" }).click();

		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// 2. Sign out owner and create a non-owner member
		await signOutInBrowser(page);
		await createTestUser(memberEmail, memberPassword);
		await signInInBrowser(page, memberEmail, memberPassword);

		// 3. Member joins the group
		await page.goto(`/?group=${joinCode}`);

		// Wait for auto-join
		await expect(page).not.toHaveURL(/group=/, { timeout: 10000 });

		// 4. Member should see the group view directly (not the list)
		await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
		await expect(page.getByText(/Members \(2\)/)).toBeVisible();

		// 5. Verify no back button and no "Your Groups" list
		await expect(
			page.getByRole("button", { name: "← Back" }),
		).not.toBeVisible();
		await expect(page.getByText("Your Groups")).not.toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("owner with single group sees back button and group list", async ({
		page,
	}) => {
		const joinCode = "single-group-owner";
		const groupName = "Single Group Owner";

		// 1. Owner creates a group
		const ownerEmail = "owner-single@birdwatcher.test";
		const ownerPassword = "password789";

		await createTestUser(ownerEmail, ownerPassword, "OwnerUser");
		const { signInInBrowser, signOutInBrowser } = await import(
			"./helpers/browser-auth"
		);

		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);

		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		await page.getByLabel("Group Name:").fill(groupName);
		await page.getByLabel("Unique Join Code:").fill(joinCode);
		await page.getByRole("button", { name: "Create Group" }).click();

		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// 2. Owner should see group list (not auto-selected)
		await expect(page.getByText("Your Groups")).toBeVisible();
		await expect(page.getByText(groupName)).toBeVisible();

		// 3. Click group to view members
		const groupItem = page.getByRole("button", { name: new RegExp(groupName) });
		await groupItem.click();

		// 4. Verify back button is shown for owner
		await expect(page.getByRole("button", { name: "← Back" })).toBeVisible();

		// 5. Click back and verify group list reappears
		await page.getByRole("button", { name: "← Back" }).click();
		await expect(page.getByText("Your Groups")).toBeVisible();

		expect(logTypes).not.toContain("error");
	});
});
