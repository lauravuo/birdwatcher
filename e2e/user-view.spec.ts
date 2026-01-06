import { expect, type Page, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import { clearAllTestData } from "./helpers/firestore-helpers";

test.describe("User View", () => {
	const createGroup = async (
		page: Page,
		groupName: string,
		joinCode: string,
	) => {
		await page.getByLabel("Group Name:").fill(groupName);
		await page.getByLabel("Unique Join Code:").fill(joinCode);
		await page.getByRole("button", { name: "Create Group" }).click();
		await expect(page.getByText(groupName)).toBeVisible({ timeout: 10000 });
	};

	const logTypes: string[] = [];
	test.beforeEach(async ({ page }) => {
		while (logTypes.length > 0) logTypes.pop();

		await page.addInitScript(() => {
			localStorage.setItem("language", "en");
			window.location.reload = () => {};
		});

		page.on("console", (msg) => {
			console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
			logTypes.push(msg.type());
		});

		await clearAllTestData();
		const credentials = getTestUserCredentials();
		await createTestUser(credentials.email, credentials.password, "Tester");
		await page.goto("/");
		const { signInInBrowser } = await import("./helpers/browser-auth");
		await signInInBrowser(page, credentials.email, credentials.password);
		await expect(page.getByText("Your Groups")).toBeVisible({ timeout: 10000 });
	});

	test("navigates to user view and filters sightings", async ({ page }) => {
		const joinCode = "test-user-view";
		const groupName = "User View Group";
		await createGroup(page, groupName, joinCode);

		// 1. Enter Group
		await page.getByRole("button", { name: new RegExp(groupName) }).click();
		await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

		// 2. Add a Sighting
		await page.getByLabel("Add sighting").click();

		const birdInput = page.getByPlaceholder(/type to filter/i);
		await birdInput.fill("Harakka");
		await page.waitForTimeout(500);
		await page.getByText("Harakka").first().click();

		await page.getByLabel(/date/i).fill(new Date().toISOString().split("T")[0]);
		await page
			.getByRole("button", { name: "Add Sighting", exact: true })
			.click();

		// Confirm sighting is visible in group view
		await expect(page.getByText("Harakka")).toBeVisible();

		// 3. Click Member (Tester) - Wait for list to load
		await expect(page.getByText("Members (1)")).toBeVisible();
		await page.locator(".member-item").filter({ hasText: "Tester" }).click();

		// 4. Verify User View
		await expect(page.getByRole("heading", { name: "Tester" })).toBeVisible();
		await expect(page.getByText("Sightings (1)")).toBeVisible();
		await expect(page.getByText("Harakka")).toBeVisible();

		// 5. Change Month Filter to previous month (should show 0 sightings)
		// Note: This assumes test doesn't run at exact moment of month change causing flaky test
		// Better: Select specific month if possible, but simplest is "not current month"
		// Let's just pick a different year to be safe.
		const currentYear = new Date().getFullYear();
		await page.getByLabel("Year").selectOption(String(currentYear - 1));

		await expect(page.getByText("Sightings (0)")).toBeVisible();
		await expect(page.getByText("No sightings found")).toBeVisible();

		// 6. Click Back
		await page.getByRole("button", { name: "← Back" }).click();
		await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
	});
});
