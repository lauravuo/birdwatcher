import { createTestUser } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedGroup,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Group Members", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});
	});

	test("displays members sorted by bird count (descending) with secondary alphabetical sorting", async ({
		page,
	}) => {
		const currentYear = new Date().getFullYear();

		// Create 3 users with different bird counts
		// Alice: 5 unique birds
		const userAlice = await createTestUser(
			"alice@test.com",
			"password123",
			"Alice",
		);
		await seedUserProfile({
			id: userAlice.uid,
			displayName: "Alice",
			email: userAlice.email,
			photoURL: userAlice.photoURL,
		});
		await seedUserStats(userAlice.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2", "bird3", "bird4", "bird5"],
		});

		// Bob: 3 unique birds
		const userBob = await createTestUser("bob@test.com", "password123", "Bob");
		await seedUserProfile({
			id: userBob.uid,
			displayName: "Bob",
			email: userBob.email,
			photoURL: userBob.photoURL,
		});
		await seedUserStats(userBob.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2", "bird3"],
		});

		// Charlie: 1 unique bird
		const userCharlie = await createTestUser(
			"charlie@test.com",
			"password123",
			"Charlie",
		);
		await seedUserProfile({
			id: userCharlie.uid,
			displayName: "Charlie",
			email: userCharlie.email,
			photoURL: userCharlie.photoURL,
		});
		await seedUserStats(userCharlie.uid, {
			[`${currentYear}-01`]: ["bird1"],
		});

		// Create group with all members
		const joinCode = "members-test";
		await seedGroup({
			name: "Members Test Group",
			joinCode,
			ownerId: userAlice.uid,
			memberIds: [userAlice.uid, userBob.uid, userCharlie.uid],
		});

		// Sign in and navigate to group
		await page.goto("/");
		await signInInBrowser(page, "alice@test.com", "password123");
		await page.click("text=Members Test Group");

		// Click Members tab
		await page.getByRole("button", { name: "Members" }).click();

		// Wait for members list to be visible
		await expect(page.getByText(/Members \(3\)/)).toBeVisible();

		// Get all member items
		const memberItems = page.locator(".member-item");
		await expect(memberItems).toHaveCount(3);

		// Verify order: Alice (5 birds) -> Bob (3 birds) -> Charlie (1 bird)
		const firstMember = memberItems.nth(0);
		await expect(firstMember.locator(".member-name")).toHaveText("Alice");
		await expect(firstMember.locator(".member-bird-count")).toContainText(
			"5 birds",
		);

		const secondMember = memberItems.nth(1);
		await expect(secondMember.locator(".member-name")).toHaveText("Bob");
		await expect(secondMember.locator(".member-bird-count")).toContainText(
			"3 birds",
		);

		const thirdMember = memberItems.nth(2);
		await expect(thirdMember.locator(".member-name")).toHaveText("Charlie");
		await expect(thirdMember.locator(".member-bird-count")).toContainText(
			"1 bird",
		);
	});

	test("sorts members alphabetically when bird counts are equal", async ({
		page,
	}) => {
		const currentYear = new Date().getFullYear();

		// Create 3 users with same bird count but different names
		const userZara = await createTestUser(
			"zara@test.com",
			"password123",
			"Zara",
		);
		await seedUserProfile({
			id: userZara.uid,
			displayName: "Zara",
			email: userZara.email,
			photoURL: userZara.photoURL,
		});
		await seedUserStats(userZara.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2"],
		});

		const userAdam = await createTestUser(
			"adam@test.com",
			"password123",
			"Adam",
		);
		await seedUserProfile({
			id: userAdam.uid,
			displayName: "Adam",
			email: userAdam.email,
			photoURL: userAdam.photoURL,
		});
		await seedUserStats(userAdam.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2"],
		});

		const userMike = await createTestUser(
			"mike@test.com",
			"password123",
			"Mike",
		);
		await seedUserProfile({
			id: userMike.uid,
			displayName: "Mike",
			email: userMike.email,
			photoURL: userMike.photoURL,
		});
		await seedUserStats(userMike.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2"],
		});

		// Create group
		const joinCode = "alpha-test";
		await seedGroup({
			name: "Alpha Test Group",
			joinCode,
			ownerId: userZara.uid,
			memberIds: [userZara.uid, userAdam.uid, userMike.uid],
		});

		// Sign in and navigate
		await page.goto("/");
		await signInInBrowser(page, "zara@test.com", "password123");
		await page.click("text=Alpha Test Group");

		// Click Members tab
		await page.getByRole("button", { name: "Members" }).click();

		// Wait for members list
		await expect(page.getByText(/Members \(3\)/)).toBeVisible();

		// Get all member items
		const memberItems = page.locator(".member-item");
		await expect(memberItems).toHaveCount(3);

		// Verify alphabetical order: Adam -> Mike -> Zara
		await expect(memberItems.nth(0).locator(".member-name")).toHaveText("Adam");
		await expect(memberItems.nth(1).locator(".member-name")).toHaveText("Mike");
		await expect(memberItems.nth(2).locator(".member-name")).toHaveText("Zara");

		// All should have same bird count
		for (let i = 0; i < 3; i++) {
			await expect(
				memberItems.nth(i).locator(".member-bird-count"),
			).toContainText("2 birds");
		}
	});

	test("displays owner badge correctly", async ({ page }) => {
		const currentYear = new Date().getFullYear();

		const owner = await createTestUser(
			"owner@test.com",
			"password123",
			"Owner User",
		);
		await seedUserProfile({
			id: owner.uid,
			displayName: "Owner User",
			email: owner.email,
			photoURL: owner.photoURL,
		});
		await seedUserStats(owner.uid, {
			[`${currentYear}-01`]: ["bird1"],
		});

		const member = await createTestUser(
			"member@test.com",
			"password123",
			"Regular Member",
		);
		await seedUserProfile({
			id: member.uid,
			displayName: "Regular Member",
			email: member.email,
			photoURL: member.photoURL,
		});
		await seedUserStats(member.uid, {
			[`${currentYear}-01`]: ["bird1"],
		});

		// Create group
		await seedGroup({
			name: "Badge Test Group",
			joinCode: "badge-test",
			ownerId: owner.uid,
			memberIds: [owner.uid, member.uid],
		});

		// Sign in as owner
		await page.goto("/");
		await signInInBrowser(page, "owner@test.com", "password123");
		await page.click("text=Badge Test Group");

		// Click Members tab
		await page.getByRole("button", { name: "Members" }).click();

		// Wait for members list
		await expect(page.getByText(/Members \(2\)/)).toBeVisible();

		// Verify owner has both Owner and You badges
		const ownerItem = page
			.locator(".member-item")
			.filter({ hasText: "Owner User" });
		await expect(ownerItem.locator(".owner-badge")).toBeVisible();
		await expect(ownerItem.locator(".owner-badge")).toHaveText("Owner");
		await expect(ownerItem.locator(".you-badge")).toBeVisible();
		await expect(ownerItem.locator(".you-badge")).toHaveText("You");

		// Verify regular member has no badges
		const memberItem = page
			.locator(".member-item")
			.filter({ hasText: "Regular Member" });
		await expect(memberItem.locator(".owner-badge")).not.toBeVisible();
		await expect(memberItem.locator(".you-badge")).not.toBeVisible();
	});
});
