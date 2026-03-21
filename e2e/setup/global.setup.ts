import { clearAllTestData } from "../helpers/firestore-helpers";

async function globalSetup() {
	console.log("Global Setup: Clearing all test data in Firestore emulator...");
	await clearAllTestData();
	console.log("Global Setup: Database cleared successfully.");
}

export default globalSetup;
