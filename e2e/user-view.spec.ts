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

		// 2. Add a Sighting (Jan)
		await page.getByLabel("Add sighting").click();

		const birdInput = page.getByPlaceholder(/type to filter/i);
		await birdInput.fill("Harakka");
		await page.waitForTimeout(500);
		await page
			.locator(".bird-dropdown")
			.getByRole("button", { name: "Harakka", exact: true })
			.click();

		const currentYear = new Date().getFullYear();
		const dateStrv1 = `${currentYear}-01-15`;
		await page.getByLabel(/date/i).fill(dateStrv1);
		await page
			.getByRole("button", { name: "Add Sighting", exact: true })
			.click();

		// Confirm sighting is visible in group view
		await expect(page.getByText("Harakka")).toBeVisible();

		// 3. Click Member (Tester) - Wait for list to load
		await expect(
			page.getByRole("heading", { name: "Members (1)" }),
		).toBeVisible();
		await page.locator(".member-item").filter({ hasText: "Tester" }).click();

		// 4. Verify User View Stats
		await expect(page.getByRole("heading", { name: "Tester" })).toBeVisible();

		// Filter to Jan
		await page.getByLabel("Month").selectOption("0"); // January is 0
		await page.getByLabel("Year").selectOption(String(currentYear));

		// Expect stats: Jan=1, Year=1, Total=1
		await expect(page.locator(".stat-item").nth(0)).toContainText("1"); // Month
		await expect(page.locator(".stat-item").nth(1)).toContainText("1"); // Year
		await expect(page.locator(".stat-item").nth(2)).toContainText("1"); // Total

		await expect(page.getByText("Sightings (1)")).toBeVisible();
		await expect(page.getByText("Harakka")).toBeVisible();

		// 5. Add another sighting for SAME BIRD in SAME MONTH (should not increase count)
		await page.getByRole("button", { name: "← Back" }).click();
		await page.getByLabel("Add sighting").click();
		await birdInput.fill("Harakka");
		await page.waitForTimeout(500);
		await page
			.locator(".bird-dropdown")
			.getByRole("button", { name: "Harakka", exact: true })
			.click();
		await page.getByLabel(/date/i).fill(dateStrv1);
		await page
			.locator(".add-sighting-form")
			.getByRole("button", { name: "Add Sighting" })
			.click();

		// Go back to user view
		await page.locator(".member-item").filter({ hasText: "Tester" }).click();
		await page.getByLabel("Month").selectOption("0"); // January

		// Expect stats: Jan=1 (unique), Year=1, Total=1
		await expect(page.locator(".stat-item").nth(0)).toContainText("1");
		await expect(page.locator(".stat-item").nth(1)).toContainText("1");
		await expect(page.locator(".stat-item").nth(2)).toContainText("1");

		// 6. Add sighting for DIFFERENT BIRD in SAME MONTH
		await page.getByRole("button", { name: "← Back" }).click();
		await page.getByLabel("Add sighting").click();
		await birdInput.fill("Varis");
		await page.waitForTimeout(500);
		await page
			.locator(".bird-dropdown")
			.getByRole("button", { name: "Varis", exact: true })
			.click();
		await page.getByLabel(/date/i).fill(dateStrv1);
		await page
			.locator(".add-sighting-form")
			.getByRole("button", { name: "Add Sighting" })
			.click();

		await page.locator(".member-item").filter({ hasText: "Tester" }).click();
		await page.getByLabel("Month").selectOption("0");

		// Expect stats: Jan=2, Year=2, Total=2
		await expect(page.locator(".stat-item").nth(0)).toContainText("2");
		await expect(page.locator(".stat-item").nth(1)).toContainText("2");
		await expect(page.locator(".stat-item").nth(2)).toContainText("2");

		// 7. Add sighting for SAME BIRD in DIFFERENT MONTH
		await page.getByRole("button", { name: "← Back" }).click();
		await page.getByLabel("Add sighting").click();
		await birdInput.fill("Harakka");
		await page.waitForTimeout(500);
		await page
			.locator(".bird-dropdown")
			.getByRole("button", { name: "Harakka", exact: true })
			.click();
		const dateStrv2 = `${currentYear}-02-15`;
		await page.getByLabel(/date/i).fill(dateStrv2);
		await page
			.locator(".add-sighting-form")
			.getByRole("button", { name: "Add Sighting" })
			.click();

		await page.locator(".member-item").filter({ hasText: "Tester" }).click();

		// Check Jan
		await page.getByLabel("Month").selectOption("0");
		await expect(page.locator(".stat-item").nth(0)).toContainText("2"); // Jan still 2

		// Check Feb
		await page.getByLabel("Month").selectOption("1"); // February
		await expect(page.locator(".stat-item").nth(0)).toContainText("1"); // Feb is 1 (Harakka)

		// Check Year
		// Year should be 2 + 1 = 3
		await expect(page.locator(".stat-item").nth(1)).toContainText("3");
		// Total should be 3
		await expect(page.locator(".stat-item").nth(2)).toContainText("3");
	});
});
