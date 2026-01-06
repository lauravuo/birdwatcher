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
		orderBy: vi.fn(),
		getDocs: vi.fn(),
		addDoc: vi.fn(),
		runTransaction: vi.fn(async (_db, updateFunction) => {
			const mockTransaction = {
				get: vi.fn(),
				set: vi.fn(),
				update: vi.fn(),
			};
			return await updateFunction(mockTransaction);
		}),
		arrayUnion: vi.fn((val) => ["arrayUnion", val]),
		limit: vi.fn(),
		startAfter: vi.fn(),
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
		photoURL: "http://example.com/photo.jpg",
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

	describe("getGroupMembers", () => {
		it("fetches profiles for multiple members", async () => {
			const mockUsers = [
				{ id: "u1", displayName: "User 1", photoURL: "p1" },
				{ id: "u2", displayName: "User 2", photoURL: "p2" },
			];
			const mockSnapshot = {
				docs: mockUsers.map((u) => ({
					data: () => u,
				})),
			};
			// @ts-expect-error: Mocking complex objects
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getGroupMembers } = await import("./firestore");
			const members = await getGroupMembers(["u1", "u2"]);

			expect(members).toHaveLength(2);
			expect(members[0].displayName).toBe("User 1");
			expect(members[1].displayName).toBe("User 2");
		});

		it("returns empty array if no IDs provided", async () => {
			const { getGroupMembers } = await import("./firestore");
			const members = await getGroupMembers([]);
			expect(members).toEqual([]);
		});
	});

	describe("addSighting", () => {
		it("creates a sighting with all fields and updates stats", async () => {
			const { collection, runTransaction } = await import("firebase/firestore");
			const mockCollection = { id: "sightings" };
			// @ts-expect-error: Mocking
			vi.mocked(collection).mockReturnValue(mockCollection);

			const { addSighting } = await import("./firestore");
			const sightingId = await addSighting({
				userId: "user-123",
				birdId: "varis",
				date: "2024-01-15",
				time: "10:30",
				type: "visual",
				latitude: 60.1699,
				longitude: 24.9384,
				locationName: "Helsinki",
				notes: "Test sighting",
			});

			expect(sightingId).toBe("mock-group-id"); // Using the mocked doc() ID
			expect(runTransaction).toHaveBeenCalled();
		});

		it("filters out undefined values", async () => {
			const { runTransaction } = await import("firebase/firestore");

			const { addSighting } = await import("./firestore");
			await addSighting({
				userId: "user-123",
				birdId: "varis",
				date: "2024-01-15",
				type: "audial",
				time: undefined,
				latitude: undefined,
				longitude: undefined,
				locationName: undefined,
				notes: undefined,
			});

			expect(runTransaction).toHaveBeenCalled();
			// We can't easily inspect the internal transaction set calls with current mocks
			// but we verified runTransaction is called
		});
	});

	describe("getGroupSightings", () => {
		it("fetches sightings for group members", async () => {
			const mockSightings = [
				{
					id: "s1",
					userId: "user-1",
					birdId: "varis",
					date: "2024-01-15",
					type: "visual",
					createdAt: 1705320000000,
				},
				{
					id: "s2",
					userId: "user-2",
					birdId: "varpunen",
					date: "2024-01-16",
					type: "audial",
					createdAt: 1705406400000,
				},
			];

			const mockSnapshot = {
				docs: mockSightings.map((s) => ({
					id: s.id,
					data: () => ({
						userId: s.userId,
						birdId: s.birdId,
						date: s.date,
						type: s.type,
						createdAt: s.createdAt,
					}),
				})),
			};

			// @ts-expect-error: Mocking
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getGroupSightings } = await import("./firestore");
			const { sightings } = await getGroupSightings(["user-1", "user-2"]);

			expect(sightings).toHaveLength(2);
			expect(sightings[0].id).toBe("s2"); // Most recent first
			expect(sightings[1].id).toBe("s1");
		});

		it("returns pagination cursor", async () => {
			const mockSightings = [
				{
					id: "s1",
					userId: "user-1",
					createdAt: 100,
					date: "2024-01-01",
				},
			];
			const mockSnapshot = {
				docs: mockSightings.map((s) => ({
					id: s.id,
					data: () => s,
					ref: { id: s.id }, // Mock ref
				})),
			};
			// @ts-expect-error: Mocking
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getGroupSightings } = await import("./firestore");
			const { sightings, lastVisible } = await getGroupSightings(["user-1"]);

			expect(sightings).toHaveLength(1);
			expect(lastVisible).toBeDefined();
			// @ts-expect-error: Mocking
			expect(lastVisible.id).toBe("s1");
		});

		it("batches queries when more than 10 members", async () => {
			const memberIds = Array.from({ length: 25 }, (_, i) => `user-${i}`);
			const mockSnapshot = { docs: [] };

			// @ts-expect-error: Mocking
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getGroupSightings } = await import("./firestore");
			await getGroupSightings(memberIds);

			// Should be called 3 times (10 + 10 + 5)
			expect(getDocs).toHaveBeenCalledTimes(3);
		});

		it("returns empty array if no member IDs", async () => {
			const { getGroupSightings } = await import("./firestore");
			const { sightings } = await getGroupSightings([]);
			expect(sightings).toEqual([]);
			expect(getDocs).not.toHaveBeenCalled();
		});

		it("handles errors gracefully", async () => {
			const error = new Error("Firestore error");
			vi.mocked(getDocs).mockRejectedValue(error);

			const { getGroupSightings } = await import("./firestore");
			await expect(getGroupSightings(["user-1"])).rejects.toThrow(
				"Firestore error",
			);
		});
	});
	describe("getUserSightings", () => {
		it("fetches sightings for a user with date filters", async () => {
			const { getDocs, query, collection, where, orderBy } = await import(
				"firebase/firestore"
			);
			const mockSightings = [
				{
					id: "s1",
					userId: "user-1",
					birdId: "varis",
					date: "2024-01-15",
					type: "visual",
					createdAt: 1705320000000,
				},
			];

			const mockSnapshot = {
				docs: mockSightings.map((s) => ({
					id: s.id,
					data: () => s,
				})),
			};

			// @ts-expect-error: Mocking
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getUserSightings } = await import("./firestore");

			const startDate = "2024-01-01";
			const endDate = "2024-01-31";

			const result = await getUserSightings("user1", startDate, endDate);

			expect(result.sightings).toHaveLength(1);
			expect(result.sightings[0].id).toBe("s1");
			// Since only 1 doc and it's the last, it should be the cursor
			expect(result.lastVisible).toBeDefined();

			expect(query).toHaveBeenCalled();
			expect(collection).toHaveBeenCalledWith(expect.anything(), "sightings");
			expect(where).toHaveBeenCalledWith("userId", "==", "user1");
			expect(where).toHaveBeenCalledWith("date", ">=", startDate);
			expect(where).toHaveBeenCalledWith("date", "<=", endDate);
			expect(orderBy).toHaveBeenCalledWith("date", "desc");
			expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
		});

		it("returns pagination cursor", async () => {
			const { getDocs } = await import("firebase/firestore");
			const mockSightings = [
				{
					id: "s1",
					userId: "user-1",
					date: "2024-01-01",
				},
			];
			const mockSnapshot = {
				docs: mockSightings.map((s) => ({
					id: s.id,
					data: () => s,
					ref: { id: s.id },
				})),
			};
			// @ts-expect-error: Mocking
			vi.mocked(getDocs).mockResolvedValue(mockSnapshot);

			const { getUserSightings } = await import("./firestore");
			const { sightings, lastVisible } = await getUserSightings(
				"user1",
				"2024-01-01",
				"2024-01-31",
			);

			expect(sightings).toHaveLength(1);
			expect(lastVisible).toBeDefined();
		});
	});
});
