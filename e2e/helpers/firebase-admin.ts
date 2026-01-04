import { initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

/**
 * Get or initialize Firebase Admin SDK for E2E tests
 * Connects to emulator automatically
 */
function getAdminApp() {
	if (!adminApp) {
		// Initialize without credentials for emulator
		process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
		process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

		adminApp = initializeApp({
			projectId: "demo-project",
		});
	}
	return adminApp;
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
