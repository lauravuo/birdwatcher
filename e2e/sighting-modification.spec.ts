import { expect, test } from "@playwright/test";
import type { User } from "firebase/auth";

import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { clearAllTestData, seedGroup } from "./helpers/firestore-helpers";

test.describe("Sighting Modification (Edit/Delete)", () => {
	let testUser: User;
	const groupName = "Edit Test Group";
	const joinCode = "edit-test-123";

	// Increase timeout for this suite
	test.setTimeout(60000);

	test.beforeEach(async ({ page }) => {
		// Set language to English for tests (before any navigation)
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});

		await clearAllTestData();
		const credentials = getTestUserCredentials();
		testUser = await createTestUser(credentials.email, credentials.password);

		// Seed initial group
		await seedGroup({
			name: groupName,
			joinCode: joinCode,
			ownerId: testUser.uid,
			memberIds: [testUser.uid],
		});

		// Login using helper
		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);

		await expect(page.getByText(groupName)).toBeVisible({ timeout: 15000 });
		await page.getByText(groupName).click();
	});

	test("can edit an existing sighting", async ({ page }) => {
		// 1. Add a sighting
		const { addSighting } = await import("./helpers/actions");
		const birdName = "Harakka"; // Magpie
		const today = new Date().toISOString().slice(0, 10);
		await addSighting(page, birdName, today);

		// We are now at User View which shows the sightings list
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// Wait for sighting in list (Group View)
		await expect(
			page.getByTestId("sighting-item").filter({ hasText: birdName }),
		).toBeVisible();

		// 2. Click the sighting to go to details
		await page
			.getByTestId("sighting-item")
			.filter({ hasText: birdName })
			.first()
			.click();

		// 3. Click Edit
		await page.getByRole("button", { name: "Edit" }).click();

		// 4. Change Bird and Notes
		const newBirdName = "Varis"; // Crow
		// Clear and fill new bird
		// Note: The helper fills, but here we edit. Manual steps needed or new helper.
		// Manual steps for EDIT:
		const birdInput = page.getByTestId("bird-input");
		await birdInput.click();
		await birdInput.clear(); // Clear existing
		await birdInput.fill(newBirdName);

		// Select from dropdown
		await page
			.locator(".bird-dropdown .bird-option")
			.filter({ hasText: newBirdName })
			.first()
			.click();

		const newNotes = "Updated notes via E2E";
		await page.locator("#notes").fill(newNotes);

		// 5. Submit
		await page.getByRole("button", { name: "Save" }).click();

		// 6. Verify changes in details view
		await expect(
			page.getByRole("heading", { name: newBirdName }),
		).toBeVisible();
		await expect(page.getByText(newNotes)).toBeVisible();
	});

	test("can delete an existing sighting", async ({ page }) => {
		// 1. Add a sighting
		const { addSighting } = await import("./helpers/actions");
		const birdName = "Talitiainen"; // Great Tit
		const today = new Date().toISOString().slice(0, 10);
		await addSighting(page, birdName, today);

		// We are now at User View which shows the sightings list
		await expect(page.getByTestId("user-view-heading")).toBeVisible();

		// Wait for sighting in list
		await expect(
			page.getByTestId("sighting-item").filter({ hasText: birdName }),
		).toBeVisible();

		// 2. Click sighting
		await page
			.getByTestId("sighting-item")
			.filter({ hasText: birdName })
			.first()
			.click();

		// 3. Delete
		page.on("dialog", (dialog) => dialog.accept()); // Accept confirm dialog
		await page.getByRole("button", { name: "Delete" }).click();

		// 4. Verify redirected back check that sighting is GONE
		await expect(
			page.getByTestId("sighting-item").filter({ hasText: birdName }),
		).not.toBeVisible();
	});
});
