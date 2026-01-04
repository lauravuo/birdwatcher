import type { Page } from "@playwright/test";

/**
 * Perform a programmatic sign-in in the browser context
 * Requires window.auth to be exposed (see src/lib/firebase.ts)
 */
export async function signInInBrowser(
	page: Page,
	email: string,
	password: string,
) {
	await page.evaluate(
		async ({ email, password }) => {
			// @ts-expect-error
			if (!window.auth || !window.signInWithEmail) {
				throw new Error(
					"window.auth or window.signInWithEmail not found. Is VITE_USE_EMULATOR=true set?",
				);
			}

			// @ts-expect-error
			await window.signInWithEmail(window.auth, email, password);
		},
		{ email, password },
	);
}

/**
 * Perform a programmatic sign-out in the browser context
 */
export async function signOutInBrowser(page: Page) {
	await page.evaluate(async () => {
		// @ts-expect-error
		if (!window.auth) return;
		// @ts-expect-error
		await window.auth.signOut();
	});
}
