import { expect, type Page } from "@playwright/test";

export async function createGroupAndJoin(
	page: Page,
	groupName: string,
): Promise<string> {
	await page.getByLabel("Group Name:").fill(groupName);
	await page.getByRole("button", { name: "Create Group" }).click();

	const groupLink = page.getByRole("link", { name: new RegExp(groupName) });
	await expect(groupLink).toBeVisible({ timeout: 10000 });

	const text = await groupLink.innerText();
	const match = text.match(/\(([^)]+)\)/);
	if (!match) throw new Error(`Could not extract join code from "${text}"`);
	return match[1];
}

export async function addSighting(page: Page, birdName: string, date: string) {
	await page.getByLabel("Add sighting").click();

	const birdInput = page.getByTestId("bird-input");
	await birdInput.fill(birdName);
	// Wait for debounce and search results
	await page.waitForTimeout(500);

	await page
		.locator(".bird-dropdown .bird-option")
		.filter({ hasText: birdName })
		.first()
		.click();

	// Ensure dropdown closes (selection made)
	await expect(page.locator(".bird-dropdown")).not.toBeVisible();

	await page.getByLabel(/date/i).fill(date);

	await page.getByTestId("submit-sighting-btn").click();

	// Wait for the form to disappear or redirect to happen
	await expect(page.getByTestId("add-sighting-form")).not.toBeVisible();
}

export async function navigateToUserView(page: Page) {
	await page.getByTestId("user-profile-link").click();
	await expect(page.getByTestId("user-view-heading")).toBeVisible();
}

export async function navigateToGroupView(page: Page, groupName: string) {
	await page
		.locator(".breadcrumbs")
		.getByRole("link", { name: groupName, exact: true })
		.click();

	// Wait for any loading potential
	await expect(page.getByText("Loading members...")).not.toBeVisible();
}

export async function switchToSightingsTab(page: Page) {
	await page.getByTestId("tab-sightings").click();
	await expect(page.locator(".sightings-list")).toBeVisible();
}

export async function switchToMembersTab(page: Page) {
	await page.getByTestId("tab-members").click();
	await expect(page.locator(".member-item").first()).toBeVisible();
}
