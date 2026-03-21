import {
	arrayRemove,
	arrayUnion,
	collection,
	doc,
	documentId,
	getDoc,
	getDocs,
	limit,
	orderBy,
	type QueryConstraint,
	type QueryDocumentSnapshot,
	query,
	runTransaction,
	startAfter,
	where,
} from "firebase/firestore";

import type { Group, UserProfile } from "../types";
import type { Sighting } from "../types/sighting";
import { db } from "./firebase";

// ... (existing code) ...

// --- User Stats Service ---

export const getUsersStats = async (
	userIds: string[],
	year?: number,
): Promise<Map<string, Record<string, string[]>>> => {
	if (userIds.length === 0) return new Map();

	const userStatsMap = new Map<string, Record<string, string[]>>();

	// If year is provided, we can fetch specific documents directly by ID
	if (year) {
		const docIds = userIds.map((uid) => `${uid}_${year}`);
		const batchSize = 10;

		for (let i = 0; i < docIds.length; i += batchSize) {
			const batch = docIds.slice(i, i + batchSize);
			if (batch.length === 0) continue;

			const q = query(
				collection(db, "user_yearly_stats"),
				where(documentId(), "in", batch),
			);
			const snapshot = await getDocs(q);

			snapshot.forEach((doc) => {
				const data = doc.data();
				// Extract userId from doc ID or field. doc.id is "{userId}_{year}"
				const userId = doc.id.split("_")[0];

				// Return the stats object which contains month keys like "2024-01"
				userStatsMap.set(
					userId,
					(data.stats || {}) as Record<string, string[]>,
				);
			});
		}
	} else {
		// If no year provided, we must fetch ALL stats for these users.
		// This requires a query by userId field.
		// Note: The 'in' query limit is 10.
		const batchSize = 10;
		for (let i = 0; i < userIds.length; i += batchSize) {
			const batch = userIds.slice(i, i + batchSize);
			const q = query(
				collection(db, "user_yearly_stats"),
				where("userId", "in", batch),
			);
			const snapshot = await getDocs(q);

			snapshot.forEach((doc) => {
				const data = doc.data();
				const userId = data.userId;
				const stats = (data.stats || {}) as Record<string, string[]>;

				const existing = userStatsMap.get(userId) || {};
				userStatsMap.set(userId, { ...existing, ...stats });
			});
		}
	}

	return userStatsMap;
};

// --- Group Service ---

export const createGroup = async (
	name: string,
	joinCode: string,
	user: {
		uid: string;
		displayName: string | null;
		email: string | null;
		photoURL: string | null;
	},
): Promise<string> => {
	const normalizedCode = joinCode.toLowerCase().trim();

	// 1. Check uniqueness BEFORE transaction (Queries not allowed in client transactions)
	const q = query(
		collection(db, "groups"),
		where("joinCode", "==", normalizedCode),
	);
	const snapshot = await getDocs(q);
	if (!snapshot.empty) {
		throw new Error("Join code already taken");
	}

	// 2. Create Group Ref
	const groupRef = doc(collection(db, "groups"));
	const groupId = groupRef.id;

	const newGroup: Group = {
		id: groupId,
		name,
		joinCode: normalizedCode,
		ownerId: user.uid,
		memberIds: [user.uid],
		createdAt: Date.now(),
	};

	return await runTransaction(db, async (transaction) => {
		transaction.set(groupRef, newGroup);

		// 3. Update User Profile
		const userRef = doc(db, "users", user.uid);
		transaction.set(
			userRef,
			{
				id: user.uid,
				displayName: user.displayName || "Anonymous",
				email: user.email || "",
				photoURL: user.photoURL || null,
				groupIds: arrayUnion(groupId),
			},
			{ merge: true },
		);

		return groupId;
	});
};

export const joinGroup = async (
	joinCode: string,
	user: {
		uid: string;
		displayName: string | null;
		email: string | null;
		photoURL: string | null;
	},
): Promise<string> => {
	const normalizedCode = joinCode.toLowerCase().trim();

	// 1. Find the group
	const q = query(
		collection(db, "groups"),
		where("joinCode", "==", normalizedCode),
	);
	const snapshot = await getDocs(q);

	if (snapshot.empty) {
		throw new Error("Group not found");
	}

	const groupDoc = snapshot.docs[0];
	const groupId = groupDoc.id;

	// Check if already member
	const groupData = groupDoc.data() as Group;
	if (groupData.memberIds.includes(user.uid)) {
		return groupId; // Already joined, just return ID
	}

	const groupRef = doc(db, "groups", groupId);
	const userRef = doc(db, "users", user.uid);

	// 2. Update Membership
	await runTransaction(db, async (transaction) => {
		transaction.update(groupRef, {
			memberIds: arrayUnion(user.uid),
		});

		transaction.set(
			userRef,
			{
				id: user.uid,
				displayName: user.displayName || "Anonymous",
				email: user.email || "",
				photoURL: user.photoURL || null,
				groupIds: arrayUnion(groupId),
			},
			{ merge: true },
		);
	});

	// Recalculate group stats in the background
	recalculateGroupStats(groupId).catch(console.error);

	return groupId;
};

export const getUserGroups = async (userId: string): Promise<Group[]> => {
	const q = query(
		collection(db, "groups"),
		where("memberIds", "array-contains", userId),
	);
	const snapshot = await getDocs(q);
	return snapshot.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<Group, "id">),
	})) as Group[];
};

export const getGroupMembers = async (
	memberIds: string[],
): Promise<UserProfile[]> => {
	if (memberIds.length === 0) return [];

	const q = query(collection(db, "users"), where("id", "in", memberIds));
	const snapshot = await getDocs(q);
	return snapshot.docs.map((d) => d.data() as UserProfile);
};

export const removeUserFromGroup = async (
	groupId: string,
	userIdToRemove: string,
): Promise<void> => {
	const groupRef = doc(db, "groups", groupId);
	await import("firebase/firestore").then(async (fs) => {
		await fs.updateDoc(groupRef, {
			memberIds: arrayRemove(userIdToRemove),
		});
	});

	// Recalculate group stats in the background
	recalculateGroupStats(groupId).catch(console.error);
};

export const getUserProfile = async (
	userId: string,
): Promise<UserProfile | null> => {
	const docRef = doc(db, "users", userId);
	const snapshot = await getDoc(docRef);
	if (snapshot.exists()) {
		return snapshot.data() as UserProfile;
	}
	return null;
};

// --- Sighting Service ---

export async function addSighting(
	sighting: Omit<Sighting, "id" | "createdAt">,
) {
	// Filter out undefined values - Firestore doesn't accept undefined
	const cleanSighting = Object.fromEntries(
		Object.entries(sighting).filter(([_, value]) => value !== undefined),
	) as Omit<Sighting, "id" | "createdAt">;

	const timestamp = Date.now();
	const sightingData = {
		...cleanSighting,
		createdAt: timestamp,
	};

	const sightingRef = doc(collection(db, "sightings"));

	const statsDate = new Date(sighting.date);
	const year = statsDate.getFullYear();
	const yearMonth = `${year}-${String(statsDate.getMonth() + 1).padStart(2, "0")}`;

	await runTransaction(db, async (transaction) => {
		// 1. ALL READS MUST COME FIRST IN CLIENT SDK
		const userRef = doc(db, "users", sighting.userId);
		const userDoc = await transaction.get(userRef);

		const groupIds = userDoc.exists() ? userDoc.data().groupIds || [] : [];
		const groupStatsDocs: { groupId: string; groupStatsRef: any; doc: any }[] =
			[];

		for (const groupId of groupIds) {
			const groupStatsRef = doc(db, "group_yearly_stats", `${groupId}_${year}`);
			const groupStatsDoc = await transaction.get(groupStatsRef);
			groupStatsDocs.push({ groupId, groupStatsRef, doc: groupStatsDoc });
		}

		// 2. NOW WE CAN PERFORM WRITES
		transaction.set(sightingRef, sightingData);

		const statsRef = doc(db, "user_yearly_stats", `${sighting.userId}_${year}`);
		transaction.set(
			statsRef,
			{
				userId: sighting.userId,
				year: year,
				stats: {
					[yearMonth]: arrayUnion(sighting.birdId),
				},
			},
			{ merge: true },
		);

		// 3. Update Group Stats for each group the user is in
		for (const {
			groupId,
			groupStatsRef,
			doc: groupStatsDoc,
		} of groupStatsDocs) {
			let seenBirds: string[] = [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let latestFirsts: any[] = [];

			if (groupStatsDoc.exists()) {
				const data = groupStatsDoc.data();
				seenBirds = data.seenBirds || [];
				latestFirsts = data.latestFirsts || [];
			}

			if (!seenBirds.includes(sighting.birdId)) {
				seenBirds.push(sighting.birdId);

				latestFirsts.push({
					birdId: sighting.birdId,
					sightingId: sightingRef.id,
					userId: sighting.userId,
					date: sighting.date,
					createdAt: timestamp,
				});

				latestFirsts.sort((a, b) => {
					if (a.date !== b.date) return b.date.localeCompare(a.date);
					return b.createdAt - a.createdAt;
				});

				if (latestFirsts.length > 5) {
					latestFirsts = latestFirsts.slice(0, 5);
				}

				transaction.set(
					groupStatsRef,
					{
						groupId,
						year,
						seenBirds,
						latestFirsts,
					},
					{ merge: true },
				);
			}
		}
	});

	return sightingRef.id;
}

export async function deleteSighting(sightingId: string, userId: string) {
	await import("firebase/firestore").then(async (fs) => {
		await fs.deleteDoc(doc(db, "sightings", sightingId));
	});
	// Recalculate stats to ensure consistency (e.g. if this was unique bird for month)
	await recalculateUserStats(userId);
	const user = await getUserProfile(userId);
	if (user?.groupIds) {
		user.groupIds.forEach((groupId) => {
			recalculateGroupStats(groupId).catch(console.error);
		});
	}
}

export async function updateSighting(
	sightingId: string,
	sighting: Partial<Sighting> & { userId: string },
) {
	const sightingRef = doc(db, "sightings", sightingId);

	// Filter out undefined values
	const cleanSighting = Object.fromEntries(
		Object.entries(sighting).filter(([_, value]) => value !== undefined),
	);

	await import("firebase/firestore").then(async (fs) => {
		await fs.updateDoc(sightingRef, cleanSighting);
	});

	await recalculateUserStats(sighting.userId);
	const user = await getUserProfile(sighting.userId);
	if (user?.groupIds) {
		user.groupIds.forEach((groupId) => {
			recalculateGroupStats(groupId).catch(console.error);
		});
	}
}

export const getGroupSightings = async (
	memberIds: string[],
	startDate: string, // YYYY-MM-DD
	endDate: string, // YYYY-MM-DD
	limitCount = 20,
	lastSightingCursor?: QueryDocumentSnapshot,
	birdId?: string | null,
): Promise<{
	sightings: Sighting[];
	lastVisible: QueryDocumentSnapshot | null;
}> => {
	if (memberIds.length === 0) return { sightings: [], lastVisible: null };

	// Firestore "in" query has a limit of 10 items
	// If we have more than 10 members, we need to batch the queries
	const batchSize = 10;
	const allSightings: {
		data: Sighting;
		snapshot: QueryDocumentSnapshot;
	}[] = [];

	try {
		for (let i = 0; i < memberIds.length; i += batchSize) {
			const batch = memberIds.slice(i, i + batchSize);
			if (batch.length === 0) continue;

			const constraints: QueryConstraint[] = [
				where("userId", "in", batch),
				where("date", ">=", startDate),
				where("date", "<=", endDate),
			];

			if (birdId) {
				constraints.push(where("birdId", "==", birdId));
			}

			constraints.push(orderBy("date", "desc"), orderBy("createdAt", "desc"));

			if (lastSightingCursor) {
				constraints.push(startAfter(lastSightingCursor));
			}

			// Apply limit last
			constraints.push(limit(limitCount));

			const q = query(collection(db, "sightings"), ...constraints);
			const snapshot = await getDocs(q);

			// We need to keep the snapshot to return it as cursor
			snapshot.docs.forEach((d) => {
				allSightings.push({
					data: { id: d.id, ...(d.data() as Omit<Sighting, "id">) } as Sighting,
					snapshot: d,
				});
			});
		}

		// Sort all sightings by date descending (most recent first)
		// For stable sort with same date, we fall back to createdAt (which matches implicit snapshot order)
		const sortedResults = allSightings.sort((a, b) => {
			if (b.data.date !== a.data.date) {
				return b.data.date.localeCompare(a.data.date);
			}
			return b.data.createdAt - a.data.createdAt;
		});

		// Take only the requested limit
		const slicedResults = sortedResults.slice(0, limitCount);

		const sightings = slicedResults.map((r) => r.data);
		const lastVisible =
			slicedResults.length > 0
				? slicedResults[slicedResults.length - 1].snapshot
				: null;

		return { sightings, lastVisible };
	} catch (error) {
		console.error("Error fetching group sightings:", error);
		throw error;
	}
};

export const getUserSightings = async (
	userId: string,
	startDate: string, // YYYY-MM-DD
	endDate: string, // YYYY-MM-DD
	limitCount = 20,
	lastSightingCursor?: QueryDocumentSnapshot,
	birdId?: string | null,
): Promise<{
	sightings: Sighting[];
	lastVisible: QueryDocumentSnapshot | null;
}> => {
	const sightingsRef = collection(db, "sightings");
	const constraints: QueryConstraint[] = [
		where("userId", "==", userId),
		where("date", ">=", startDate),
		where("date", "<=", endDate),
	];

	if (birdId) {
		constraints.push(where("birdId", "==", birdId));
	}

	constraints.push(orderBy("date", "desc"), orderBy("createdAt", "desc"));

	if (lastSightingCursor) {
		constraints.push(startAfter(lastSightingCursor));
	}

	// Apply limit last
	constraints.push(limit(limitCount));

	const q = query(sightingsRef, ...constraints);

	const snapshot = await getDocs(q);
	const sightings = snapshot.docs.map(
		(doc) => ({ id: doc.id, ...doc.data() }) as Sighting,
	);
	const lastVisible =
		snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

	return { sightings, lastVisible };
};

export const getSighting = async (
	sightingId: string,
): Promise<Sighting | null> => {
	const docRef = doc(db, "sightings", sightingId);
	const snapshot = await getDoc(docRef);

	if (snapshot.exists()) {
		return { id: snapshot.id, ...snapshot.data() } as Sighting;
	}
	return null;
};

export const getUserStats = async (
	userId: string,
): Promise<Record<string, string[]>> => {
	// Fetch all yearly stats documents for this user
	const q = query(
		collection(db, "user_yearly_stats"),
		where("userId", "==", userId),
	);
	const snapshot = await getDocs(q);

	let allStats: Record<string, string[]> = {};
	snapshot.forEach((doc) => {
		const data = doc.data();
		const yearStats = (data.stats || {}) as Record<string, string[]>;
		allStats = { ...allStats, ...yearStats };
	});

	return allStats;
};

export const recalculateUserStats = async (userId: string): Promise<void> => {
	// 1. Fetch all user sightings
	const q = query(collection(db, "sightings"), where("userId", "==", userId));
	const snapshot = await getDocs(q);
	const sightings = snapshot.docs.map((d) => d.data() as Sighting);

	// 2. Calculate stats grouped by year
	// Structure: { "2024": { "2024-01": [birds...] } }
	const statsByYear: Record<string, Record<string, string[]>> = {};

	for (const sighting of sightings) {
		const date = new Date(sighting.date);
		const year = date.getFullYear().toString();
		const yearMonth = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;

		if (!statsByYear[year]) {
			statsByYear[year] = {};
		}
		if (!statsByYear[year][yearMonth]) {
			statsByYear[year][yearMonth] = [];
		}

		if (!statsByYear[year][yearMonth].includes(sighting.birdId)) {
			statsByYear[year][yearMonth].push(sighting.birdId);
		}
	}

	// 3. Save to user_yearly_stats
	// We use a batch/transaction loop or individual sets.
	// Since this is a maintenance task, individual awaits are fine.
	for (const [year, stats] of Object.entries(statsByYear)) {
		const docRef = doc(db, "user_yearly_stats", `${userId}_${year}`);
		await import("firebase/firestore").then((fs) =>
			fs.setDoc(
				docRef,
				{
					userId,
					year: Number(year),
					stats,
				},
				{ merge: true },
			),
		);
	}
};

export const recalculateGroupStats = async (
	groupId: string,
	year?: number,
): Promise<void> => {
	const groupRef = doc(db, "groups", groupId);
	const groupDoc = await getDoc(groupRef);
	if (!groupDoc.exists()) return;

	const memberIds = groupDoc.data()?.memberIds || [];
	if (memberIds.length === 0) {
		if (year) {
			const docRef = doc(db, "group_yearly_stats", `${groupId}_${year}`);
			await import("firebase/firestore").then((fs) => fs.deleteDoc(docRef));
		}
		return;
	}

	let sightings: (Sighting & { id: string })[] = [];
	const batchSize = 10;
	for (let i = 0; i < memberIds.length; i += batchSize) {
		const batch = memberIds.slice(i, i + batchSize);
		if (batch.length === 0) continue;

		const constraints: QueryConstraint[] = [where("userId", "in", batch)];
		const q = query(collection(db, "sightings"), ...constraints);
		const snapshot = await getDocs(q);

		sightings = sightings.concat(
			snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
		);
	}

	// Sort chronologically ascending to find the literal "first" discovery
	sightings.sort((a, b) => {
		if (a.date !== b.date) return a.date.localeCompare(b.date);
		return a.createdAt - b.createdAt;
	});

	const statsByYear: Record<
		string,
		{ seenBirds: string[]; latestFirsts: any[] }
	> = {};
	if (year) {
		statsByYear[year.toString()] = { seenBirds: [], latestFirsts: [] };
	}

	for (const sighting of sightings) {
		const date = new Date(sighting.date);
		const sightingYear = date.getFullYear().toString();
		if (year && sightingYear !== year.toString()) continue;

		if (!statsByYear[sightingYear]) {
			statsByYear[sightingYear] = { seenBirds: [], latestFirsts: [] };
		}

		const stats = statsByYear[sightingYear];
		if (!stats.seenBirds.includes(sighting.birdId)) {
			stats.seenBirds.push(sighting.birdId);
			stats.latestFirsts.push({
				birdId: sighting.birdId,
				sightingId: sighting.id,
				userId: sighting.userId,
				date: sighting.date,
				createdAt: sighting.createdAt,
			});
		}
	}

	for (const [y, stats] of Object.entries(statsByYear)) {
		// Sort latestFirsts explicitly descending to show most recent firsts
		stats.latestFirsts.sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return b.createdAt - a.createdAt;
		});

		if (stats.latestFirsts.length > 5) {
			stats.latestFirsts = stats.latestFirsts.slice(0, 5);
		}

		const docRef = doc(db, "group_yearly_stats", `${groupId}_${y}`);
		await import("firebase/firestore").then((fs) =>
			fs.setDoc(
				docRef,
				{
					groupId,
					year: Number(y),
					seenBirds: stats.seenBirds,
					latestFirsts: stats.latestFirsts,
				},
				{ merge: false }, // We don't merge, we replace to ensure correctness
			),
		);
	}
};
