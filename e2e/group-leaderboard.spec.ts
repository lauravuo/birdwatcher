import { expect, test } from "@playwright/test";
import { createTestUser } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedGroup,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";

test.describe("Group Leaderboard", () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});
		await clearAllTestData();
	});

	test("displays leaderboard with correct sections and ranks", async ({
		page,
	}) => {
		const currentYear = new Date().getFullYear();

		// 1. Setup Data
		// User A: 5 birds in Current Month -> Points: 1 (Month Win), Unique Year: 5
		// User B: 2 birds in Current Month -> Points: 0, Unique Year: 2

		// 1. Setup Data
		// User A: 5 birds in Current Month -> Points: 1 (Month Win), Unique Year: 5
		// User B: 2 birds in Current Month -> Points: 0, Unique Year: 2

		const userA = await createTestUser(
			"leaderA@test.com",
			"password123",
			"Alice",
		);
		await seedUserProfile({
			id: userA.uid,
			displayName: "Alice",
			email: userA.email,
			photoURL: userA.photoURL,
		});
		// Seed Alice Stats
		await seedUserStats(userA.uid, {
			// Current Year - Jan only
			[`${currentYear}-01`]: ["bird1", "bird2", "bird3", "bird4", "bird5"], // 5 unique
			// Previous Year (should be ignored for current year points/unique)
			[`${currentYear - 1}-05`]: ["bird5", "bird6"],
		});

		const userB = await createTestUser(
			"leaderB@test.com",
			"password123",
			"Bob",
		);
		await seedUserProfile({
			id: userB.uid,
			displayName: "Bob",
			email: userB.email,
			photoURL: userB.photoURL,
		});
		// User B: 2 birds in Current Month -> Points: 0, Unique Year: 2
		await seedUserStats(userB.uid, {
			[`${currentYear}-01`]: ["bird1", "bird2"],
		});

		const userC = await createTestUser(
			"leaderC@test.com",
			"password123",
			"Charlie",
		);
		await seedUserProfile({
			id: userC.uid,
			displayName: "Charlie",
			email: userC.email,
			photoURL: userC.photoURL,
		});
		// User C: 1 bird in Current Month -> Points: 0, Unique Year: 1
		await seedUserStats(userC.uid, {
			[`${currentYear}-01`]: ["bird1"],
		});

		// Create Group
		const joinCode = "leaderboard-test";
		await seedGroup({
			name: "Competition Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid],
		});

		// 2. Sign in and View
		await page.goto("/");
		await signInInBrowser(page, "leaderA@test.com", "password123");
		await page.click(`text=Competition Group`);

		// 3. Verify Sections

		// A. Points Leaders
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });
		const pRow1 = pointsSection.locator(".leaderboard-item").nth(0);
		await expect(pRow1).toContainText("Alice");
		await expect(pRow1.locator(".points-value")).toHaveText("3");
		await expect(pRow1.locator(".points-label")).toHaveText("pts");

		// B. Year Unique
		await expect(
			page.getByRole("heading", { name: `Top Birdwatchers (${currentYear})` }),
		).toBeVisible();
		// "Top Birdwatchers (YYYY)" vs "Top Birdwatchers (Month)"
		// Let's rely on order or specific text with year
		const yearUniqueTitle = `Top Birdwatchers (${currentYear})`;
		const yearUniqueSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: yearUniqueTitle })
			.first();
		await expect(yearUniqueSection).toBeVisible();
		const yRow1 = yearUniqueSection.locator(".leaderboard-item").nth(0);
		await expect(yRow1).toContainText("Alice");
		await expect(yRow1.locator(".points-value")).toHaveText("5"); // 5 spp
		await expect(yRow1.locator(".points-label")).toHaveText("spp");

		// C. Monthly Unique
		// Find section for current month name
		const date = new Date();
		const monthName = new Intl.DateTimeFormat("en-US", {
			month: "long",
		}).format(date);
		// Capitalize just in case, though format usually does it.
		const titleRegex = new RegExp(`Top Birdwatchers \\(${monthName}\\)`, "i");
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: titleRegex })
			.first();

		await expect(monthSection).toBeVisible();
		const mRow1 = monthSection.locator(".leaderboard-item").nth(0);
		await expect(mRow1).toContainText("Alice");
		await expect(mRow1.locator(".points-value")).toHaveText("5");
	});

	test("navigates to user view when clicking a leaderboard entry", async ({
		page,
	}) => {
		const currentYear = new Date().getFullYear();

		const userA = await createTestUser(
			"clicktest@test.com",
			"password123",
			"Clicker",
		);
		await seedUserProfile({
			id: userA.uid,
			displayName: "Clicker",
			email: userA.email,
			photoURL: userA.photoURL,
		});
		// Seed stats so they appear on leaderboard
		await seedUserStats(userA.uid, {
			[`${currentYear}-01`]: ["bird1"],
		});

		// Create Group
		const joinCode = "click-test";
		await seedGroup({
			name: "Click Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid],
		});

		// Sign in
		await page.goto("/");
		await signInInBrowser(page, "clicktest@test.com", "password123");
		await page.click(`text=Click Group`);

		// Wait for leaderboard and finding the user item
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const userItem = page
			.locator(".leaderboard-item")
			.filter({ hasText: "Clicker" })
			.first();
		await expect(userItem).toBeVisible();

		// Click the user
		await userItem.click();

		// Verify navigation
		// Matching /groups/[groupId]/members/[userId]
		await expect(page).toHaveURL(/\/groups\/[^/]+\/members\/[^/]+/);
		await expect(page.getByRole("heading", { name: "Clicker" })).toBeVisible();
	});
});
