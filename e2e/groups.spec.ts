import { expect, test } from "@playwright/test";
import { createTestUser, getTestUserCredentials } from "./helpers/auth-helpers";
import {
    clearAllTestData,
    getGroupByCode,
    seedGroup,
} from "./helpers/firestore-helpers";

test.describe("Groups UI with Emulator", () => {
    test.beforeEach(async ({ page }) => {
        // Capture browser logs
        page.on("console", (msg) => {
            console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
        });

        // Clear all test data before each test
        await clearAllTestData();

        // 1. Create test user in emulator (Node context)
        const credentials = getTestUserCredentials();
        await createTestUser(credentials.email, credentials.password);

        // 2. Navigate and sign in (Browser context)
        await page.goto("/");
        const { signInInBrowser } = await import("./helpers/browser-auth");
        await signInInBrowser(page, credentials.email, credentials.password);

        // Wait for redirect to dashboard/groups
        await expect(page.getByText("Your Groups")).toBeVisible();

        // Debug: Check if browser is actually signed in
        const currentUser = await page.evaluate(() => {
            // @ts-ignore
            return window.auth?.currentUser?.email;
        });
        console.log(`Test User in browser: ${currentUser}`);
    });

    test("displays group management interface in dev mode", async ({ page }) => {
        // Check header
        await expect(page.getByText("Your Groups")).toBeVisible();
        await expect(
            page.getByText("You haven't joined any groups yet"),
        ).toBeVisible();

        // Check Create Form (Dev Only)
        await expect(
            page.getByRole("heading", { name: "Create New Group (Dev Only)" }),
        ).toBeVisible();
        await expect(page.getByLabel("Group Name:")).toBeVisible();
        await expect(page.getByLabel("Unique Join Code:")).toBeVisible();

        // Check Join Form (Dev Only)
        await expect(
            page.getByRole("heading", { name: "Join Existing Group (Dev Only)" }),
        ).toBeVisible();
        await expect(page.getByLabel("Enter Join Code:")).toBeVisible();
    });

    test("successfully joins group via URL with real Firestore", async ({
        page,
    }) => {
        // Seed a test group
        await seedGroup({
            name: "Test Birds Group",
            joinCode: "test-birds-2024",
            ownerId: "owner-123",
            memberIds: ["owner-123"],
        });

        // Navigate with join code
        await page.goto("/?group=test-birds-2024");

        // Wait for auto-join
        // Verify URL parameter was cleared
        await expect(page).not.toHaveURL(/group=/);

        // Verify group appears in the list
        await expect(page.getByText("Test Birds Group")).toBeVisible({ timeout: 10000 });
    });

    test("shows error for invalid join code", async ({ page }) => {
        await page.goto("/?group=invalid-code-xyz");

        // Wait for auto-join attempt
        await page.waitForTimeout(1500);

        // Should show error message
        const errorMessage = page.getByText(/Failed to auto-join group/);
        await expect(errorMessage).toBeVisible();
    });

    test("can create a new group in dev mode", async ({ page }) => {
        // Fill in create form
        await page.getByLabel("Group Name:").fill("My New Group");
        await page.getByLabel("Unique Join Code:").fill("my-new-group-2024");
        await page.getByRole("button", { name: "Create Group" }).click();

        // Verify group appears in list
        await expect(page.getByText("My New Group")).toBeVisible({ timeout: 10000 });

        // Verify it was actually created in Firestore
        const group = await getGroupByCode("my-new-group-2024");
        expect(group).not.toBeNull();
        expect(group?.name).toBe("My New Group");
    });
});
