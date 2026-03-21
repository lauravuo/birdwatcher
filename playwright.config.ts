import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	testIgnore: process.env.RUN_SEED_SCRIPT ? undefined : "**/setup/**",
	globalSetup: "./e2e/setup/global.setup",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined, // Use multiple cores for performance
	reporter: "html",
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev -- --mode test",
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
	},
});
