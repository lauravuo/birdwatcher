import crypto from "node:crypto";
import { createTestUser } from "./helpers/auth-helpers";
import {
	getGroupByCode,
	seedGroup,
	seedSightings,
	seedUserProfile,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Groups UI / Management", () => {
	const logTypes: string[] = [];

	test.beforeEach(async ({ authenticatedPage }) => {
		while (logTypes.length > 0) {
			logTypes.pop();
		}

		// Set language to English for tests
		await authenticatedPage.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});

		// Capture browser logs
		authenticatedPage.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
			logTypes.push(msg.type());
		});
	});

	test("displays group management interface in dev mode", async ({
		authenticatedPage,
	}) => {
		// Wait for redirect to dashboard/groups
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await expect(
			authenticatedPage.getByText("You haven't joined any groups yet"),
		).toBeVisible();

		// Check Create Form (Dev Only)
		await expect(
			authenticatedPage.getByRole("heading", {
				name: "Create New Group (Dev Only)",
			}),
		).toBeVisible();

		expect(logTypes).not.toContain("error");
	});

	test("successfully creates a group via UI and joins automatically", async ({
		authenticatedPage,
	}) => {
		const groupName = `UI Create ${crypto.randomUUID().substring(0, 6)}`;

		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});

		// Create the group via UI
		await authenticatedPage.getByLabel("Group Name:").fill(groupName);
		await authenticatedPage
			.getByRole("button", { name: "Create Group" })
			.click();

		// Verify owner sees the new group list
		const groupLink = authenticatedPage.getByRole("link", {
			name: new RegExp(groupName),
		});
		await expect(groupLink).toBeVisible({ timeout: 10000 });

		// Extract join code from UI using data-testid
		const joinCode = await groupLink
			.locator('[data-testid="join-code"]')
			.textContent();
		expect(joinCode).toBeTruthy();
	});

	test("successfully joins group via URL", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `url-join-${crypto.randomUUID().substring(0, 6)}`;
		await seedGroup({ joinCode }); // Create an isolated group

		// Navigate with join code to test the joining flow
		await authenticatedPage.goto(`/?group=${joinCode}`);

		// Wait for auto-join redirect
		await expect(authenticatedPage).not.toHaveURL(/group=/, { timeout: 10000 });

		// Verify it redirects directly to group view because it's their only group
		await expect(
			authenticatedPage.locator(".breadcrumbs").getByText(/Test Group/),
		).toBeVisible({ timeout: 10000 });

		// Verify it was correctly updated in Firestore (multi-user check)
		const group = await getGroupByCode(joinCode);
		expect(group?.memberIds).toContain(user.uid);
	});

	test("shows error for invalid join code", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/?group=invalid-code-xyz");

		// Should show error message
		const errorMessage = authenticatedPage.getByText(
			/Failed to auto-join group/,
		);
		await expect(errorMessage).toBeVisible({ timeout: 10000 });
	});

	test("shows member list when a group is selected", async ({
		authenticatedPage,
		user,
	}) => {
		const groupName = `Click Group ${crypto.randomUUID().substring(0, 4)}`;
		const otherUserId = `other-${crypto.randomUUID().substring(0, 4)}`;
		await seedUserProfile({
			id: otherUserId,
			displayName: "Other User",
			email: "other@test.test",
			photoURL: null,
		});
		// Add ownerId: user.uid so the user is treated as the OWNER and does NOT auto-redirect!
		await seedGroup({
			name: groupName,
			ownerId: user.uid,
			memberIds: [user.uid, otherUserId],
		});

		// Reload to fetch groups
		await authenticatedPage.reload();

		// Click the group in the list (Safe because no auto-redirect)
		const groupItem = authenticatedPage.getByRole("link", {
			name: new RegExp(groupName),
		});
		await expect(groupItem).toBeVisible({ timeout: 10000 });
		await groupItem.click();

		// Click Members tab
		await authenticatedPage.getByRole("button", { name: "Members" }).click();
		await expect(authenticatedPage.getByText(/Members \(2\)/)).toBeVisible();

		// Verify current user is in the list
		await expect(
			authenticatedPage
				.locator(".member-name")
				.filter({ hasText: user.displayName }),
		).toBeVisible();
	});

	test("shows single group by default without back button", async ({
		authenticatedPage,
		user,
	}) => {
		const groupName = `Single Group`;
		await seedGroup({ name: groupName, memberIds: [user.uid] }); // Member of only one group

		await authenticatedPage.reload();

		// Should be redirected to group view directly
		await expect(
			authenticatedPage.locator(".breadcrumbs").getByText(groupName),
		).toBeVisible({ timeout: 10000 });

		// Verify no manual back button
		await expect(
			authenticatedPage.getByRole("button", { name: "← Back" }),
		).not.toBeVisible();
		await expect(authenticatedPage.getByText("Your Groups")).not.toBeVisible();
	});

	test("can toggle filters visibility in group view", async ({
		authenticatedPage,
		user,
	}) => {
		await seedGroup({ memberIds: [user.uid] });

		await authenticatedPage.reload();
		await authenticatedPage.getByRole("button", { name: "Sightings" }).click();

		const toggleBtn = authenticatedPage.getByTestId("toggle-filters");
		await expect(toggleBtn).toHaveText("Show Filters");

		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Hide Filters");
		await expect(authenticatedPage.locator(".filters-content")).toBeVisible();

		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Show Filters");
	});

	test("owner can remove a member from the group", async ({
		authenticatedPage,
		user,
	}) => {
		const groupName = `Rm Group ${crypto.randomUUID().substring(0, 4)}`;
		const memberEmail = `member-${crypto.randomUUID()}@birdwatcher.test`;
		const memberUser = await createTestUser(
			memberEmail,
			"pass123",
			"RemovalMember",
		);
		await seedUserProfile({
			id: memberUser.uid,
			displayName: "RemovalMember",
			email: memberEmail,
			photoURL: null,
		});

		await seedGroup({
			name: groupName,
			ownerId: user.uid,
			memberIds: [user.uid, memberUser.uid],
		});

		await authenticatedPage.reload();

		// Wait for the list and click it
		const groupItem = authenticatedPage.getByRole("link", {
			name: new RegExp(groupName),
		});
		await expect(groupItem).toBeVisible({ timeout: 10000 });
		await groupItem.click();

		await authenticatedPage.getByRole("button", { name: "Members" }).click();
		await expect(authenticatedPage.getByText(/Members \(2\)/)).toBeVisible();

		// Find member item and verify owner can see remove button
		const memberListItem = authenticatedPage
			.locator(".member-item")
			.filter({ hasText: "RemovalMember" });
		const ownerListItem = authenticatedPage
			.locator(".member-item")
			.filter({ hasText: user.displayName });

		await expect(
			memberListItem.locator("button.remove-member-button"),
		).toBeVisible();
		await expect(
			ownerListItem.locator("button.remove-member-button"),
		).not.toBeVisible();

		authenticatedPage.once("dialog", (dialog) => dialog.accept());
		await memberListItem.locator("button.remove-member-button").click();

		// Verify instant UI removal
		await expect(authenticatedPage.getByText(/Members \(1\)/)).toBeVisible();
		await expect(memberListItem).not.toBeVisible();
	});

	test("toggles between month and year view in group", async ({
		authenticatedPage,
		user,
	}) => {
		const _groupId = await seedGroup({
			name: "Mode Group",
			memberIds: [user.uid],
		});

		const now = new Date();
		const year = now.getFullYear();
		const monthIndex = now.getMonth();
		const month = String(monthIndex + 1).padStart(2, "0");
		const today = `${year}-${month}-15`;

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

		await authenticatedPage.reload();
		await authenticatedPage.getByRole("button", { name: "Sightings" }).click();

		await expect(
			authenticatedPage.locator(".sightings-list").getByText("Harakka").first(),
		).toBeVisible();
		if (month !== prevMonth) {
			await expect(
				authenticatedPage.locator(".sightings-list").getByText("Varis"),
			).toBeHidden();
		}

		// Open filters and select Year
		await authenticatedPage.getByTestId("toggle-filters").click();
		await authenticatedPage.getByLabel("Month").selectOption("any");

		if (prevYear === year) {
			await expect(
				authenticatedPage
					.locator(".sightings-list")
					.getByText("Harakka")
					.first(),
			).toBeVisible();
			await expect(
				authenticatedPage.locator(".sightings-list").getByText("Varis").first(),
			).toBeVisible();
		}

		await authenticatedPage
			.getByLabel("Month")
			.selectOption(String(monthIndex));
		await expect(
			authenticatedPage.locator(".sightings-list").getByText("Harakka").first(),
		).toBeVisible();
	});
});
