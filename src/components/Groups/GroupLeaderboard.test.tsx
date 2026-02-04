import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Group, UserProfile } from "../../types";
import { GroupLeaderboard } from "./GroupLeaderboard";

// Mock the useLeaderboardStats hook
vi.mock("../../hooks/useLeaderboardStats", () => ({
	useLeaderboardStats: (
		_group: Group,
		_members: UserProfile[],
		_statsMap: Map<string, Record<string, string[]>>,
	) => ({
		yearPointsLeaders: [
			{
				user: {
					id: "user1",
					displayName: "Alice",
					email: "alice@test.com",
					photoURL: "",
					groupIds: ["group1"],
				},
				value: 10,
				rank: 1,
			},
		],
		yearUniqueLeaders: [
			{
				user: {
					id: "user1",
					displayName: "Alice",
					email: "alice@test.com",
					photoURL: "",
					groupIds: ["group1"],
				},
				value: 25,
				rank: 1,
			},
		],
		monthlySections: [
			{
				title: "February",
				entries: [
					{
						user: {
							id: "user1",
							displayName: "Alice",
							email: "alice@test.com",
							photoURL: "",
							groupIds: ["group1"],
						},
						value: 15,
						rank: 1,
					},
				],
			},
			{
				title: "January",
				entries: [
					{
						user: {
							id: "user2",
							displayName: "Bob",
							email: "bob@test.com",
							photoURL: "",
							groupIds: ["group1"],
						},
						value: 10,
						rank: 1,
					},
				],
			},
		],
		currentYear: 2026,
		groupTotalCount: 50,
	}),
}));

describe("GroupLeaderboard", () => {
	const mockGroup: Group = {
		id: "group1",
		name: "Test Group",
		ownerId: "owner1",
		memberIds: ["user1", "user2"],
		joinCode: "test-code",
		createdAt: 0,
	};

	const mockMembers: UserProfile[] = [
		{
			id: "user1",
			displayName: "Alice",
			email: "alice@test.com",
			photoURL: "",
			groupIds: ["group1"],
		},
		{
			id: "user2",
			displayName: "Bob",
			email: "bob@test.com",
			photoURL: "",
			groupIds: ["group1"],
		},
	];

	const mockStats = new Map<string, Record<string, string[]>>();

	const renderComponent = () => {
		return render(
			<MemoryRouter>
				<GroupLeaderboard
					group={mockGroup}
					members={mockMembers}
					userStats={mockStats}
				/>
			</MemoryRouter>,
		);
	};

	it("renders current month section by default", () => {
		renderComponent();

		// Current month (February) should be visible
		expect(
			screen.getByText(/Top Birdwatchers \(February\)/i),
		).toBeInTheDocument();
		// Alice appears in multiple sections, so we just verify the section exists
		const aliceElements = screen.getAllByText("Alice");
		expect(aliceElements.length).toBeGreaterThan(0);
	});

	it("hides past months by default", () => {
		renderComponent();

		// Past month (January) should not be visible
		expect(
			screen.queryByText(/Top Birdwatchers \(January\)/i),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Bob")).not.toBeInTheDocument();
	});

	it("shows expander button when there are multiple months", () => {
		renderComponent();

		// Expander button should be present
		const expanderButton = screen.getByTestId("toggle-past-months");
		expect(expanderButton).toBeInTheDocument();
		expect(expanderButton).toHaveTextContent("Show Past Months");
	});

	it("shows past months when expander is clicked", async () => {
		renderComponent();

		// Initially, past month should not be visible
		expect(
			screen.queryByText(/Top Birdwatchers \(January\)/i),
		).not.toBeInTheDocument();

		// Click the expander button
		const expanderButton = screen.getByTestId("toggle-past-months");
		fireEvent.click(expanderButton);

		// Past month should now be visible
		await waitFor(() => {
			expect(
				screen.getByText(/Top Birdwatchers \(January\)/i),
			).toBeInTheDocument();
			expect(screen.getByText("Bob")).toBeInTheDocument();
		});

		// Button text should change
		expect(expanderButton).toHaveTextContent("Hide Past Months");
	});

	it("hides past months when expander is clicked again", async () => {
		renderComponent();

		// Click to expand
		const expanderButton = screen.getByTestId("toggle-past-months");
		fireEvent.click(expanderButton);

		// Verify past month is visible
		await waitFor(() => {
			expect(
				screen.getByText(/Top Birdwatchers \(January\)/i),
			).toBeInTheDocument();
		});

		// Click to collapse
		fireEvent.click(expanderButton);

		// Past month should be hidden again
		await waitFor(() => {
			expect(
				screen.queryByText(/Top Birdwatchers \(January\)/i),
			).not.toBeInTheDocument();
		});

		// Button text should change back
		expect(expanderButton).toHaveTextContent("Show Past Months");
	});

	it("renders year points and unique leaders sections", () => {
		renderComponent();

		// Year sections should be visible
		expect(screen.getByText(/Points Leaders \(2026\)/i)).toBeInTheDocument();
		expect(screen.getByText(/Top Birdwatchers \(2026\)/i)).toBeInTheDocument();
	});

	it("renders group total section", () => {
		renderComponent();

		// Group total should be visible
		expect(screen.getByText(/Group Total \(2026\)/i)).toBeInTheDocument();
		expect(screen.getByText("Test Group")).toBeInTheDocument();
	});
});
