import {
	arrayUnion,
	collection,
	doc,
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

	// Create sighting and update stats atomically using a transaction or batched write could be better,
	// but addDoc doesn't support transaction easily without generating ID first.
	// For simplicity and to match current pattern, we'll do them in parallel or sequence.
	// Actually, strict atomicity is best. Let's use runTransaction if possible, but addDoc is convenient.
	// Given the previous code used addDoc, let's stick to it for the sighting, and then update stats.
	// Or better: Use batch/transaction to ensure consistency.

	// Let's use a batch to ensure both happen or neither (if possible, but addDoc generates ID).
	// We'll generate ID first.
	const sightingRef = doc(collection(db, "sightings"));

	const statsDate = new Date(sighting.date);
	const yearMonth = `${statsDate.getFullYear()}-${String(statsDate.getMonth() + 1).padStart(2, "0")}`;

	await runTransaction(db, async (transaction) => {
		transaction.set(sightingRef, sightingData);

		const statsRef = doc(db, "user_stats", sighting.userId);
		// Check if doc exists is checking efficiently done via set with merge?
		// We want to arrayUnion.
		// note: set with merge: true will create if not exists.
		transaction.set(
			statsRef,
			{
				stats: {
					[yearMonth]: arrayUnion(sighting.birdId),
				},
			},
			{ merge: true },
		);
	});

	return sightingRef.id;
}

// --- Sighting Service ---

export const getGroupSightings = async (
	memberIds: string[],
	limitCount = 20,
	lastSightingCursor?: QueryDocumentSnapshot,
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
				orderBy("date", "desc"),
				orderBy("createdAt", "desc"),
				limit(limitCount),
			];

			if (lastSightingCursor) {
				constraints.push(startAfter(lastSightingCursor));
			}

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
): Promise<{
	sightings: Sighting[];
	lastVisible: QueryDocumentSnapshot | null;
}> => {
	const sightingsRef = collection(db, "sightings");
	const constraints: QueryConstraint[] = [
		where("userId", "==", userId),
		where("date", ">=", startDate),
		where("date", "<=", endDate),
		orderBy("date", "desc"),
		orderBy("createdAt", "desc"),
		limit(limitCount),
	];

	if (lastSightingCursor) {
		constraints.push(startAfter(lastSightingCursor));
	}

	const q = query(sightingsRef, ...constraints);

	const snapshot = await getDocs(q);
	const sightings = snapshot.docs.map(
		(doc) => ({ id: doc.id, ...doc.data() }) as Sighting,
	);
	const lastVisible =
		snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

	return { sightings, lastVisible };
};

export const getUserStats = async (
	userId: string,
): Promise<Record<string, string[]>> => {
	const docRef = doc(db, "user_stats", userId);
	const snapshot = await import("firebase/firestore").then((fs) =>
		fs.getDoc(docRef),
	);

	if (snapshot.exists()) {
		return snapshot.data().stats || {};
	}
	return {};
};

export const recalculateUserStats = async (userId: string): Promise<void> => {
	// 1. Fetch all user sightings
	const q = query(collection(db, "sightings"), where("userId", "==", userId));
	const snapshot = await getDocs(q);
	const sightings = snapshot.docs.map((d) => d.data() as Sighting);

	// 2. Calculate stats
	const stats: Record<string, string[]> = {};

	for (const sighting of sightings) {
		const date = new Date(sighting.date);
		const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

		if (!stats[yearMonth]) {
			stats[yearMonth] = [];
		}

		if (!stats[yearMonth].includes(sighting.birdId)) {
			stats[yearMonth].push(sighting.birdId);
		}
	}

	// 3. Save to user_stats
	const statsRef = doc(db, "user_stats", userId);
	await import("firebase/firestore").then((fs) =>
		fs.setDoc(statsRef, { stats }),
	);
};
