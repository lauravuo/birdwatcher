import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	updateProfile,
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";

/**
 * Create a test user in the Auth Emulator
 */
export async function createTestUser(
	email: string,
	password: string,
	displayName?: string,
) {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password,
		);
		// Set displayName and photoURL (using initials as avatar)
		const name = displayName || email.split("@")[0];
		const initials = name
			.split(" ")
			.map((word) => word[0])
			.join("")
			.toUpperCase();
		const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`;

		await updateProfile(userCredential.user, {
			displayName: displayName || name,
			photoURL,
		});

		return userCredential.user;
	} catch (error) {
		// User might already exist, try signing in
		if ((error as { code?: string }).code === "auth/email-already-in-use") {
			return await signInTestUser(email, password);
		}
		throw error;
	}
}

/**
 * Sign in an existing test user
 */
export async function signInTestUser(email: string, password: string) {
	const userCredential = await signInWithEmailAndPassword(
		auth,
		email,
		password,
	);
	return userCredential.user;
}

/**
 * Sign out the current user
 */
export async function signOutTestUser() {
	await signOut(auth);
}

/**
 * Get a consistent test user for E2E tests
 */
export function getTestUserCredentials() {
	return {
		email: "test@birdwatcher.test",
		password: "testpassword123",
		displayName: "Test User",
	};
}
