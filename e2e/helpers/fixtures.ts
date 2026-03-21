import { test as base, type Page } from "@playwright/test";
import { createTestUser } from "./auth-helpers";
import { signInInBrowser } from "./browser-auth";
import crypto from "crypto";

export type TestUser = {
	uid: string;
	email: string;
	password: string;
	displayName: string;
};

/**
 * Extended Playwright test with automatic request failure logging
 * and built-in fixtures for authenticated data isolation.
 */
export const test = base.extend<{
	user: TestUser;
	authenticatedPage: Page;
}>({
	page: async ({ page }, use) => {
		// Log failed network requests
		page.on("requestfailed", (request) => {
			console.log(
				`❌ Failed: ${request.url()} | Error: ${request.failure()?.errorText}`,
			);
		});

		// Enforce English language for all tests to prevent localized text timeouts
		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
		});

		// Use the page with request failure logging enabled
		await use(page);
	},
	
	user: async ({}, use) => {
		// 1. Generate unique random credentials for this test
		const id = crypto.randomUUID();
		const email = `user-${id}@birdwatcher.test`;
		const password = "password123";
		const displayName = `User ${id.substring(0, 4)}`;

		// 2. Create in Firebase Auth (Node context)
		const firebaseUser = await createTestUser(email, password, displayName);
		
		// 3. Provide user info to the test
		await use({ 
			uid: firebaseUser.uid, 
			email, 
			password, 
			displayName 
		});
	},

	authenticatedPage: async ({ page, user }, use) => {
		// 1. Navigate and sign in (Browser context)
		await page.goto("/");
		await signInInBrowser(page, user.email, user.password);
		
		// 2. Provide the authenticated page to the test
		await use(page);
	}
});

export { expect } from "@playwright/test";
