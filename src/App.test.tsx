import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import i18n from "./i18n";

// Mock firebase
vi.mock("firebase/auth", async () => ({
	getAuth: vi.fn(),
	onAuthStateChanged: vi.fn((_auth, callback) => {
		callback(null); // No user
		return () => {};
	}),
	GoogleAuthProvider: vi.fn(),
}));

vi.mock("./lib/firebase", () => ({
	auth: {},
	googleProvider: {},
	db: {},
}));

describe("App", () => {
	it("renders headline", async () => {
		// Ensure i18n is initialized
		if (!i18n.isInitialized) {
			await i18n.init();
		}

		render(<App />);
		await waitFor(() => {
			const headline = screen.getByText(/Birdwatcher/i);
			expect(headline).toBeInTheDocument();
		});
	});
});
