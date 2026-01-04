import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
	test("unauthenticated user sees login page", async ({ page }) => {
		await page.goto("/");

		// Verify title
		await expect(page).toHaveTitle(/Birdwatcher/);

		// Verify Login button is present
		await expect(
			page.getByRole("button", { name: "Sign in with Google" }),
		).toBeVisible();

		// Verify Dashboard is NOT present
		await expect(page.getByText("Dashboard")).not.toBeVisible();
	});

	test("authenticated user sees dashboard (via debug bypass)", async ({
		page,
	}) => {
		// Set debug flag in localStorage before navigation
		await page.addInitScript(() => {
			localStorage.setItem("birdwatcher_debug_user", "true");
		});

		await page.goto("/");

		// Verify Dashboard is present
		await expect(
			page.getByText("Welcome! Dashboard coming soon..."),
		).toBeVisible();

		// Verify Logout button is present
		await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
	});
});
