import {
	collection,
	doc,
	getDocs,
	query,
	setDoc,
	where,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import type { Group } from "../../src/types";
import type { Sighting } from "../../src/types/sighting";

/**
 * Seed a user profile in Firestore
 */
export async function seedUserProfile(user: {
	id: string;
	displayName: string | null;
	email: string | null;
	photoURL: string | null;
}): Promise<void> {
	await setDoc(doc(db, "users", user.id), {
		id: user.id,
		displayName: user.displayName || "Anonymous",
		email: user.email || "",
		photoURL: user.photoURL || null,
		groupIds: [],
		createdAt: Date.now(),
	});
}

/**
 * Seed multiple sightings in Firestore
 */
export async function seedSightings(
	sightings: Omit<Sighting, "id">[],
): Promise<void> {
	await Promise.all(
		sightings.map(async (sighting) => {
			const ref = doc(collection(db, "sightings"));
			await setDoc(ref, { ...sighting, id: ref.id });
		}),
	);
}

/**
 * Seed a test group in Firestore
 */
export async function seedGroup(data: {
	name: string;
	joinCode: string;
	ownerId?: string;
	memberIds?: string[];
}): Promise<string> {
	// 1. Create Ref first to get ID
	const groupRef = doc(collection(db, "groups"));
	const groupId = groupRef.id;

	const group: Group = {
		id: groupId,
		name: data.name,
		joinCode: data.joinCode.toLowerCase().trim(),
		ownerId: data.ownerId || "test-user-123",
		memberIds: data.memberIds || ["test-user-123"],
		createdAt: Date.now(),
	};

	await setDoc(groupRef, group);
	return groupId;
}

/**
 * Clear all data from Firestore emulator using the REST API
 * This bypasses security rules and is much faster than manual deletion.
 */
export async function clearAllTestData(): Promise<void> {
	const projectId = "demo-test";
	const url = `http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`;

	try {
		await fetch(url, { method: "DELETE" });
	} catch (error) {
		console.warn(
			"Could not clear Firestore data (emulator may not be running):",
			error,
		);
	}
}

/**
 * Clear all groups - depreciated search for specialized clear
 */
export async function clearGroups(): Promise<void> {
	await clearAllTestData();
}

/**
 * Clear all users - depreciated search for specialized clear
 */
export async function clearUsers(): Promise<void> {
	await clearAllTestData();
}

/**
 * Get a group by join code
 */
export async function getGroupByCode(joinCode: string): Promise<Group | null> {
	const q = query(
		collection(db, "groups"),
		where("joinCode", "==", joinCode.toLowerCase().trim()),
	);
	const snapshot = await getDocs(q);

	if (snapshot.empty) return null;

	const doc = snapshot.docs[0];
	return {
		id: doc.id,
		...(doc.data() as Omit<Group, "id">),
	} as Group;
}
/**
 * Seed user statistics in Firestore
 */
export async function seedUserStats(
	userId: string,
	stats: Record<string, string[]>,
): Promise<void> {
	// Group stats by year
	const statsByYear: Record<string, Record<string, string[]>> = {};

	for (const [key, value] of Object.entries(stats)) {
		const year = key.split("-")[0];
		if (!statsByYear[year]) {
			statsByYear[year] = {};
		}
		statsByYear[year][key] = value;
	}

	// Write value to user_yearly_stats collection
	await Promise.all(
		Object.entries(statsByYear).map(async ([year, yearStats]) => {
			await setDoc(
				doc(db, "user_yearly_stats", `${userId}_${year}`),
				{
					userId,
					year: Number(year),
					stats: yearStats,
				},
				{ merge: true },
			);
		}),
	);
}

/**
 * Seed a single sighting in Firestore
 */
export async function seedSighting(
	sighting: Omit<Sighting, "id">,
): Promise<void> {
	await seedSightings([sighting]);
}
