import { test as base } from "@playwright/test";

/**
 * Extended Playwright test with automatic request failure logging
 */
export const test = base.extend({
	page: async ({ page }, use) => {
		// Log failed network requests
		page.on("requestfailed", (request) => {
			console.log(
				`❌ Failed: ${request.url()} | Error: ${request.failure()?.errorText}`,
			);
		});

		// Use the page with request failure logging enabled
		await use(page);
	},
});

export { expect } from "@playwright/test";
