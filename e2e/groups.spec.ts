import { expect, test } from "@playwright/test";

test.describe("Groups UI", () => {
	test.beforeEach(async ({ page }) => {
		// Authenticate via debug bypass
		await page.addInitScript(() => {
			localStorage.setItem("birdwatcher_debug_user", "true");
		});
		await page.goto("/");
	});

	test("displays group management interface", async ({ page }) => {
		// Check finding header
		await expect(page.getByText("Your Groups")).toBeVisible();
		await expect(
			page.getByText("You haven't joined any groups yet"),
		).toBeVisible();

		// Check Create Form
		await expect(
			page.getByRole("heading", { name: "Create New Group" }),
		).toBeVisible();
		await expect(page.getByLabel("Group Name:")).toBeVisible();
		await expect(page.getByLabel("Unique Join Code:")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Create Group" }),
		).toBeVisible();

		// Check Join Form
		await expect(
			page.getByRole("heading", { name: "Join Existing Group" }),
		).toBeVisible();
		await expect(page.getByLabel("Enter Join Code:")).toBeVisible();
		await expect(page.getByRole("button", { name: "Join" })).toBeVisible();
	});
});
