import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { auth } from "../../src/lib/firebase";

/**
 * Create a test user in the Auth Emulator
 */
export async function createTestUser(
    email: string,
    password: string,
    _displayName?: string,
) {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
        );
        // Note: displayName would need to be set via updateProfile if needed
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
