import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

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
}));

describe("App", () => {
	it("renders headline", async () => {
		render(<App />);
		await waitFor(() => {
			const headline = screen.getByText(/Birdwatcher/i);
			expect(headline).toBeInTheDocument();
		});
	});
});
