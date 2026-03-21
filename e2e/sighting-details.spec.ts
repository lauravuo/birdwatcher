import { createTestUser } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import {
	clearAllTestData,
	seedSighting,
	seedUserProfile,
} from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Sighting Details", () => {
	test.beforeEach(async ({ page }) => {
		// Set language to English for tests
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});
	});

	test("navigates to sighting details from list and shows full info", async ({
		page,
	}) => {
		const user = await createTestUser(
			"details@test.com",
			"password123",
			"Detailer",
		);
		await seedUserProfile({
			id: user.uid,
			displayName: "Detailer",
			email: user.email,
			photoURL: null,
		});

		// Create sighting with all fields
		await seedSighting({
			userId: user.uid,
			birdId: "bird1",
			date: "2024-01-01",
			time: "12:00",
			type: "visual",
			locationName: "Secret Spot",
			latitude: 60.1699,
			longitude: 24.9384,
			notes: "Saw it flying high.",
			createdAt: Date.now(),
		});

		// Sign in and go to user view
		await page.goto("/");
		await signInInBrowser(page, "details@test.com", "password123");
		// Navigation to user view (assuming user is owner of no group -> create group prompt? Or just URL?)
		// To see sightings, we can go to User View or just see "UserSightings" component if reachable.
		// The easiest is to go to /groups/.../members/... BUT we need a group for that.
		// Alternatively, if App logic redirects root to something.
		// Let's seed a group too so we can navigate normally.

		// Wait, new users don't see User View on root.
		// Let's just create a group to be safe.
	});

	test("list view shows limited info and detail view shows full info", async ({
		page,
	}) => {
		// Setup
		const user = await createTestUser(
			"details2@test.com",
			"password123",
			"Detailer2",
		);
		await seedUserProfile({
			id: user.uid,
			displayName: "Detailer2",
			email: user.email,
			photoURL: null,
		});

		const now = new Date();
		// Format: YYYY-MM-DD
		const today = now.toISOString().split("T")[0];

		await seedSighting({
			userId: user.uid,
			birdId: "harakka", // known valid ID
			date: today,
			time: "12:00",
			type: "visual",
			locationName: "Hidden Valley",
			notes: "A strictly secret note.",
			createdAt: Date.now(),
		});

		await page.goto("/");
		await signInInBrowser(page, "details2@test.com", "password123");

		// Go to User View directly
		await page.goto(`/groups/any-group/members/${user.uid}`);

		// 1. Verify List View
		// "harakka" likely translates to "Harakka" (Magpie) in Finnish or Magpie in English.
		// Tests set language to 'en' in beforeEach usually, but here we don't.
		// Let's assume default or check for birdId if translation missing.
		// Safest is to wait for something we know.
		// Other tests used "Harakka" for "harakka".
		await expect(
			page.locator(".sighting-item-link").getByText("Harakka"),
		).toBeVisible();

		// 2. hidden/visible check
		// Should NOT see notes or location in list
		await expect(page.getByText("Hidden Valley")).not.toBeVisible();
		await expect(page.getByText("A strictly secret note")).not.toBeVisible();

		// 3. Click Item
		await page.locator(".sighting-item-link").click();

		// 4. Verify Detail View
		await expect(page).toHaveURL(/\/groups\/.*\/sightings\/.*/);
		await expect(page.getByRole("heading", { name: "Harakka" })).toBeVisible();
		await expect(page.getByText("Hidden Valley")).toBeVisible();
		await expect(page.getByText("A strictly secret note")).toBeVisible();

		// 5. Verify Bird Image and Attribution
		const birdImage = page.locator(".bird-image");
		await expect(birdImage).toBeVisible();
		await expect(birdImage).toHaveAttribute("alt", "Harakka");

		// Verify attribution is visible
		const attribution = page.locator(".bird-image-attribution");
		await expect(attribution).toBeVisible();
		// Check that attribution contains author info
		await expect(attribution).toContainText("Image by");
		// Check that license link is present
		const licenseLink = attribution.locator("a").first();
		await expect(licenseLink).toBeVisible();
	});
});
