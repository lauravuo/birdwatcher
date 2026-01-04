import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock_key",
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock_domain",
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock_project_id",
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock_bucket",
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock_sender_id",
	appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock_app_id",
};

import { getFirestore } from "firebase/firestore";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
