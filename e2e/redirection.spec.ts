import crypto from "node:crypto";
import { seedGroup } from "./helpers/firestore-helpers";
import { expect, test } from "./helpers/fixtures";

test.describe("Redirection Logic", () => {
	test("Group View -> Add Sighting redirects to User View", async ({
		authenticatedPage,
		user,
	}) => {
		const groupName = `Nav Test ${crypto.randomUUID().substring(0, 4)}`;
		const joinCode = `nav-${crypto.randomUUID().substring(0, 4)}`;

		await seedGroup({
			name: groupName,
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		// 1. Click Add button (FAB)
		await authenticatedPage.getByLabel("Add sighting").click();

		// 2. Fill Form
		const birdInput = authenticatedPage.getByTestId("bird-input");
		await birdInput.click();
		await birdInput.fill("Harakka");
		await authenticatedPage
			.locator(".bird-dropdown .bird-option")
			.first()
			.click();

		// 3. Submit
		await authenticatedPage.getByTestId("submit-sighting-btn").click();

		// 4. Expect Redirection to User View
		await expect(
			authenticatedPage.getByTestId("user-view-heading"),
		).toBeVisible({
			timeout: 10000,
		});
		await expect(
			authenticatedPage.locator(".add-sighting-dialog"),
		).not.toBeVisible();
	});

	test("Edit Sighting -> Redirects to/Stays on Sighting Details", async ({
		authenticatedPage,
		user,
	}) => {
		// Go to user view to find a sighting (or just add one now)
		const { addSighting } = await import("./helpers/actions");
		// Need a group so the FAB shows up
		const groupName = `Nav Test 2 ${crypto.randomUUID().substring(0, 4)}`;
		const joinCode = `nav2-${crypto.randomUUID().substring(0, 4)}`;

		await seedGroup({
			name: groupName,
			joinCode,
			ownerId: user.uid,
			memberIds: [user.uid],
		});

		await authenticatedPage.goto(`/?group=${joinCode}`);
		await expect(authenticatedPage.getByText("Your Groups")).toBeVisible({
			timeout: 10000,
		});
		await authenticatedPage
			.getByRole("link", { name: new RegExp(joinCode) })
			.click();

		await addSighting(
			authenticatedPage,
			"Varis",
			new Date().toISOString().split("T")[0],
		);

		// Click item
		await authenticatedPage.getByTestId("sighting-item").first().click();

		// Click Edit
		await authenticatedPage.getByRole("button", { name: "Edit" }).click();

		// Change something
		await authenticatedPage.locator("#notes").fill("Edited notes");

		// Save
		await authenticatedPage.getByRole("button", { name: "Save" }).click();

		// Expect to see Details View again (specifically the updated note)
		await expect(authenticatedPage.getByText("Edited notes")).toBeVisible();
		// Expect Edit form to be gone
		await expect(
			authenticatedPage.getByTestId("add-sighting-form"),
		).not.toBeVisible();
	});
});
