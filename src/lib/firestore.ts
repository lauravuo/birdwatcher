import {
	arrayUnion,
	collection,
	doc,
	getDocs,
	query,
	runTransaction,
	where,
} from "firebase/firestore";
import type { Group, UserProfile } from "../types";
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
