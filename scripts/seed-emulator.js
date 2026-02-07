#!/usr/bin/env node

/**
 * Seed script for Firebase Emulator
 * This script populates the emulator with test data for development and screenshots
 */

import { initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	createUserWithEmailAndPassword,
	getAuth,
	signInWithEmailAndPassword,
} from "firebase/auth";
import {
	connectFirestoreEmulator,
	doc,
	getFirestore,
	serverTimestamp,
	setDoc,
} from "firebase/firestore";

// Initialize Firebase with emulator config
const firebaseConfig = {
	apiKey: "demo-key",
	authDomain: "demo-test.firebaseapp.com",
	projectId: "demo-test",
	storageBucket: "demo-test.appspot.com",
	messagingSenderId: "123456789",
	appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators
connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "localhost", 8080);

console.log("🔧 Connected to Firebase Emulators");

// Helper function to create user and profile
async function createUser(email, password, displayName, photoURL = "") {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password,
		);
		const user = userCredential.user;

		// Create user profile in Firestore
		await setDoc(doc(db, "users", user.uid), {
			id: user.uid,
			email: email,
			displayName: displayName,
			photoURL: photoURL,
			createdAt: serverTimestamp(),
		});

		console.log(`✓ Created user: ${displayName} (${email})`);
		return user.uid;
	} catch (error) {
		if (error.code === "auth/email-already-in-use") {
			// User already exists, sign in instead
			const userCredential = await signInWithEmailAndPassword(
				auth,
				email,
				password,
			);
			console.log(`ℹ User already exists: ${displayName} (${email})`);
			return userCredential.user.uid;
		}
		throw error;
	}
}

// Helper function to create user stats
async function createUserStats(userId, year, monthlyData) {
	await setDoc(doc(db, "stats", userId), {
		[year]: monthlyData,
	});
	console.log(`  ✓ Created stats for user ${userId}`);
}

// Helper function to create a group
async function createGroup(groupId, name, joinCode, ownerId, memberIds) {
	await setDoc(doc(db, "groups", groupId), {
		id: groupId,
		name: name,
		joinCode: joinCode,
		ownerId: ownerId,
		memberIds: memberIds,
		createdAt: serverTimestamp(),
	});
	console.log(`✓ Created group: ${name} (${joinCode})`);
	return groupId;
}

// Main seeding function
async function seedData() {
	console.log("\n🌱 Starting data seeding...\n");

	const currentYear = new Date().getFullYear();
	const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
	const previousMonth = String(new Date().getMonth()).padStart(2, "0");

	// Create test users
	console.log("Creating users...");
	const aliceId = await createUser(
		"alice@example.com",
		"password123",
		"Alice Anderson",
		"https://i.pravatar.cc/150?img=1",
	);

	const bobId = await createUser(
		"bob@example.com",
		"password123",
		"Bob Brown",
		"https://i.pravatar.cc/150?img=2",
	);

	const charlieId = await createUser(
		"charlie@example.com",
		"password123",
		"Charlie Chen",
		"https://i.pravatar.cc/150?img=3",
	);

	const davidId = await createUser(
		"david@example.com",
		"password123",
		"David Davis",
		"https://i.pravatar.cc/150?img=4",
	);

	const eveId = await createUser(
		"eve@example.com",
		"password123",
		"Eve Evans",
		"https://i.pravatar.cc/150?img=5",
	);

	// Create stats for current month (varied counts to test sorting)
	console.log("\nCreating user stats...");
	await createUserStats(aliceId, currentYear, {
		[`${currentYear}-${currentMonth}`]: [
			"bird1",
			"bird2",
			"bird3",
			"bird4",
			"bird5",
		], // 5 birds
		[`${currentYear}-${previousMonth}`]: ["bird6", "bird7"], // 2 birds in previous month
	});

	await createUserStats(bobId, currentYear, {
		[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3", "bird4"], // 4 birds (tied for 2nd if we had ranking)
		[`${currentYear}-${previousMonth}`]: ["bird6", "bird7", "bird8", "bird9"], // 4 birds in previous month
	});

	await createUserStats(charlieId, currentYear, {
		[`${currentYear}-${currentMonth}`]: ["bird1", "bird2", "bird3", "bird4"], // 4 birds (tied with Bob)
		[`${currentYear}-${previousMonth}`]: ["bird6"], // 1 bird in previous month
	});

	await createUserStats(davidId, currentYear, {
		[`${currentYear}-${currentMonth}`]: ["bird1", "bird2"], // 2 birds
		[`${currentYear}-${previousMonth}`]: ["bird10", "bird11", "bird12"], // 3 birds in previous month
	});

	await createUserStats(eveId, currentYear, {
		[`${currentYear}-${currentMonth}`]: ["bird1"], // 1 bird
		// No data in previous month (to test empty state when switching months)
	});

	// Create a group with all members
	console.log("\nCreating group...");
	await createGroup(
		"demo-group-1",
		"Birdwatchers United",
		"DEMO2024",
		aliceId,
		[aliceId, bobId, charlieId, davidId, eveId],
	);

	console.log("\n✅ Data seeding completed!\n");
	console.log("Test user credentials:");
	console.log("  alice@example.com / password123");
	console.log("  bob@example.com / password123");
	console.log("  charlie@example.com / password123");
	console.log("  david@example.com / password123");
	console.log("  eve@example.com / password123");
	console.log("\nGroup join code: DEMO2024\n");

	process.exit(0);
}

// Run the seeding
seedData().catch((error) => {
	console.error("❌ Error seeding data:", error);
	process.exit(1);
});
