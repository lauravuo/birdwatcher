import { expect, test } from "@playwright/test";
import { createTestUser } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedGroup,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";

// Helper for creating user and seeding stats
async function setupUserWithStats(
	prefix: string,
	name: string,
	stats: Record<string, string[]> = {},
) {
	const email = `${prefix}@test.com`;
	const password = "password123";
	const user = await createTestUser(email, password, name);
	await seedUserProfile({
		id: user.uid,
		displayName: name,
		email: email,
		photoURL: user.photoURL || "",
	});
	if (Object.keys(stats).length > 0) {
		await seedUserStats(user.uid, stats);
	}
	return { ...user, email: user.email || email, password }; // Return password for login
}

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
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// 1. Setup Data
		const userA = await setupUserWithStats("leaderA", "Alice", {
			[`${currentYear}-${currentMonth}`]: [
				"bird1",
				"bird2",
				"bird3",
				"bird4",
				"bird5",
			], // 5 unique
			[`${currentYear - 1}-05`]: ["bird5", "bird6"],
		});

		const userB = await setupUserWithStats("leaderB", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3", "bird6"], // 4 unique (bird6 is new to group)
		});

		const userC = await setupUserWithStats("leaderC", "Charlie", {
			[`${currentYear}-${currentMonth}`]: ["bird1"], // 1 unique
		});

		// Create Group
		const joinCode = "leaderboard-test";
		await seedGroup({
			name: "Competition Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid],
		});

		// 2. Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Competition Group`);

		// 3. Verify Sections

		// 0. Group Total
		await expect(
			page.getByRole("heading", { name: `Group Total (${currentYear})` }),
		).toBeVisible();
		const groupTotalSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: `Group Total (${currentYear})` });
		await expect(groupTotalSection).toBeVisible();
		const gRow = groupTotalSection.locator(".leaderboard-item");
		await expect(gRow).toContainText("Competition Group");
		await expect(gRow.locator(".points-value")).toHaveText("6"); // 1-5 from Alice, 6 from Bob = 6 total
		await expect(gRow.locator(".points-label")).toHaveText("spp");

		// A. Points Leaders
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });

		// Row 1: Alice (8 pts)
		const pRow1 = pointsSection.locator(".leaderboard-item").nth(0);
		await expect(pRow1).toContainText("Alice");
		await expect(pRow1.locator(".points-value")).toHaveText("8");
		await expect(pRow1.locator(".points-label")).toHaveText("pts");

		// Row 2: Bob (2 pts)
		const pRow2 = pointsSection.locator(".leaderboard-item").nth(1);
		await expect(pRow2).toContainText("Bob");
		await expect(pRow2.locator(".points-value")).toHaveText("2");

		// Row 3: Charlie (1 pt)
		const pRow3 = pointsSection.locator(".leaderboard-item").nth(2);
		await expect(pRow3).toContainText("Charlie");
		await expect(pRow3.locator(".points-value")).toHaveText("1");

		// B. Year Unique
		await expect(
			page.getByRole("heading", { name: `Top Birdwatchers (${currentYear})` }),
		).toBeVisible();

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

		// C. Monthly Unique with Month Selector
		// Verify the month selector exists
		await expect(page.getByTestId("month-selector")).toBeVisible();

		// Find section for current month name
		const date = new Date();
		const monthName = new Intl.DateTimeFormat("en-US", {
			month: "long",
		}).format(date);

		const titleRegex = new RegExp(`Top Birdwatchers \\(${monthName}\\)`, "i");
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: titleRegex })
			.first();

		await expect(monthSection).toBeVisible();
		const mRow1 = monthSection.locator(".leaderboard-item").nth(0);
		await expect(mRow1).toContainText("Alice");
		await expect(mRow1.locator(".points-value")).toHaveText("5"); // 5 unique birds in month

		// Verify all 3 members are shown (not just top 3)
		const allRows = monthSection.locator(".leaderboard-item");
		await expect(allRows).toHaveCount(3);
	});

	test("navigates to user view when clicking a leaderboard entry", async ({
		page,
	}) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		const userA = await setupUserWithStats("clicktest", "Clicker", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
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
		await signInInBrowser(page, userA.email, userA.password);
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

	test("handles ties in monthly points correctly", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		const userA = await setupUserWithStats("tieA", "TieA", {
			[`${currentYear}-${currentMonth}`]: [
				"bird1",
				"bird2",
				"bird3",
				"bird4",
				"bird5",
			],
		});

		const userB = await setupUserWithStats("tieB", "TieB", {
			[`${currentYear}-${currentMonth}`]: [
				"bird1",
				"bird2",
				"bird3",
				"bird4",
				"bird5",
			],
		});

		const userC = await setupUserWithStats("tieC", "TieC", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		// Create Group
		const joinCode = "tie-test";
		await seedGroup({
			name: "Tie Test Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Tie Test Group`);

		// Verify Points Section
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });

		// TieA and TieB should both have 3 points (Tie for 1st) + Tie for Year Bonus (5 pts) = 8 pts
		await expect(pointsSection.locator(".leaderboard-item")).toHaveCount(3);

		// Check values
		const tieA = pointsSection
			.locator(".leaderboard-item")
			.filter({ hasText: "TieA" });
		await expect(tieA.locator(".points-value")).toHaveText("8");

		const tieB = pointsSection
			.locator(".leaderboard-item")
			.filter({ hasText: "TieB" });
		await expect(tieB.locator(".points-value")).toHaveText("8");

		const tieC = pointsSection
			.locator(".leaderboard-item")
			.filter({ hasText: "TieC" });
		await expect(tieC.locator(".points-value")).toHaveText("2");
	});

	test("displays empty state when no data", async ({ page }) => {
		const userA = await setupUserWithStats("empty", "EmptyUser");

		await seedGroup({
			name: "Empty Group",
			joinCode: "empty-test",
			ownerId: userA.uid,
			memberIds: [userA.uid],
		});

		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Empty Group`);

		await expect(
			page.getByText("No sightings found for this group."),
		).toBeVisible();
		await expect(page.locator(".leaderboard-section")).not.toBeVisible();
	});

	test("month selector switches data correctly", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
		const previousMonth = String(now.getMonth()).padStart(2, "0");

		// Setup users with data in different months
		const userA = await setupUserWithStats("selector1", "Alice", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
			[`${currentYear}-${previousMonth}`]: ["bird4", "bird5"],
		});

		const userB = await setupUserWithStats("selector2", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
			[`${currentYear}-${previousMonth}`]: ["bird4", "bird5", "bird6"],
		});

		await seedGroup({
			name: "Selector Group",
			joinCode: "selector-test",
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid],
		});

		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Selector Group`);

		// Verify month selector exists and defaults to current month
		const selector = page.getByTestId("month-selector");
		await expect(selector).toBeVisible();

		// Verify current month data (Alice: 3, Bob: 1)
		let leaderboardItems = page.locator(".leaderboard-item");
		await expect(leaderboardItems.nth(0)).toContainText("Alice");
		await expect(leaderboardItems.nth(0).locator(".points-value")).toHaveText(
			"3",
		);

		// Switch to previous month
		await selector.selectOption({ index: 1 });

		// Wait for the leaderboard to update with new data
		await page.waitForTimeout(100); // Brief wait for state update
		await page.locator(".leaderboard-item").first().waitFor();

		// Verify previous month data (Bob: 3, Alice: 2)
		leaderboardItems = page.locator(".leaderboard-item");
		await expect(leaderboardItems.nth(0)).toContainText("Bob");
		await expect(leaderboardItems.nth(0).locator(".points-value")).toHaveText(
			"3",
		);
	});

	test("displays all members sorted by count then name", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// Create 5 users with different bird counts, including ties
		const userA = await setupUserWithStats("sort1", "Alice", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userB = await setupUserWithStats("sort2", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userC = await setupUserWithStats("sort3", "Charlie", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2"],
		});

		const userD = await setupUserWithStats("sort4", "David", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
		});

		const userE = await setupUserWithStats("sort5", "Eve", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
		});

		await seedGroup({
			name: "Sort Test Group",
			joinCode: "sort-test",
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid, userD.uid, userE.uid],
		});

		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Sort Test Group`);

		// Verify all 5 members are shown
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.last();
		const items = monthSection.locator(".leaderboard-item");
		await expect(items).toHaveCount(5);

		// Verify sorting: by count descending, then by name alphabetically
		// Alice (3) and Bob (3) tied, alphabetically Alice comes first
		await expect(items.nth(0)).toContainText("Alice");
		await expect(items.nth(0).locator(".points-value")).toHaveText("3");
		await expect(items.nth(1)).toContainText("Bob");
		await expect(items.nth(1).locator(".points-value")).toHaveText("3");

		// Charlie (2)
		await expect(items.nth(2)).toContainText("Charlie");
		await expect(items.nth(2).locator(".points-value")).toHaveText("2");

		// David (1) and Eve (1) tied, alphabetically David comes first
		await expect(items.nth(3)).toContainText("David");
		await expect(items.nth(3).locator(".points-value")).toHaveText("1");
		await expect(items.nth(4)).toContainText("Eve");
		await expect(items.nth(4).locator(".points-value")).toHaveText("1");
	});

	test("displays empty state for month with no sightings", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// Create user with data only in current month
		const userA = await setupUserWithStats("empty-month", "Alice", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2"],
		});

		await seedGroup({
			name: "Empty Month Group",
			joinCode: "empty-month-test",
			ownerId: userA.uid,
			memberIds: [userA.uid],
		});

		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Empty Month Group`);

		// Verify current month has data
		let items = page.locator(".leaderboard-item");
		await expect(items.first()).toBeVisible();

		// Switch to a different month (previous month)
		const selector = page.getByTestId("month-selector");
		await selector.selectOption({ index: 1 });

		// Wait for empty state message to appear
		await page.waitForSelector("text=No sightings recorded for this month");

		// Verify empty state message
		await expect(
			page.getByText("No sightings recorded for this month"),
		).toBeVisible();

		// Verify no leaderboard items in the monthly section
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.last();
		items = monthSection.locator(".leaderboard-item");
		await expect(items).toHaveCount(0);
	});
});
