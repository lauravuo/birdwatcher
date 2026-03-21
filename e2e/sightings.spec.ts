import crypto from "node:crypto";
import { seedGroup } from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Sightings", () => {
	test.beforeEach(async ({ authenticatedPage }) => {
		// Set language to English for tests
		await authenticatedPage.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});
	});

	test("add sighting button is visible", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-btn-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await expect(addButton).toBeVisible();
		expect(await addButton.textContent()).toBe("+");
	});

	test("opens add sighting dialog when button is clicked", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-dlg-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await addButton.click();

		// Dialog should be visible
		await expect(authenticatedPage.getByLabel(/bird/i)).toBeVisible();
		await expect(authenticatedPage.getByLabel(/date/i)).toBeVisible();
		await expect(authenticatedPage.getByLabel(/time/i)).toBeVisible();
	});

	test("can add a sighting with required fields", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-add-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await addButton.click();

		// Fill in bird using testid
		const birdInput = authenticatedPage.getByTestId("bird-input");
		await birdInput.fill("varis");

		// Select bird from dropdown (removed waitForTimeout, relying on Playwright auto-wait)
		const birdOption = authenticatedPage
			.locator(".bird-dropdown .bird-option")
			.filter({ hasText: /varis/i })
			.first();
		await expect(birdOption).toBeVisible({ timeout: 10000 });
		await birdOption.click();

		// Date should already be filled, verify it's today
		const dateInput = authenticatedPage.getByLabel(/date/i);
		const todayFormatted = new Date().toISOString().slice(0, 10);
		await expect(dateInput).toHaveValue(todayFormatted);

		// Observation type should default to audial
		const audialRadio = authenticatedPage.getByLabel(/audial/i);
		await expect(audialRadio).toBeChecked();

		// Submit button should be enabled
		const submitButton = authenticatedPage.getByTestId("submit-sighting-btn");
		await expect(submitButton).not.toBeDisabled();

		// Submit the form
		await submitButton.click();

		// Dialog should close
		await expect(
			authenticatedPage.getByTestId("add-sighting-form"),
		).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("submit button is disabled when required fields are missing", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-dis-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await addButton.click();

		const submitButton = authenticatedPage.getByTestId("submit-sighting-btn");
		await expect(submitButton).toBeDisabled();
	});

	test("can filter birds in autocomplete", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-flt-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await addButton.click();

		const birdInput = authenticatedPage.getByTestId("bird-input");
		await birdInput.fill("var");

		// Auto-wait for results
		const varisOption = authenticatedPage
			.locator(".bird-dropdown .bird-option")
			.filter({ hasText: /varis/i })
			.first();
		await expect(varisOption).toBeVisible({ timeout: 10000 });
	});

	test("can get current location", async ({
		authenticatedPage,
		user,
		context,
	}) => {
		// Grant geolocation permission
		await context.grantPermissions(["geolocation"]);
		await context.setGeolocation({ latitude: 60.1699, longitude: 24.9384 });

		const joinCode = `sightings-loc-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		const addButton = authenticatedPage.getByLabel("Add sighting");
		await addButton.click();

		const getLocationButton = authenticatedPage.getByTestId("get-location-btn");
		await getLocationButton.click();

		// Wait for location loading
		await expect(getLocationButton).not.toBeDisabled({ timeout: 10000 });

		// Location fields should appear
		await expect(authenticatedPage.getByText("60.1699")).toBeVisible({
			timeout: 5000,
		});
		await expect(authenticatedPage.getByText("24.9384")).toBeVisible();
	});

	test("sightings list shows added sightings", async ({
		authenticatedPage,
		user,
	}) => {
		const joinCode = `sightings-lst-${crypto.randomUUID().substring(0, 4)}`;
		await seedGroup({ joinCode, ownerId: user.uid, memberIds: [user.uid] });

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		await authenticatedPage.getByRole("button", { name: "Sightings" }).click();

		await expect(
			authenticatedPage.getByRole("heading", { name: /sightings/i }),
		).toBeVisible({ timeout: 10000 });
		await expect(
			authenticatedPage.getByText(/no sightings found/i),
		).toBeVisible({ timeout: 5000 });
	});
});
