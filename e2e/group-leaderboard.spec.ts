import { createTestUser } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	seedGroup,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

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

		// --- Summary Tab (Default) ---
		await expect(page.getByTestId("tab-summary")).toHaveClass(/active/);

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

		// --- Switch to Leaderboard Tab ---
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// A. Points Leaders
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });

		// Row 1: Alice (6 pts: 3 monthly + 3 yearly)
		const pRow1 = pointsSection.locator(".leaderboard-item").nth(0);
		await expect(pRow1).toContainText("Alice");
		await expect(pRow1.locator(".points-value")).toHaveText("6");
		await expect(pRow1.locator(".points-label")).toHaveText("pts");

		// Row 2: Bob (4 pts: 2 monthly + 2 yearly)
		const pRow2 = pointsSection.locator(".leaderboard-item").nth(1);
		await expect(pRow2).toContainText("Bob");
		await expect(pRow2.locator(".points-value")).toHaveText("4");

		// Row 3: Charlie (2 pts: 1 monthly + 1 yearly)
		const pRow3 = pointsSection.locator(".leaderboard-item").nth(2);
		await expect(pRow3).toContainText("Charlie");
		await expect(pRow3.locator(".points-value")).toHaveText("2");

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

		// C. Monthly Unique
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

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

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

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Verify Points Section
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });

		// TieA and TieB should both have 6 points (Tie for 1st monthly: 3pts + Tie for 1st yearly: 3pts = 6 pts)
		await expect(pointsSection.locator(".leaderboard-item")).toHaveCount(3);

		// Check values
		const tieA = pointsSection
			.locator(".leaderboard-item")
			.filter({ hasText: "TieA" });
		await expect(tieA.locator(".points-value")).toHaveText("6");

		const tieB = pointsSection
			.locator(".leaderboard-item")
			.filter({ hasText: "TieB" });
		await expect(tieB.locator(".points-value")).toHaveText("6");

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
			page.getByRole("heading", { name: /Group Total/ }),
		).toBeVisible();
		await expect(
			page.getByText("No sightings found for this group."),
		).toBeVisible();
	});

	test("displays month selector with full member list", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// Setup 5 users with different bird counts for the current month
		const userA = await setupUserWithStats("monthA", "Alice", {
			[`${currentYear}-${currentMonth}`]: [
				"bird1",
				"bird2",
				"bird3",
				"bird4",
				"bird5",
			],
		});

		const userB = await setupUserWithStats("monthB", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3", "bird4"],
		});

		const userC = await setupUserWithStats("monthC", "Charlie", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userD = await setupUserWithStats("monthD", "Diana", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2"],
		});

		const userE = await setupUserWithStats("monthE", "Eve", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
		});

		// Create Group
		const joinCode = "month-selector-test";
		await seedGroup({
			name: "Month Selector Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid, userD.uid, userE.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Month Selector Group`);

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Verify Month Selector is visible
		await expect(page.getByTestId("month-selector")).toBeVisible();

		// Verify all 5 members are shown (not just top 3)
		// Monthly section is now the last section with "Top Birdwatchers"
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.last();

		await expect(monthSection).toBeVisible();
		await expect(monthSection.locator(".leaderboard-item")).toHaveCount(5);

		// Verify sorting (descending by bird count, then alphabetical)
		const items = monthSection.locator(".leaderboard-item");
		await expect(items.nth(0)).toContainText("Alice");
		await expect(items.nth(0).locator(".points-value")).toHaveText("5");
		await expect(items.nth(1)).toContainText("Bob");
		await expect(items.nth(1).locator(".points-value")).toHaveText("4");
		await expect(items.nth(2)).toContainText("Charlie");
		await expect(items.nth(2).locator(".points-value")).toHaveText("3");
		await expect(items.nth(3)).toContainText("Diana");
		await expect(items.nth(3).locator(".points-value")).toHaveText("2");
		await expect(items.nth(4)).toContainText("Eve");
		await expect(items.nth(4).locator(".points-value")).toHaveText("1");
	});

	test("handles month selection with tied bird counts (secondary sort by name)", async ({
		page,
	}) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// Setup users with tied bird counts
		const userA = await setupUserWithStats("tieMonthA", "Zara", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userB = await setupUserWithStats("tieMonthB", "Alice", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userC = await setupUserWithStats("tieMonthC", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		// Create Group
		const joinCode = "tie-month-test";
		await seedGroup({
			name: "Tie Month Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Tie Month Group`);

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Verify all members are shown
		const monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.first();

		await expect(monthSection.locator(".leaderboard-item")).toHaveCount(3);

		// Verify secondary sort (alphabetical by name when counts are equal)
		const items = monthSection.locator(".leaderboard-item");
		await expect(items.nth(0)).toContainText("Alice");
		await expect(items.nth(1)).toContainText("Bob");
		await expect(items.nth(2)).toContainText("Zara");
	});

	test("displays empty state for month with no sightings", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const previousMonth = String(now.getMonth()).padStart(2, "0"); // Previous month

		// Only add data for previous month (if exists), not current month
		const stats =
			now.getMonth() > 0
				? { [`${currentYear}-${previousMonth}`]: ["bird1", "bird2"] }
				: {};

		const userA = await setupUserWithStats(
			"emptyMonth",
			"EmptyMonthUser",
			stats,
		);

		await seedGroup({
			name: "Empty Month Group",
			joinCode: "empty-month-test",
			ownerId: userA.uid,
			memberIds: [userA.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Empty Month Group`);

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Month selector should still be visible
		await expect(page.getByTestId("month-selector")).toBeVisible();

		// Empty state should be shown for current month
		await expect(
			page.getByText("No sightings recorded for this month."),
		).toBeVisible();

		// But year stats should still show if there's data in other months
		if (now.getMonth() > 0) {
			// Select previous month
			const selector = page.getByTestId("month-selector");
			await selector.selectOption({ index: 1 }); // Second option (previous month)

			// Should show data for that month
			await expect(
				page.getByText("No sightings recorded for this month."),
			).not.toBeVisible();
			const monthSection = page
				.locator(".leaderboard-section")
				.filter({ hasText: /Top Birdwatchers/ })
				.first();
			await expect(monthSection).toBeVisible();
		}
	});

	test("displays all members in yearly stats sections", async ({ page }) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		// Setup 5 users with different bird counts for yearly stats
		const userA = await setupUserWithStats("yearA", "Alice", {
			[`${currentYear}-${currentMonth}`]: [
				"bird1",
				"bird2",
				"bird3",
				"bird4",
				"bird5",
			],
		});

		const userB = await setupUserWithStats("yearB", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3", "bird4"],
		});

		const userC = await setupUserWithStats("yearC", "Charlie", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
		});

		const userD = await setupUserWithStats("yearD", "Diana", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2"],
		});

		const userE = await setupUserWithStats("yearE", "Eve", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
		});

		// Create Group
		const joinCode = "year-all-members-test";
		await seedGroup({
			name: "Year All Members Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid, userC.uid, userD.uid, userE.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Year All Members Group`);

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Verify Points Leaders section shows all users with points
		// With new logic, all 5 members get points based on rank
		// Alice (1st=5 monthly + 5 yearly = 10), Bob (2nd=4+4=8), Charlie (3rd=3+3=6), Diana (4th=2+2=4), Eve (5th=1+1=2)
		await expect(page.getByText(/Points Leaders/)).toBeVisible();
		const pointsSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: "Points Leaders" });

		await expect(pointsSection.locator(".leaderboard-item")).toHaveCount(5);

		// Verify sorting (descending by points)
		const pointItems = pointsSection.locator(".leaderboard-item");
		await expect(pointItems.nth(0)).toContainText("Alice");
		await expect(pointItems.nth(0).locator(".points-value")).toHaveText("10");
		await expect(pointItems.nth(1)).toContainText("Bob");
		await expect(pointItems.nth(1).locator(".points-value")).toHaveText("8");
		await expect(pointItems.nth(2)).toContainText("Charlie");
		await expect(pointItems.nth(2).locator(".points-value")).toHaveText("6");
		await expect(pointItems.nth(3)).toContainText("Diana");
		await expect(pointItems.nth(3).locator(".points-value")).toHaveText("4");
		await expect(pointItems.nth(4)).toContainText("Eve");
		await expect(pointItems.nth(4).locator(".points-value")).toHaveText("2");

		// Verify Year Unique section shows all 5 members
		const yearUniqueTitle = `Top Birdwatchers (${currentYear})`;
		const yearUniqueSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: yearUniqueTitle })
			.first();
		await expect(yearUniqueSection).toBeVisible();
		await expect(yearUniqueSection.locator(".leaderboard-item")).toHaveCount(5);

		// Verify sorting (descending by unique bird count)
		const yearItems = yearUniqueSection.locator(".leaderboard-item");
		await expect(yearItems.nth(0)).toContainText("Alice");
		await expect(yearItems.nth(0).locator(".points-value")).toHaveText("5");
		await expect(yearItems.nth(1)).toContainText("Bob");
		await expect(yearItems.nth(1).locator(".points-value")).toHaveText("4");
		await expect(yearItems.nth(2)).toContainText("Charlie");
		await expect(yearItems.nth(2).locator(".points-value")).toHaveText("3");
		await expect(yearItems.nth(3)).toContainText("Diana");
		await expect(yearItems.nth(3).locator(".points-value")).toHaveText("2");
		await expect(yearItems.nth(4)).toContainText("Eve");
		await expect(yearItems.nth(4).locator(".points-value")).toHaveText("1");
	});

	test("switches month data correctly when dropdown changes", async ({
		page,
	}) => {
		const now = new Date();
		const currentYear = now.getFullYear();

		// Only run if we're past January (so we have multiple months)
		test.skip(now.getMonth() === 0, "Only one month available in January");

		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
		const previousMonth = String(now.getMonth()).padStart(2, "0");

		// Setup with different data for two months
		const userA = await setupUserWithStats("switchA", "Alice", {
			[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3"],
			[`${currentYear}-${previousMonth}`]: ["bird1"],
		});

		const userB = await setupUserWithStats("switchB", "Bob", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
			[`${currentYear}-${previousMonth}`]: ["bird1", "bird2", "bird3"],
		});

		// Create Group
		const joinCode = "switch-test";
		await seedGroup({
			name: "Switch Month Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid],
		});

		// Sign in and View
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Switch Month Group`);

		// Switch to Leaderboard Tab
		await page.click('[data-testid="tab-leaderboard"]');
		await expect(page.getByTestId("tab-leaderboard")).toHaveClass(/active/);

		// Current month should show Alice with 3, Bob with 1
		// Monthly section is now the last section with "Top Birdwatchers"
		let monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.last();

		let items = monthSection.locator(".leaderboard-item");
		await expect(items.nth(0)).toContainText("Alice");
		await expect(items.nth(0).locator(".points-value")).toHaveText("3");

		// Switch to previous month
		const selector = page.getByTestId("month-selector");
		await selector.selectOption({ index: 1 });

		// Previous month should show Bob with 3, Alice with 1
		monthSection = page
			.locator(".leaderboard-section")
			.filter({ hasText: /Top Birdwatchers/ })
			.last();

		items = monthSection.locator(".leaderboard-item");
		await expect(items.nth(0)).toContainText("Bob");
		await expect(items.nth(0).locator(".points-value")).toHaveText("3");
	});

	test("navigates to sightings tab when clicking group total", async ({
		page,
	}) => {
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

		const userA = await setupUserWithStats("navtest", "Navigator", {
			[`${currentYear}-${currentMonth}`]: ["bird1"],
		});

		// Create Group
		const joinCode = "nav-test";
		await seedGroup({
			name: "Navigation Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid],
		});

		// Sign in
		await page.goto("/");
		await signInInBrowser(page, userA.email, userA.password);
		await page.click(`text=Navigation Group`);

		// Wait for leaderboard
		await expect(
			page.getByRole("heading", { name: `Group Total (${currentYear})` }),
		).toBeVisible();

		// Click the group total
		const groupTotal = page.getByTestId("group-total-click");
		await expect(groupTotal).toBeVisible();
		await groupTotal.click();

		// Verify navigation to sightings tab
		// The sightings tab button should be active
		const sightingsTab = page.getByTestId("tab-sightings");
		await expect(sightingsTab).toHaveClass(/active/);

		// No actual sighting documents are seeded (only user_yearly_stats), so the
		// sightings list shows the empty state from SightingsList.
		await expect(
			page.getByText("No sightings found for this period"),
		).toBeVisible();
	});
});
