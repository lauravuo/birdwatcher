import { render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
// Mock firebase inputs
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("firebase/auth", async () => ({
	getAuth: vi.fn(),
	GoogleAuthProvider: vi.fn(),
	signInWithPopup: vi.fn(),
	signOut: vi.fn(),
	onAuthStateChanged: vi.fn(),
}));

vi.mock("../lib/firebase", () => ({
	auth: {},
	googleProvider: {},
}));

const TestComponent = () => {
	const { currentUser, login, logout, loading } = useAuth();
	if (loading) return <div>Loading...</div>;
	return (
		<div>
			<div data-testid="user">
				{currentUser ? currentUser.displayName : "No User"}
			</div>
			<button type="button" onClick={login}>
				Login
			</button>
			<button type="button" onClick={logout}>
				Logout
			</button>
		</div>
	);
};

describe("AuthContext", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("renders children when loading is done (no user)", async () => {
		// Mock onAuthStateChanged to return null immediately
		vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
			(callback as (user: User | null) => void)(null);
			return () => {};
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("user")).toHaveTextContent("No User");
		});
	});

	it("sets user when onAuthStateChanged triggers with user", async () => {
		const mockUser = { displayName: "Test User" } as User;
		vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
			(callback as (user: User | null) => void)(mockUser);
			return () => {};
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("user")).toHaveTextContent("Test User");
		});
	});

	it.skip("calls signInWithPopup on login", async () => {
		vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
			(callback as (user: User | null) => void)(null);
			return () => {};
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText("Login")).toBeInTheDocument());
		screen.getByText("Login").click();

		expect(signInWithPopup).toHaveBeenCalled();
	});

	it.skip("calls signOut on logout", async () => {
		const mockUser = { displayName: "User" } as User;
		vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
			(callback as (user: User | null) => void)(mockUser);
			return () => {};
		});

		render(
			<AuthProvider>
				<TestComponent />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText("Logout")).toBeInTheDocument());
		screen.getByText("Logout").click();

		expect(signOut).toHaveBeenCalled();
	});
});
