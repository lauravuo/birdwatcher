import { initializeApp } from "firebase/app";
import {
	GoogleAuthProvider,
	getAuth,
	signInWithEmailAndPassword,
} from "firebase/auth";

const getEnvVar = (key: string, defaultValue = ""): string => {
	// 1. Try Vite's import.meta.env
	// @ts-expect-error
	if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
		// @ts-expect-error
		return import.meta.env[key];
	}
	// 2. Try Node's process.env (for tests)
	// @ts-expect-error
	if (typeof process !== "undefined" && process.env?.[key]) {
		// @ts-expect-error
		return process.env[key] as string;
	}
	return defaultValue;
};

const firebaseConfig = {
	apiKey: getEnvVar("VITE_FIREBASE_API_KEY", "mock_key"),
	authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN", "mock_domain"),
	projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID", "mock_project_id"),
	storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET", "mock_bucket"),
	messagingSenderId: getEnvVar(
		"VITE_FIREBASE_MESSAGING_SENDER_ID",
		"mock_sender_id",
	),
	appId: getEnvVar("VITE_FIREBASE_APP_ID", "mock_app_id"),
};

import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Connect to emulators if in test mode
if (getEnvVar("VITE_USE_EMULATOR") === "true") {
	connectAuthEmulator(auth, "http://localhost:9099", {
		disableWarnings: true,
	});
	connectFirestoreEmulator(db, "localhost", 8080);
	console.log(
		`🔧 Connected to Firebase Emulators at localhost (Project: ${firebaseConfig.projectId})`,
	);

	// Expose for E2E testing
	if (typeof window !== "undefined") {
		// @ts-expect-error
		window.auth = auth;
		// @ts-expect-error
		window.db = db;
		// @ts-expect-error
		window.signInWithEmail = signInWithEmailAndPassword;
	}
}
