import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import {
	clearAllTestData,
	seedGroup,
	seedSighting,
} from "./helpers/firestore-helpers";

test.describe("Redirection Logic", () => {
	const groupName = "Nav Test Group";
	const joinCode = "nav-test-123";

	test.beforeEach(async ({ page }) => {
		// Set language
		await page.addInitScript(() => localStorage.setItem("language", "en"));
		await clearAllTestData();
		const credentials = getTestUserCredentials();
		const user = await createTestUser(credentials.email, credentials.password);
		await seedGroup({
			name: groupName,
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);
		await page.getByText(groupName).first().click();
	});

	test("Group View -> Add Sighting redirects to User View", async ({
		page,
	}) => {
		// 1. Click Add button (FAB)
		await page.getByLabel("Add sighting").click();

		// 2. Fill Form
		const birdInput = page.getByTestId("bird-input");
		await birdInput.click();
		await birdInput.fill("Harakka");
		await page.locator(".autocomplete-dropdown .bird-option").first().click();
		await page
			.locator("#date-input")
			.fill(new Date().toISOString().split("T")[0]);

		// 3. Submit
		await page.getByTestId("submit-sighting-btn").click();

		// 4. Expect Redirection to User View
		// User view has "Your Sightings" or specific header
		await expect(page.getByTestId("user-view-heading")).toBeVisible({
			timeout: 10000,
		});
		// And dialog should be gone
		await expect(page.locator(".add-sighting-dialog")).not.toBeVisible();
	});

	test("Edit Sighting -> Redirects to/Stays on Sighting Details", async ({
		page,
	}) => {
		// Seed a sighting first
		// We'll just add one via UI for simplicity or use helper if available.
		// Using helper is better but let's do UI to be sure of flow.

		// Go to user view to find a sighting (or just add one now)
		const { addSighting } = await import("./helpers/actions");
		await addSighting(page, "Varis", new Date().toISOString().split("T")[0]);
		// await switchToSightingsTab(page); // We are already at User View which has the list

		// Click item
		await page.getByTestId("sighting-item").first().click();

		// Click Edit
		await page.getByRole("button", { name: "Edit" }).click();

		// Change something
		await page.locator("#notes").fill("Edited notes");

		// Save
		await page.getByRole("button", { name: "Save" }).click();

		// Expect to see Details View again (specifically the updated note)
		await expect(page.getByText("Edited notes")).toBeVisible();
		// Expect Edit form to be gone
		await expect(page.getByTestId("add-sighting-form")).not.toBeVisible();
	});
});
