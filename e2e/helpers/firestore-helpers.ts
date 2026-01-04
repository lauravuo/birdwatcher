import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    where,
} from "firebase/firestore";
import { db } from "../../src/lib/firebase";
import type { Group } from "../../src/types";

/**
 * Seed a test group in Firestore
 */
export async function seedGroup(data: {
    name: string;
    joinCode: string;
    ownerId?: string;
    memberIds?: string[];
}): Promise<string> {
    const group: Omit<Group, "id"> = {
        name: data.name,
        joinCode: data.joinCode.toLowerCase().trim(),
        ownerId: data.ownerId || "test-user-123",
        memberIds: data.memberIds || ["test-user-123"],
        createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, "groups"), group);
    return docRef.id;
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
        console.error("Failed to clear Firestore data via REST API:", error);
        // Fallback or throw
        throw error;
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

    const data = snapshot.docs[0].data();
    return {
        id: snapshot.docs[0].id,
        ...data,
    } as Group;
}
