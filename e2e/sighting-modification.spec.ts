import { expect, test } from "./helpers/fixtures";
import { seedGroup, seedSightings } from "./helpers/firestore-helpers";
import crypto from "crypto";

test.describe("Sighting Modification (Edit/Delete)", () => {
	// Increase timeout for this suite
	test.setTimeout(60000);

	test("can edit an existing sighting", async ({ authenticatedPage, user }) => {
		const groupName = `Edit Test ${crypto.randomUUID().substring(0, 4)}`;
		const joinCode = `edit-${crypto.randomUUID().substring(0, 4)}`;
		
		await seedGroup({
			name: groupName,
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
		await authenticatedPage.getByRole("link", { name: new RegExp(joinCode) }).click();

		// Add a sighting via UI
		const { addSighting } = await import("./helpers/actions");
		const birdName = "Harakka"; // Magpie
		const today = new Date().toISOString().slice(0, 10);
		await addSighting(authenticatedPage, birdName, today);

		// We are now at User View which shows the sightings list
		await expect(authenticatedPage.getByTestId("user-view-heading")).toBeVisible();

		// Wait for sighting in list
		await expect(
			authenticatedPage.getByTestId("sighting-item").filter({ hasText: birdName }),
		).toBeVisible();

		// 2. Click the sighting to go to details
		await authenticatedPage
			.getByTestId("sighting-item")
			.filter({ hasText: birdName })
			.first()
			.click();

		// 3. Click Edit
		await authenticatedPage.getByRole("button", { name: "Edit" }).click();

		// 4. Change Bird and Notes
		const newBirdName = "Varis"; // Crow
		const birdInput = authenticatedPage.getByTestId("bird-input");
		await birdInput.click();
		await birdInput.clear(); // Clear existing
		await birdInput.fill(newBirdName);

		// Select from dropdown
		await authenticatedPage
			.locator(".bird-dropdown .bird-option")
			.filter({ hasText: newBirdName })
			.first()
			.click();

		const newNotes = "Updated notes via E2E";
		await authenticatedPage.locator("#notes").fill(newNotes);

		// 5. Submit
		await authenticatedPage.getByRole("button", { name: "Save" }).click();

		// 6. Verify changes in details view
		await expect(
			authenticatedPage.getByRole("heading", { name: newBirdName }),
		).toBeVisible();
		await expect(authenticatedPage.getByText(newNotes)).toBeVisible();
	});

	test("can delete an existing sighting", async ({ authenticatedPage, user }) => {
		const groupName = `Del Test ${crypto.randomUUID().substring(0, 4)}`;
		const joinCode = `del-${crypto.randomUUID().substring(0, 4)}`;
		
		await seedGroup({
			name: groupName,
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
		await authenticatedPage.getByRole("link", { name: new RegExp(joinCode) }).click();
		
		// 1. Add a sighting
		const { addSighting } = await import("./helpers/actions");
		const birdName = "Talitiainen"; // Great Tit
		const today = new Date().toISOString().slice(0, 10);
		await addSighting(authenticatedPage, birdName, today);

		await expect(authenticatedPage.getByTestId("user-view-heading")).toBeVisible();
		await expect(
			authenticatedPage.getByTestId("sighting-item").filter({ hasText: birdName }),
		).toBeVisible();

		// 2. Click sighting
		await authenticatedPage
			.getByTestId("sighting-item")
			.filter({ hasText: birdName })
			.first()
			.click();

		// 3. Delete
		authenticatedPage.on("dialog", (dialog) => dialog.accept()); // Accept confirm dialog
		await authenticatedPage.getByRole("button", { name: "Delete" }).click();

		// 4. Verify redirected back check that sighting is GONE
		await expect(
			authenticatedPage.getByTestId("sighting-item").filter({ hasText: birdName }),
		).not.toBeVisible();
	});
});
