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
	seedGroup,
	seedSightings,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

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

	test("updates user view after adding a sighting", async ({ page }) => {
		const groupName = "Sighting Redirect Group";
		await createGroupAndJoin(page, groupName);

		// 1. Add Sighting
		const year = new Date().getFullYear();
		await addSighting(page, "Harakka", `${year}-01-01`);

		// 2. Navigate to User View (since modal doesn't redirect)
		await navigateToUserView(page);

		await expect(page.getByTestId("user-view-heading")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByTestId("user-view-heading")).toContainText("Tester");

		// 3. Verify Sighting in List (User View)
		// Open filters
		await page.getByTestId("toggle-filters").click();

		// Set filter to "Any" to ensure visibility regardless of test run date
		await page.getByTestId("month-filter").selectOption("any");

		await expect(page.getByTestId("sighting-item").first()).toBeVisible();
		await expect(page.getByTestId("sighting-item")).toContainText("Harakka");
	});

	test("can toggle filters visibility", async ({ page }) => {
		const groupName = "Toggle Test Group";
		await createGroupAndJoin(page, groupName);
		await navigateToUserView(page);

		// Default State: Filters hidden
		const toggleBtn = page.getByTestId("toggle-filters");
		await expect(toggleBtn).toBeVisible();
		await expect(toggleBtn).toHaveText("Show Filters");
		await expect(page.locator(".filters-content")).not.toBeVisible();

		// Open Filters
		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Hide Filters");
		await expect(page.locator(".filters-content")).toBeVisible();
		// Verify content (e.g., year filter) is accessible
		await expect(page.getByTestId("year-filter")).toBeVisible();

		// Close Filters
		await toggleBtn.click();
		await expect(toggleBtn).toHaveText("Show Filters");
		await expect(page.locator(".filters-content")).not.toBeVisible();
	});

	test("filters sightings by month and species in User View", async ({
		page,
	}) => {
		const groupName = "Filter Test Group";
		await createGroupAndJoin(page, groupName);

		// Use previous year to avoid future date issues
		const year = new Date().getFullYear() - 1;

		// Add sightings in different months
		// Jan - Harakka
		await addSighting(page, "Harakka", `${year}-01-15`);

		// Manually navigate to User View (modal stays open/closes without redirect)
		await navigateToUserView(page);
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// Go back to add another
		await navigateToGroupView(page, groupName);

		// Feb - Varis
		await addSighting(page, "Varis", `${year}-02-15`);

		// Manually navigate to User View
		await navigateToUserView(page);
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// Open filters
		await page.getByTestId("toggle-filters").click();

		// Select the year we added sightings to
		await page.getByTestId("year-filter").selectOption(String(year));

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
		// Open filters
		await page.getByTestId("toggle-filters").click();

		await page.getByLabel("Year").selectOption("2024");
		await page.getByTestId("month-filter").selectOption("2"); // March

		await expect(page.getByTestId("sighting-item")).toContainText("Harakka");
	});
});
