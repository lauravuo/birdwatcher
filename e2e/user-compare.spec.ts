import { navigateToUserView } from "./helpers/actions";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import {
	seedGroup,
	seedUserProfile,
	seedUserStats,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("User Comparison", () => {
	// biome-ignore lint/suspicious/noExplicitAny: Need any for test user
	let testUser: any;
	// biome-ignore lint/suspicious/noExplicitAny: Need any for test user
	let userB: any;

	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});

		const credentials = getTestUserCredentials();
		testUser = await createTestUser(
			credentials.email,
			credentials.password,
			"Tester",
		);

		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);
		await expect(page.getByText("Your Groups")).toBeVisible();
	});

	test("performs self-comparison correctly", async ({ page }) => {
		// Seed stats: 2024 has Varis and Sinisorsa. Jan has only Sinisorsa.
		// So Varis is missing in Jan.
		await seedUserStats(testUser.uid, {
			"2024": ["sinisorsa", "varis"],
			"2024-01": ["sinisorsa"],
		});

		// Ensure user is in a group
		await seedGroup({
			name: "Compare Group",
			ownerId: testUser.uid,
			memberIds: [testUser.uid],
		});

		await page.reload();
		await navigateToUserView(page);

		// Click Compare button
		await page.getByRole("link", { name: "Compare" }).click();
		await expect(page).toHaveURL(/\/compare/);

		// Select Year 2024 and Month January
		await page.locator("#compare-year").selectOption("2024");
		await page.locator("#compare-month").selectOption("0"); // January

		// Verify "Seen this month" (Sinisorsa)
		const seenSection = page.locator(".compare-list", {
			hasText: "Seen this month",
		});
		await expect(seenSection).toContainText("Sinisorsa");

		// Verify "Missing this month" (Varis)
		const missingSection = page.locator(".compare-list", {
			hasText: "Missing this month",
		});
		await expect(missingSection).toContainText("Varis");
	});

	test("performs cross-user comparison correctly", async ({ page }) => {
		const emailB = "userb@example.com";
		userB = await createTestUser(emailB, "password123", "UserB");
		await seedUserProfile({
			id: userB.uid,
			displayName: "UserB",
			email: emailB,
			photoURL: null,
		});

		const groupName = "Shared Group";
		await seedGroup({
			name: groupName,
			ownerId: testUser.uid,
			memberIds: [testUser.uid, userB.uid],
		});

		// Me: Sinisorsa, Varis. Them: Varis, Telkkä.
		// Result: You have (Sinisorsa), They have (Telkkä), Both (Varis).
		await seedUserStats(testUser.uid, {
			"2024": ["sinisorsa", "varis"],
		});
		await seedUserStats(userB.uid, {
			"2024": ["varis", "telkka"],
		});

		await page.reload();
		// Navigate to UserB's profile via Members tab
		await page.getByRole("link", { name: new RegExp(groupName) }).click();
		await page.getByRole("button", { name: "Members" }).click();
		await page.locator(".member-item").filter({ hasText: "UserB" }).click();

		// Click Compare
		await page.getByRole("link", { name: "Compare" }).click();

		await page.locator("#compare-year").selectOption("2024");
		await page.locator("#compare-month").selectOption(""); // Any/Whole year

		// Verify lists are present correctly
		const listContainer = page.locator(".compare-results");

		// Order: I have, They have, Both have
		const sectionTitles = listContainer.locator("h4");
		await expect(sectionTitles.nth(0)).toContainText("You have, they don't");
		await expect(sectionTitles.nth(1)).toContainText("They have, you don't");
		await expect(sectionTitles.nth(2)).toContainText("Both have");

		// Values
		await expect(
			page.locator(".compare-list", { hasText: "You have, they don't" }),
		).toContainText("Sinisorsa");
		await expect(
			page.locator(".compare-list", { hasText: "They have, you don't" }),
		).toContainText("Telkkä");
		await expect(
			page.locator(".compare-list", { hasText: "Both have" }),
		).toContainText("Varis");
	});
});
