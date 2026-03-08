import type { Page } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { signInInBrowser, signOutInBrowser } from "./helpers/browser-auth";
import { clearAllTestData, getGroupByCode } from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Groups UI", () => {
	const createGroup = async (
		page: Page,
		groupName: string,
	): Promise<string> => {
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
		await page.getByRole("button", { name: "Create Group" }).click();

		// Verify owner sees the new group
		const groupLink = page.getByRole("link", { name: new RegExp(groupName) });
		await expect(groupLink).toBeVisible({ timeout: 10000 });

		// Extract join code from UI: "GroupName (code)"
		const text = await groupLink.innerText();
		const match = text.match(/\(([^)]+)\)/);
		if (!match) throw new Error(`Could not extract join code from "${text}"`);
		return match[1];
	};
	const logTypes: string[] = [];
	test.beforeEach(async ({ page }) => {
		while (logTypes.length > 0) {
			logTypes.pop();
		}

		// Set language to English for tests (before any navigation)
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});

		// Capture browser logs
		page.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
			logTypes.push(msg.type());
		});

		// Clear all test data before each test
		await clearAllTestData();

		// 1. Create test user (Node context)
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
		const joinCode = await createGroup(page, "Test Birds Group");

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

		// Verify group appears (redirects to group view for single group)
		// It resolves to Heading because of auto-redirect
		await expect(
			page.locator(".breadcrumbs").getByText("Test Birds Group"),
		).toBeVisible({
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
		const groupName = "Test Birds Group Click";
		await createGroup(page, groupName);

		// 2. Click the group in the list (now a Link)
		const groupItem = page.getByRole("link", { name: new RegExp(groupName) });
		await expect(groupItem).toBeVisible();
		await groupItem.click();

		// 3. Verify member list is shown & URL is correct
		await expect(
			page.locator(".breadcrumbs").getByText(groupName),
		).toBeVisible();

		// Click Members tab
		await page.getByRole("button", { name: "Members" }).click();

		await expect(page.getByText(/Members \(1\)/)).toBeVisible();
		await expect(page).toHaveURL(/\/groups\//);

		// Verify owner is in the list
		await expect(page.locator(".member-name")).toContainText("GroupOwner");
		await expect(page.locator(".owner-badge")).toContainText("Owner");

		// Verify bird count is displayed (should be 0 birds for new member)
		await expect(page.locator(".member-bird-count")).toContainText("0 birds");

		// 4. Test Breadcrumb "Birdwatcher" (Home) removed
		// Verify it is NOT visible
		await expect(
			page.getByRole("link", { name: "Birdwatcher" }),
		).not.toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("shows single group by default without back button", async ({
		page,
	}) => {
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
		await page.getByRole("button", { name: "Create Group" }).click();

		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// Extract join code from UI
		const groupLink = page.getByRole("link", { name: new RegExp(groupName) });
		const text = await groupLink.innerText();
		const match = text.match(/\(([^)]+)\)/);
		if (!match) throw new Error("Could not extract join code");
		const joinCode = match[1];

		// 2. Sign out owner and create a non-owner member
		await signOutInBrowser(page);
		await createTestUser(memberEmail, memberPassword);
		await signInInBrowser(page, memberEmail, memberPassword);

		// 3. Member joins the group
		await page.goto(`/?group=${joinCode}`);

		// Wait for auto-join
		await expect(page).not.toHaveURL(/group=/, { timeout: 10000 });

		// 4. Member should be redirected to group view directly (not the list)
		// because of the single-group auto-redirect logic
		await expect(
			page.locator(".breadcrumbs").getByText(groupName),
		).toBeVisible();

		// Click Members tab
		await page.getByRole("button", { name: "Members" }).click();

		await expect(page.getByText(/Members \(2\)/)).toBeVisible();
		await expect(page).toHaveURL(/\/groups\//);

		// 5. Verify no manual back button (Breadcrumbs exist but manual button is gone)
		await expect(
			page.getByRole("button", { name: "← Back" }),
		).not.toBeVisible();
		// The "Your Groups" list is NOT visible because we are in group view
		await expect(page.getByText("Your Groups")).not.toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("owner with single group sees back button and group list", async ({
		page,
	}) => {
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
		await page.getByRole("button", { name: "Create Group" }).click();

		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// 2. Owner should see group list (not auto-selected)
		await expect(page.getByText("Your Groups")).toBeVisible();
		await expect(page.getByText(groupName)).toBeVisible();

		// 3. Click group to view members
		const groupItem = page.getByRole("link", { name: new RegExp(groupName) });
		await groupItem.click();

		// 4. Verify Breadcrumbs allow going back
		await expect(
			page.getByRole("link", { name: "Birdwatcher" }),
		).not.toBeVisible();

		// 5. User stays on group view (cannot navigate back via breadcrumb)
		await expect(
			page.locator(".breadcrumbs").getByText(groupName),
		).toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("can toggle filters visibility in group view", async ({ page }) => {
		const groupName = "Filter Toggle Group";
		await createGroup(page, groupName);

		// Click the group link to enter group view
		await page.getByRole("link", { name: new RegExp(groupName) }).click();

		// Click Sightings Tab
		await page.getByRole("button", { name: "Sightings" }).click();

		// Default State: Filters hidden
		const toggleBtn = page.getByTestId("toggle-filters");
		await expect(toggleBtn).toBeVisible();
		await expect(toggleBtn).toHaveText("Show Filters");
		await expect(page.locator(".filters-content")).not.toBeVisible();

		// Open Filters
		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Hide Filters");
		await expect(page.locator(".filters-content")).toBeVisible();
		await expect(page.getByTestId("year-filter")).toBeVisible();

		// Close Filters
		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Show Filters");
		await expect(page.locator(".filters-content")).not.toBeVisible();
	});

	test("owner can remove a member from the group", async ({ page }) => {
		const groupName = "Removal Group";
		const ownerEmail = "owner-removal@birdwatcher.test";
		const ownerPassword = "password123";
		const memberEmail = "member-removal@birdwatcher.test";
		const memberPassword = "password456";

		// 1. Owner creates a group
		await createTestUser(ownerEmail, ownerPassword, "RemovalOwner");
		const { signInInBrowser, signOutInBrowser } = await import(
			"./helpers/browser-auth"
		);

		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });

		await page.getByLabel("Group Name:").fill(groupName);
		await page.getByRole("button", { name: "Create Group" }).click();
		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });

		// Extract join code
		const groupLink = page.getByRole("link", { name: new RegExp(groupName) });
		const text = await groupLink.innerText();
		const match = text.match(/\(([^)]+)\)/);
		if (!match) throw new Error("Could not extract join code");
		const joinCode = match[1];

		// 2. Member joins the group
		await signOutInBrowser(page);
		await createTestUser(memberEmail, memberPassword, "RemovalMember");
		await signInInBrowser(page, memberEmail, memberPassword);
		await page.goto(`/?group=${joinCode}`);
		await expect(page).not.toHaveURL(/group=/, { timeout: 10000 });

		// 3. Owner logs back in to remove the member
		await signOutInBrowser(page);
		await signInInBrowser(page, ownerEmail, ownerPassword);
		await page.goto("/");
		await page.getByRole("link", { name: new RegExp(groupName) }).click();

		// Navigate to Members tab
		await page.getByRole("button", { name: "Members" }).click();
		await expect(page.getByText(/Members \(2\)/)).toBeVisible();

		// Ensure Owner sees Remove button for Member but not for themselves
		const memberListItem = page
			.locator(".member-item")
			.filter({ hasText: "RemovalMember" });
		const ownerListItem = page
			.locator(".member-item")
			.filter({ hasText: "RemovalOwner" });

		await expect(
			memberListItem.locator("button.remove-member-button"),
		).toBeVisible();
		await expect(
			ownerListItem.locator("button.remove-member-button"),
		).not.toBeVisible();

		// Handle confirmation dialog
		page.once("dialog", (dialog) => dialog.accept());

		// Click Remove
		await memberListItem.locator("button.remove-member-button").click();

		// Verify removal from the UI list instantly
		await expect(page.getByText(/Members \(1\)/)).toBeVisible();
		await expect(
			page.locator(".member-name").filter({ hasText: "RemovalMember" }),
		).not.toBeVisible();

		// 4. Verify Leaderboard also doesn't show the user anymore
		await page.getByRole("button", { name: "Stats" }).click();
		await expect(
			page.locator(".leaderboard-list").getByText("RemovalMember"),
		).not.toBeVisible();
	});

	test("toggles between month and year view in group", async ({ page }) => {
		const groupName = "Mode Group";
		await createGroup(page, groupName);

		// 1. Setup Data
		const { seedGroup, seedSightings } = await import(
			"./helpers/firestore-helpers"
		);
		const { getTestUserCredentials } = await import("./helpers/auth-helpers");

		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"ModeTester",
		);

		await page.goto("/");
		await signInInBrowser(page, credentials.email, credentials.password);

		await seedGroup({
			name: "Seeded Mode Group",
			joinCode: "seeded-mode-group",
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		const now = new Date();
		const year = now.getFullYear();
		const monthIndex = now.getMonth(); // 0-based month index for select options
		const month = String(monthIndex + 1).padStart(2, "0"); // 1-based month string for date formatting
		const today = `${year}-${month}-15`;

		// Previous Month/Year logic
		const prevDateObj = new Date();
		prevDateObj.setMonth(prevDateObj.getMonth() - 1);
		const prevYear = prevDateObj.getFullYear();
		const prevMonth = String(prevDateObj.getMonth() + 1).padStart(2, "0");
		const prevDate = `${prevYear}-${prevMonth}-15`;

		await seedSightings([
			{
				userId: user.uid,
				birdId: "harakka",
				date: today,
				time: "12:00",
				type: "visual",
				createdAt: Date.now(),
			},
			{
				userId: user.uid,
				birdId: "varis",
				date: prevDate,
				time: "10:00",
				type: "visual",
				createdAt: Date.now() - 10000,
			},
		]);

		await page.reload();
		await page
			.getByRole("link", { name: "Seeded Mode Group" })
			.click({ timeout: 10000 });

		// Click Sightings Tab
		await page.getByRole("button", { name: "Sightings" }).click();

		await expect(
			page.getByRole("heading", { name: "Group Sightings" }),
		).toBeVisible();

		// Default: Month View
		await expect(
			page.locator(".sightings-list").getByText("Harakka").first(),
		).toBeVisible();
		if (month !== prevMonth) {
			await expect(
				page.locator(".sightings-list").getByText("Varis"),
			).toBeHidden();
		}

		// Switch to Year
		// Open filters
		await page.getByTestId("toggle-filters").click();
		await expect(page.locator(".filters-content")).toBeVisible();

		await page.getByLabel("Month").selectOption("any");
		await expect(page.getByLabel("Month")).toBeVisible();

		// In Year view, if prevDate is same year, we see both.
		if (prevYear === year) {
			await expect(
				page.locator(".sightings-list").getByText("Harakka").first(),
			).toBeVisible();
			await expect(
				page.locator(".sightings-list").getByText("Varis").first(),
			).toBeVisible();
		} else {
			// Different year
			await expect(
				page.locator(".sightings-list").getByText("Harakka").first(),
			).toBeVisible();
			await expect(
				page.locator(".sightings-list").getByText("Varis"),
			).toBeHidden();
		}

		// Switch back to Month
		await page.getByLabel("Month").selectOption(String(monthIndex)); // Select original month using 0-based index
		await expect(page.getByLabel("Month")).toBeVisible();
	});
});
