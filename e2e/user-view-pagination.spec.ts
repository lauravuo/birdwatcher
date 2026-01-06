import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedGroup,
	seedSightings,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";

test.describe("User View Pagination", () => {
	test.beforeEach(async ({ page }) => {
		// Set language
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});
		await clearAllTestData();
	});

	test("loads more sightings when clicking Load More button in User View", async ({
		page,
	}) => {
		// 1. Setup Data via Firestore SDK
		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"UserPaginationTester",
		);

		await seedUserProfile({
			id: user.uid,
			displayName: "UserPaginationTester",
			email: credentials.email,
			photoURL: null,
		});

		const groupName = "User Pagination Group";
		const joinCode = "user-page-group-1";
		await seedGroup({
			name: groupName,
			joinCode: joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		// Seed 25 sightings (Limit is 20) for January 2024
		// ID s-0 is oldest, s-24 is newest.
		const year = 2024;
		const month = 0; // January
		const monthStr = "01";

		const sightings = Array.from({ length: 25 }, (_, i) => ({
			userId: user.uid,
			birdId: `bird-${i}`,
			date: `${year}-${monthStr}-01`, // All on same day to test tricky sorting
			time: "12:00",
			type: "visual",
			locationName: `Location ${i}`,
			createdAt: Date.now() + i * 1000, // Ensure strictly increasing timestamp
		}));

		// @ts-expect-error: Incomplete type mock for seeding
		await seedSightings(sightings);

		// Seed stats to ensure User View works properly (though not strictly needed for pagination list)
		const birdIds = sightings.map((s) => s.birdId);
		await seedUserStats(user.uid, {
			[`${year}-${monthStr}`]: birdIds,
		});

		// 2. Sign in and Navigate
		await page.goto("/");
		await signInInBrowser(page, credentials.email, credentials.password);

		// 3. Enter Group
		await page.getByRole("button", { name: new RegExp(groupName) }).click();

		// 4. Navigate to User View (Click own profile in members list)
		await page
			.locator(".member-item")
			.filter({ hasText: "UserPaginationTester" })
			.click();
		await expect(
			page.getByRole("heading", { name: "UserPaginationTester" }),
		).toBeVisible();

		// 5. Select correct month/year (Defaults to current, so we must switch to Jan 2024)
		await page.getByLabel("Year").selectOption(String(year));
		await page.getByLabel("Month").selectOption(String(month));

		// 6. Verify initial load (Should see top 20, newest first)
		// Newest is s-24 (Bird: bird-24)
		await expect(page.getByText("bird-24")).toBeVisible({ timeout: 10000 });

		// Verify oldest on page 1 (bird-5) is visible (since 24 down to 5 is 20 items)
		// 24, 23, ..., 5
		await expect(page.getByText("bird-5")).toBeVisible();

		// Check proper loading of first page
		await expect(page.getByRole("button", { name: "Load More" })).toBeVisible();

		// 7. Click Load More
		await page.getByRole("button", { name: "Load More" }).click();

		// 8. Verify older sightings loaded
		// bird-4 should now be visible (it was the 21st item from top, so on page 2)
		await expect(page.getByText("bird-4")).toBeVisible();
		// bird-0 should be visible
		await expect(page.getByText("bird-0")).toBeVisible();

		// Button should disappear because we received fewer than 20 items (5 items)
		await expect(
			page.getByRole("button", { name: "Load More" }),
		).not.toBeVisible();
	});
});
