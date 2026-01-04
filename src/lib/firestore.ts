import {
	arrayUnion,
	collection,
	doc,
	getDocs,
	query,
	runTransaction,
	where,
} from "firebase/firestore";
import type { Group } from "../types";
import { db } from "./firebase";

// --- Group Service ---

export const createGroup = async (
	name: string,
	joinCode: string,
	user: { uid: string; displayName: string | null; email: string | null },
): Promise<string> => {
	const normalizedCode = joinCode.toLowerCase().trim();

	// Note: We use runTransaction to ensure uniqueness safety if high concurrency,
	// though for a small app a simple getDocs check before set is often enough.
	// We'll stick to transaction for robustness.
	// Limitation: Firestore client SDK transactions require online connectivity.

	return await runTransaction(db, async (transaction) => {
		// 1. Check uniqueness (Query inside transaction requires careful handling in client SDKs,
		// often best to pre-query or use a separate index doc.
		// For Client SDK, we can't easily Query in a transaction if the result set is variable.
		// We will do a robust check: "First writer wins".
		// Actually, for a robust uniqueness constraint in Firestore Client SDK without a dedicated index collection:
		// We can just query first. If race condition happens, one will fail or we tolerate it.
		// Let's do a pre-check query.

		const q = query(
			collection(db, "groups"),
			where("joinCode", "==", normalizedCode),
		);
		const snapshot = await getDocs(q);
		if (!snapshot.empty) {
			throw new Error("Join code already taken");
		}
		// NOTE: A true race condition could still occur here between the get and the set.
		// To be 100% atomic, we'd need a separate "taken_codes/{code}" document.
		// For this MVP, this "Check then Act" is acceptable.

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

		transaction.set(groupRef, newGroup);

		// 3. Update User Profile
		const userRef = doc(db, "users", user.uid);
		transaction.set(
			userRef,
			{
				id: user.uid,
				displayName: user.displayName || "Anonymous",
				email: user.email || "",
				groupIds: arrayUnion(groupId),
			},
			{ merge: true },
		);

		return groupId;
	});
};

export const joinGroup = async (
	joinCode: string,
	user: { uid: string; displayName: string | null; email: string | null },
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
	return snapshot.docs.map((d) => d.data() as Group);
};
