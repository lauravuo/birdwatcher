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

	it("renders current month in dropdown by default", () => {
		renderComponent();

		// Month selector should be visible
		const monthSelector = screen.getByTestId("month-selector");
		expect(monthSelector).toBeInTheDocument();

		// Current month (February, index 0) should be selected
		expect(monthSelector).toHaveValue("0");

		// Current month section should be visible
		expect(
			screen.getByText(/Top Birdwatchers \(February\)/i),
		).toBeInTheDocument();
	});

	it("displays dropdown with all available months", () => {
		renderComponent();

		const monthSelector = screen.getByTestId("month-selector");
		const options = monthSelector.querySelectorAll("option");

		// Should have 2 months (February and January)
		expect(options).toHaveLength(2);
		expect(options[0]).toHaveTextContent("February");
		expect(options[1]).toHaveTextContent("January");
	});

	it("changes displayed month when dropdown selection changes", async () => {
		renderComponent();

		const monthSelector = screen.getByTestId(
			"month-selector",
		) as HTMLSelectElement;

		// Initially showing February
		expect(
			screen.getByText(/Top Birdwatchers \(February\)/i),
		).toBeInTheDocument();
		expect(screen.queryByText(/Top Birdwatchers \(January\)/i)).toBeNull();

		// Change to January
		fireEvent.change(monthSelector, { target: { value: "1" } });

		// Should now show January
		await waitFor(() => {
			expect(
				screen.getByText(/Top Birdwatchers \(January\)/i),
			).toBeInTheDocument();
		});

		// February should not be in the title anymore (but might be in dropdown)
		const februaryTitles = screen.queryAllByText(
			/Top Birdwatchers \(February\)/i,
		);
		expect(februaryTitles).toHaveLength(0);
	});

	it("shows all members in standings", () => {
		renderComponent();

		// Both Alice and Bob should appear somewhere (in year or month sections)
		// Note: Bob only appears in January data, so need to check dropdown options
		const monthSelector = screen.getByTestId(
			"month-selector",
		) as HTMLSelectElement;

		// Change to January to see Bob
		fireEvent.change(monthSelector, { target: { value: "1" } });

		// Now Bob should be visible
		expect(screen.getByText("Bob")).toBeInTheDocument();
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
