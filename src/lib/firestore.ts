import {
	addDoc,
	arrayUnion,
	collection,
	doc,
	getDocs,
	query,
	runTransaction,
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

	const docRef = await addDoc(collection(db, "sightings"), {
		...cleanSighting,
		createdAt: Date.now(),
	});
	return docRef.id;
}

// --- Sighting Service ---

export const getGroupSightings = async (
	memberIds: string[],
): Promise<Sighting[]> => {
	if (memberIds.length === 0) return [];

	// Firestore "in" query has a limit of 10 items
	// If we have more than 10 members, we need to batch the queries
	const batchSize = 10;
	const allSightings: Sighting[] = [];

	try {
		for (let i = 0; i < memberIds.length; i += batchSize) {
			const batch = memberIds.slice(i, i + batchSize);
			if (batch.length === 0) continue;

			const q = query(
				collection(db, "sightings"),
				where("userId", "in", batch),
			);
			const snapshot = await getDocs(q);
			const batchSightings = snapshot.docs.map((d) => ({
				id: d.id,
				...(d.data() as Omit<Sighting, "id">),
			})) as Sighting[];
			allSightings.push(...batchSightings);
		}

		// Sort all sightings by createdAt descending (most recent first)
		return allSightings.sort((a, b) => b.createdAt - a.createdAt);
	} catch (error) {
		console.error("Error fetching group sightings:", error);
		throw error;
	}
};
