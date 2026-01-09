import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedGroup,
	seedSightings,
} from "./helpers/firestore-helpers";

test.describe("Group Sightings Pagination", () => {
	test.beforeEach(async ({ page }) => {
		// Set language
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});
		await clearAllTestData();
	});

	// Helper to get today's date in YYYY-MM-DD format
	const getToday = () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	test("loads more sightings when clicking Load More button", async ({
		page,
	}) => {
		// 1. Setup Data via Firestore SDK
		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"PaginationTester",
		);

		const groupName = "Pagination Group";
		const joinCode = "page-group-1";
		await seedGroup({
			name: groupName,
			joinCode: joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		const today = getToday();

		// Seed 25 sightings (Limit is 20)
		// ID s-0 is oldest, s-24 is newest.
		const sightings = Array.from({ length: 25 }, (_, i) => ({
			userId: user.uid,
			birdId: `bird-${i}`,
			date: today,
			time: "12:00",
			type: "visual",
			locationName: `Location ${i}`,
			createdAt: Date.now() + i * 1000, // Ensure strictly increasing timestamp
		}));

		// @ts-expect-error: Incomplete type mock for seeding
		await seedSightings(sightings);

		// 2. Sign in and Navigate
		await page.goto("/");
		await signInInBrowser(page, credentials.email, credentials.password);

		// 3. Enter Group
		await page.getByRole("link", { name: new RegExp(groupName) }).click();

		// Click Sightings tab
		await page.getByRole("button", { name: "Sightings" }).click();

		// 4. Verify initial load (Should see top 20, newest first)
		// Newest is s-24 (Bird: bird-24)
		await expect(page.getByText("bird-24")).toBeVisible({ timeout: 10000 });

		// Check proper loading of first page
		await expect(page.getByRole("button", { name: "Load More" })).toBeVisible();

		// 5. Click Load More
		await page.getByRole("button", { name: "Load More" }).click();

		// 6. Verify older sightings loaded
		// bird-4 should now be visible (it was the 21st item from top, so on page 2)
		await expect(page.getByText("bird-4")).toBeVisible();

		// Button should disappear because we received fewer than 20 items (5 items)
		await expect(
			page.getByRole("button", { name: "Load More" }),
		).not.toBeVisible();
	});

	test("does not show Load More button when sightings are fewer than limit", async ({
		page,
	}) => {
		// 1. Setup Data
		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"SmallListTester",
		);

		const groupName = "Small Group";
		const joinCode = "small-group-1";
		await seedGroup({
			name: groupName,
			joinCode: joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		const today = getToday();

		// Seed 5 sightings (Limit is 20)
		const sightings = Array.from({ length: 5 }, (_, i) => ({
			userId: user.uid,
			birdId: `bird-${i}`,
			date: today,
			time: "12:00",
			type: "visual",
			locationName: `Location ${i}`,
			createdAt: Date.now() + i * 1000,
		}));

		// @ts-expect-error: Incomplete type mock for seeding
		await seedSightings(sightings);

		// 2. Sign in and Navigate
		await page.goto("/");
		await signInInBrowser(page, credentials.email, credentials.password);

		// 3. Enter Group
		await page.getByRole("link", { name: new RegExp(groupName) }).click();

		// Click Sightings tab
		await page.getByRole("button", { name: "Sightings" }).click();

		// 4. Verify sightings loaded
		await expect(page.getByText("bird-4")).toBeVisible();

		// 5. Verify Load More button is NOT visible
		await expect(
			page.getByRole("button", { name: "Load More" }),
		).not.toBeVisible();
	});
});
