import { doc, getDocs, runTransaction } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGroup, joinGroup } from "./firestore";

// Mock Firebase Firestore
vi.mock("firebase/firestore", async () => {
	return {
		getFirestore: vi.fn(),
		collection: vi.fn(),
		doc: vi.fn(() => ({ id: "mock-group-id" })),
		query: vi.fn(),
		where: vi.fn(),
		getDocs: vi.fn(),
		runTransaction: vi.fn(async (_db, updateFunction) => {
			const mockTransaction = {
				get: vi.fn(),
				set: vi.fn(),
				update: vi.fn(),
			};
			return await updateFunction(mockTransaction);
		}),
		arrayUnion: vi.fn((val) => ["arrayUnion", val]),
	};
});

// Mock Firebase Config
vi.mock("./firebase", () => ({
	db: {},
}));

describe("Firestore Service", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	const mockUser = {
		uid: "user-123",
		displayName: "Tester",
		email: "test@test.com",
	};

	describe("createGroup", () => {
		it("creates a group and updates user profile", async () => {
			const mockSnapshot = {
				empty: true,
				docs: [],
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const groupId = await createGroup("Test Group", "test-code", mockUser);

			expect(groupId).toBe("mock-group-id");
			expect(runTransaction).toHaveBeenCalled();
		});

		it("throws error if join code exists", async () => {
			const mockSnapshot = {
				empty: false,
				docs: [{}],
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			await expect(
				createGroup("Test Group", "taken-code", mockUser),
			).rejects.toThrow("Join code already taken");
		});
	});

	describe("joinGroup", () => {
		it("joins existing group", async () => {
			const mockSnapshot = {
				empty: false,
				docs: [
					{
						id: "existing-group-id",
						data: () => ({ memberIds: [] }),
					},
				],
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			// @ts-expect-error: Mocking complex objects
			vi.mocked(doc).mockReturnValue({ id: "existing-group-id" });

			const groupId = await joinGroup("existing-code", mockUser);

			expect(groupId).toBe("existing-group-id");
			expect(runTransaction).toHaveBeenCalled();
		});

		it("throws if group not found", async () => {
			const mockSnapshot = {
				empty: true,
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			await expect(joinGroup("invalid-code", mockUser)).rejects.toThrow(
				"Group not found",
			);
		});

		it("returns early if user is already a member", async () => {
			const mockSnapshot = {
				empty: false,
				docs: [
					{
						id: "existing-group-id",
						data: () => ({ memberIds: ["user-123"] }), // User already in group
					},
				],
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const groupId = await joinGroup("existing-code", mockUser);

			expect(groupId).toBe("existing-group-id");
			// Should NOT call transaction since user is already a member
			expect(runTransaction).not.toHaveBeenCalled();
		});
	});

	describe("getUserGroups", () => {
		it("fetches groups for a user", async () => {
			const mockGroups = [
				{ id: "group-1", name: "Group 1", joinCode: "code-1" },
				{ id: "group-2", name: "Group 2", joinCode: "code-2" },
			];
			const mockSnapshot = {
				docs: mockGroups.map((g) => ({
					data: () => g,
				})),
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getUserGroups } = await import("./firestore");
			const groups = await getUserGroups("user-123");

			expect(groups).toHaveLength(2);
			expect(groups[0].name).toBe("Group 1");
			expect(groups[1].name).toBe("Group 2");
		});
	});
});
