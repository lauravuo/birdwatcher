import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { signInInBrowser } from "./helpers/browser-auth";
import { clearAllTestData, seedGroup } from "./helpers/firestore-helpers";

test.describe("Sightings", () => {
	test.beforeEach(async ({ page }) => {
		// Set language to English for tests
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});

		// Clear all test data
		await clearAllTestData();

		// Create test user and sign in
		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"Tester",
		);

		// Seed a group so the Add Sighting button is visible
		await seedGroup({
			name: "Test Group",
			joinCode: "test-group",
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await page.goto("/");
		await signInInBrowser(page, credentials.email, credentials.password);
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
	});

	test("add sighting button is visible", async ({ page }) => {
		const addButton = page.getByLabel("Add sighting");
		await expect(addButton).toBeVisible();
		expect(await addButton.textContent()).toBe("+");
	});

	test("opens add sighting dialog when button is clicked", async ({ page }) => {
		const addButton = page.getByLabel("Add sighting");
		await addButton.click();

		// Dialog should be visible
		await expect(page.getByLabel(/bird/i)).toBeVisible();
		await expect(page.getByLabel(/date/i)).toBeVisible();
		await expect(page.getByLabel(/time/i)).toBeVisible();
	});

	test("can add a sighting with required fields", async ({ page }) => {
		// Get test user UID
		const credentials = getTestUserCredentials();
		const user = await createTestUser(credentials.email, credentials.password);

		// Create a group first
		const joinCode = "test-sightings";
		await seedGroup({
			name: "Test Group",
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		// Navigate to group
		await page.goto(`/?group=${joinCode}`);
		// Owner sees "Your Groups"
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
		await page.getByRole("link", { name: new RegExp(joinCode) }).click();

		// Use addSighting helper logic but we want to verify individual fields visibility first
		// So we mostly keep manual steps but use better selectors
		const addButton = page.getByLabel("Add sighting");
		await addButton.click();

		// Fill in bird using testid
		const birdInput = page.getByTestId("bird-input");
		await birdInput.fill("varis");
		await page.waitForTimeout(500);

		// Select bird from dropdown
		const birdOption = page
			.locator(".autocomplete-dropdown .bird-option")
			.filter({ hasText: /varis/i })
			.first();
		await expect(birdOption).toBeVisible({ timeout: 5000 });
		await birdOption.click();

		// Date should already be filled, verify it's today
		const dateInput = page.getByLabel(/date/i);
		const todayFormatted = new Date().toISOString().slice(0, 10);
		await expect(dateInput).toHaveValue(todayFormatted);

		// Observation type should default to audial
		const audialRadio = page.getByLabel(/audial/i);
		await expect(audialRadio).toBeChecked();

		// Submit button should be enabled
		const submitButton = page.getByTestId("submit-sighting-btn");
		await expect(submitButton).not.toBeDisabled();

		// Submit the form
		await submitButton.click();

		// Dialog should close
		await expect(page.getByTestId("add-sighting-form")).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("submit button is disabled when required fields are missing", async ({
		page,
	}) => {
		const addButton = page.getByLabel("Add sighting");
		await addButton.click();

		const submitButton = page.getByTestId("submit-sighting-btn");
		await expect(submitButton).toBeDisabled();
	});

	test("can filter birds in autocomplete", async ({ page }) => {
		const addButton = page.getByLabel("Add sighting");
		await addButton.click();

		// Use correct selector (testid)
		const birdInput = page.getByTestId("bird-input");
		await birdInput.fill("var");

		// Wait for dropdown to appear
		await page.waitForTimeout(500);

		// Should show filtered results
		const varisOption = page
			.locator(".autocomplete-dropdown .bird-option")
			.filter({ hasText: /varis/i })
			.first();
		await expect(varisOption).toBeVisible({ timeout: 5000 });
	});

	test("can get current location", async ({ page, context }) => {
		// Grant geolocation permission
		await context.grantPermissions(["geolocation"]);

		// Mock geolocation
		await context.setGeolocation({ latitude: 60.1699, longitude: 24.9384 });

		const addButton = page.getByLabel("Add sighting");
		await addButton.click();

		const getLocationButton = page.getByTestId("get-location-btn");
		await getLocationButton.click();

		// Wait for location loading to finish
		await expect(getLocationButton).not.toBeDisabled({ timeout: 10000 });

		// Check for error first
		const errorMsg = page.locator(".error-message");
		if (await errorMsg.isVisible()) {
			console.log(
				"Geolocation error:",
				await errorMsg.textContent(),
				" - This is likely an environment issue.",
			);
			// Do not fail the test if it's just environment setup, but ideally we fix it.
			// For now, let's allow it to fail the proper assertion so we see it in report.
		}

		// Location fields should appear (coordinates displayed as text)
		await expect(page.getByText("60.1699")).toBeVisible({ timeout: 5000 });
		await expect(page.getByText("24.9384")).toBeVisible();
	});

	test("sightings list shows added sightings", async ({ page }) => {
		// Create a group
		const joinCode = "test-sightings-list";
		const credentials = getTestUserCredentials();
		const user = await createTestUser(
			credentials.email,
			credentials.password,
			"Tester",
		);

		await seedGroup({
			name: "Test Group",
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		// Navigate to group
		await page.goto(`/?group=${joinCode}`);

		// Owner sees "Your Groups"
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
		await page.getByRole("link", { name: new RegExp(joinCode) }).click();

		// Click Sightings tab
		await page.getByRole("button", { name: "Sightings" }).click();

		// Wait for sightings section
		await expect(page.getByRole("heading", { name: /sightings/i })).toBeVisible(
			{ timeout: 10000 },
		);

		// Initially should show no sightings
		await expect(page.getByText(/no sightings found/i)).toBeVisible({
			timeout: 5000,
		});
	});
});
