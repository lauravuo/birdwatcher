import { expect, test } from "@playwright/test";
import { createTestUser } from "./helpers/auth-helpers";

test.describe("Authentication", () => {
	test.beforeEach(async ({ page }) => {
		// Set language to English for tests (before any navigation)
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});
	});

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

	test("authenticated user sees dashboard (via Auth Emulator)", async ({
		page,
	}) => {
		const email = "test@birdwatcher.test";
		const password = "testpassword123";

		// 1. Create user in emulator (Node context)
		await createTestUser(email, password);

		// 2. Navigate and sign in (Browser context)
		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, email, password);

		// 3. Verify Dashboard is present
		await expect(page.getByText("Your Groups")).toBeVisible();

		// Verify Logout button is present
		await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
	});
});
