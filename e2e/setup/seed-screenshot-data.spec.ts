import { test as setup } from "@playwright/test";
import { createTestUser, signInTestUser } from "../helpers/auth-helpers";
import {
	seedGroup,
	seedSightings,
	seedUserProfile,
	seedUserStats,
} from "../helpers/firestore-helpers";

const GROUP_NAME = "Bird Watchers Helsinki";
const JOIN_CODE = "hki-birds";
const OWNER_EMAIL = "owner@example.com";
const PASSWORD = "password123";

const MEMBERS = [
	{ name: "Antti Virtanen", email: "antti@example.com" },
	{ name: "Sari Korhonen", email: "sari@example.com" },
	{ name: "Matti Meikäläinen", email: "matti@example.com" },
	{ name: "Pekka Pouta", email: "pekka@example.com" },
	{ name: "Kaisa Kettunen", email: "kaisa@example.com" },
];

const BIRDS = [
	{ bird: "talitiainen", birdName: "Talitiainen" },
	{ bird: "sinitiainen", birdName: "Sinitiainen" },
	{ bird: "mustarastas", birdName: "Mustarastas" },
	{ bird: "harakka", birdName: "Harakka" },
	{ bird: "naakka", birdName: "Naakka" },
	{ bird: "varpunen", birdName: "Varpunen" },
	{ bird: "kesykyyhky", birdName: "Kesykyyhky" },
];

// Helper to generate sightings for a user
const generateSightingsForUser = (
	userId: string,
	displayName: string,
	groupId: string,
) => {
	const sightings = [];
	const now = new Date();

	// Last 2 months
	for (let i = 0; i < 2; i++) {
		const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
		for (let j = 0; j < 5; j++) {
			// Random day in the month
			const day = Math.floor(Math.random() * 28) + 1;
			const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
			const dateStr = date.toISOString().split("T")[0];
			const bird = BIRDS[Math.floor(Math.random() * BIRDS.length)];

			sightings.push({
				birdId: bird.bird,
				birdName: bird.birdName,
				date: dateStr,
				time: "12:00",
				groupId: groupId,
				userId: userId,
				userName: displayName,
				type: "visual",
				locationName: "Helsinki",
				notes: "Seeded for screenshots",
				createdAt: date.getTime(),
				// biome-ignore lint/suspicious/noExplicitAny: seeded dataset without pre-existing IDs
			} as any);
		}
	}
	return sightings;
};

setup("seed screenshot data", async () => {
	console.log("🌱 Starting data seeding...");

	// Refined Flow:
	// 1. Create Owner (Owner signed in).
	// 2. Create Members (each signs in -> store ID -> sign out/next signs in).
	// 3. Sign in Owner.
	// 4. Create Group with ALL IDs.
	// 5. Seed Owner Sightings.
	// 6. Loop Members -> Sign in -> Seed Sightings.

	// 1. Owner
	console.log(`Creating owner: ${OWNER_EMAIL}`);
	const ownerUser = await createTestUser(OWNER_EMAIL, PASSWORD, "Test Owner");
	await seedUserProfile({
		id: ownerUser.uid,
		displayName: "Test Owner",
		email: OWNER_EMAIL,
		photoURL: null,
	});
	const userIds = [ownerUser.uid];
	const usersList = []; // store for step 6

	// 2. Members
	for (const member of MEMBERS) {
		console.log(`Creating member: ${member.email}`);
		const user = await createTestUser(member.email, PASSWORD, member.name);
		await seedUserProfile({
			id: user.uid,
			displayName: member.name,
			email: member.email,
			photoURL: null,
		});
		userIds.push(user.uid);
		usersList.push({ uid: user.uid, ...member });
	}

	// 3. Sign in Owner
	console.log(`Signing in owner to create group...`);
	await signInTestUser(OWNER_EMAIL, PASSWORD);

	// 4. Create Group
	console.log(`Creating group: ${GROUP_NAME}`);
	const finalGroupId = await seedGroup({
		name: GROUP_NAME,
		joinCode: JOIN_CODE,
		ownerId: ownerUser.uid,
		memberIds: userIds,
	});
	console.log(`Created Group: ${finalGroupId}`);

	// 5. Owner Sightings
	console.log(`Seeding sightings for owner...`);
	const ownerSightings = generateSightingsForUser(
		ownerUser.uid,
		"Test Owner",
		finalGroupId,
	);
	await seedSightings(ownerSightings);

	// Calculate and seed stats for owner
	const ownerStats: Record<string, string[]> = {};
	for (const sighting of ownerSightings) {
		const date = new Date(sighting.date);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		if (!ownerStats[monthKey]) {
			ownerStats[monthKey] = [];
		}
		ownerStats[monthKey].push(sighting.birdId);
	}
	await seedUserStats(ownerUser.uid, ownerStats);

	// 6. Member Sightings
	for (const user of usersList) {
		console.log(`Seeding sightings for ${user.name}...`);
		await signInTestUser(user.email, PASSWORD);
		const userSightings = generateSightingsForUser(
			user.uid,
			user.name,
			finalGroupId,
		);
		await seedSightings(userSightings);

		// Calculate and seed stats for member
		const userStats: Record<string, string[]> = {};
		for (const sighting of userSightings) {
			const date = new Date(sighting.date);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			if (!userStats[monthKey]) {
				userStats[monthKey] = [];
			}
			userStats[monthKey].push(sighting.birdId);
		}
		await seedUserStats(user.uid, userStats);
	}

	console.log("\n✅ Seeding complete!");
	console.log("------------------------------------------------");
	console.log(`👤 User: ${OWNER_EMAIL}`);
	console.log(`🔑 Password: ${PASSWORD}`);
	console.log(`👥 Group: ${GROUP_NAME} (Code: ${JOIN_CODE})`);
	console.log("------------------------------------------------");
});
