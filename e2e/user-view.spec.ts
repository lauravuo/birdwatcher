import { expect, test } from "@playwright/test";
import type { User } from "firebase/auth";
import {
	addSighting,
	createGroupAndJoin,
	navigateToGroupView,
	navigateToUserView,
	switchToMembersTab,
} from "./helpers/actions";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import {
	clearAllTestData,
	seedGroup,
	seedSightings,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";

test.describe("User View", () => {
	const logTypes: string[] = [];
	// Store the created test user to access their UID
	let testUser: User;

	test.beforeEach(async ({ page }) => {
		// Reset logs
		while (logTypes.length > 0) logTypes.pop();

		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});

		page.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
			logTypes.push(msg.type());
		});

		await clearAllTestData();
		const credentials = getTestUserCredentials();
		// Create user and capture the result which contains the UID
		testUser = await createTestUser(
			credentials.email,
			credentials.password,
			"Tester",
		);

		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
	});

	test("displays 'You' badge and profile link in header", async ({ page }) => {
		const groupName = "Profile Test Group";
		await createGroupAndJoin(page, groupName);

		// Navigate via header link
		await navigateToUserView(page);

		// Verify "You" badge
		await expect(page.locator(".you-badge")).toBeVisible();
		await expect(page.getByTestId("user-view-heading")).toHaveText(
			/Tester.*You/,
		);
	});

	test("redirects to user view after adding a sighting", async ({ page }) => {
		const groupName = "Sighting Redirect Group";
		await createGroupAndJoin(page, groupName);

		// 1. Add Sighting
		const year = new Date().getFullYear();
		await addSighting(page, "Harakka", `${year}-01-15`);

		// 2. Verify Redirect using data-testid
		await expect(page.getByTestId("user-view-heading")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByTestId("user-view-heading")).toContainText("Tester");

		// 3. Verify Sighting in List (User View)
		// Set filter to "Any" to ensure visibility regardless of test run date
		await page.getByTestId("month-filter").selectOption("any");

		await expect(page.getByTestId("sighting-item").first()).toBeVisible();
		await expect(page.getByTestId("sighting-item")).toContainText("Harakka");
	});

	test("filters sightings by month and species in User View", async ({
		page,
	}) => {
		const groupName = "Filter Test Group";
		await createGroupAndJoin(page, groupName);

		const currentYear = new Date().getFullYear();
		// Add sightings in different months
		// Jan - Harakka
		await addSighting(page, "Harakka", `${currentYear}-01-15`);
		// Wait for redirect to complete
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// Go back to add another
		await navigateToGroupView(page, groupName);

		// Feb - Varis
		await addSighting(page, "Varis", `${currentYear}-02-15`);
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// 1. Verify Jan Filter
		await page.getByTestId("month-filter").selectOption("0"); // January

		// Use specific locator within sighting items to avoid matching dropdown options
		const sightingItems = page.getByTestId("sighting-item");
		await expect(sightingItems.filter({ hasText: "Harakka" })).toBeVisible();
		await expect(sightingItems.filter({ hasText: "Varis" })).not.toBeVisible();

		// 2. Verify Feb Filter
		await page.getByTestId("month-filter").selectOption("1"); // February
		await expect(sightingItems.filter({ hasText: "Varis" })).toBeVisible();
		await expect(
			sightingItems.filter({ hasText: "Harakka" }),
		).not.toBeVisible();

		// 3. Verify "Any" Month
		await page.getByTestId("month-filter").selectOption("any");
		await expect(sightingItems.filter({ hasText: "Harakka" })).toBeVisible();
		await expect(sightingItems.filter({ hasText: "Varis" })).toBeVisible();
	});

	test("displays other user's profile and stats", async ({ page }) => {
		// Setup: Seed a group with another user and their sightings
		// Tester (testUser) is ALREADY created in BeforeEach.
		// We need to create User B.
		const emailB = "userb@example.com";
		const userB = await createTestUser(emailB, "password123", "UserB");

		// Ensure User B has profile
		await seedUserProfile({
			id: userB.uid,
			displayName: userB.displayName,
			email: userB.email,
			photoURL: userB.photoURL,
		});

		const groupName = "Shared Group";
		const joinCode = "shared-group-1";

		// Seed group using the CORRECT UIDs
		await seedGroup({
			name: groupName,
			joinCode: joinCode,
			ownerId: testUser.uid,
			memberIds: [testUser.uid, userB.uid],
		});

		// Seed sighting for User B
		await seedSightings([
			{
				userId: userB.uid,
				birdId: "harakka",
				date: "2024-03-15",
				time: "10:00",
				type: "visual",
				locationName: "Park",
				createdAt: Date.now(),
			},
		]);

		// Seed stats
		await seedUserStats(userB.uid, { "2024-03": ["harakka"] });

		// Test Flow:
		// 1. Go to Group
		await page.reload(); // Reload to fetch seeded group which wasn't there at initial load
		await page.getByRole("link", { name: new RegExp(groupName) }).click();
		await expect(
			page.locator(".breadcrumbs").getByText(groupName),
		).toBeVisible();

		// 2. Go to Members
		await switchToMembersTab(page);

		// 3. Click User B
		await page.locator(".member-item").filter({ hasText: "UserB" }).click();

		// 4. Verify User View for User B
		await expect(page.getByTestId("user-view-heading")).toHaveText("UserB");
		await expect(page.locator(".you-badge")).not.toBeVisible();

		// Check Stats
		// The seed data has 1 sighting in 2024-03.
		// Current year is based on run time, so "Yearly" might be 0 if currentYear != 2024.
		// But "Total" should be 1.
		await expect(page.getByText(/Total/i)).toBeVisible();
		// We expect "1" to be visible in stats
		await expect(page.locator(".stat-value").getByText("1")).toBeVisible();

		// 5. Check Data (March 2024)
		await page.getByLabel("Year").selectOption("2024");
		await page.getByTestId("month-filter").selectOption("2"); // March

		await expect(page.getByTestId("sighting-item")).toContainText("Harakka");
	});
});
