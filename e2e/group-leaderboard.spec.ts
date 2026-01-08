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

	test("displays leaderboard with correct points and ranks", async ({
		page,
	}) => {
		const currentYear = new Date().getFullYear();
		const jan = `${currentYear}-01`;
		const feb = `${currentYear}-02`;

		// 1. Setup Users & Seed Stats (Interleaved to maintain Auth session)
		// User A:
		const userA = await createTestUser(
			"leaderA@test.com",
			"password123",
			"Alice",
		);
		await seedUserProfile({
			id: userA.uid,
			displayName: userA.displayName,
			email: userA.email,
			photoURL: userA.photoURL,
		});
		// Jan: 2 birds [b1, b2] -> Winner (+1)
		// Feb: 1 bird [b1]
		await seedUserStats(userA.uid, {
			[jan]: ["bird-1", "bird-2"],
			[feb]: ["bird-1"],
		});

		// User B:
		const userB = await createTestUser(
			"leaderB@test.com",
			"password123",
			"Bob",
		);
		await seedUserProfile({
			id: userB.uid,
			displayName: userB.displayName,
			email: userB.email,
			photoURL: userB.photoURL,
		});
		// Jan: 1 bird [b1]
		// Feb: 3 birds [b1, b2, b3] -> Winner (+1)
		// Yearly Unique: {b1, b2, b3} = 3 -> Winner (+2)
		await seedUserStats(userB.uid, {
			[jan]: ["bird-1"],
			[feb]: ["bird-1", "bird-2", "bird-3"],
		});

		// Expected Scores:
		// Alice: 1 (Jan) = 1 pt
		// Bob: 1 (Feb) + 2 (Year) = 3 pts

		// 3. Create Group
		const joinCode = "leaderboard-test";
		await seedGroup({
			name: "Competition Group",
			joinCode,
			ownerId: userA.uid,
			memberIds: [userA.uid, userB.uid],
		});

		// 4. Sign in as Alice (Owner/UserA) and view group
		await page.goto("/");
		await signInInBrowser(page, "leaderA@test.com", "password123");
		await expect(page.getByText("Your Groups")).toBeVisible();

		await page.click(`text=Competition Group`);

		// 5. Verify Leaderboard
		await expect(page.getByText(/Leaderboard/)).toBeVisible();

		// Check Rank 1: Bob with 3 pts
		const rank1 = page.locator(".rank-1");
		await expect(rank1).toContainText("Bob");
		await expect(rank1.locator(".points-value")).toHaveText("3");
		await expect(rank1.locator(".year-badge")).toBeVisible(); // Trophy

		// Check Rank 2: Alice with 1 pt
		const rank2 = page.locator(".rank-2");
		await expect(rank2).toContainText("Alice");
		await expect(rank2.locator(".points-value")).toHaveText("1");
		await expect(rank2.locator(".year-badge")).toBeHidden(); // No trophy

		// Check Month Badge
		await expect(rank1.locator(".month-badge")).toContainText("1"); // Bob won 1 month
		await expect(rank2.locator(".month-badge")).toContainText("1"); // Alice won 1 month
	});
});
