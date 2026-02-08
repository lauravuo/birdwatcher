import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Group, UserProfile } from "../types";

export interface LeaderboardEntry {
	user: UserProfile;
	value: number;
	rank: number;
}

export interface LeaderboardSection {
	title: string;
	entries: LeaderboardEntry[];
}

export function useLeaderboardStats(
	group: Group,
	members: UserProfile[],
	statsMap: Map<string, Record<string, string[]>>,
	selectedMonth?: string, // Optional month filter in format "YYYY-MM"
) {
	const { i18n } = useTranslation();
	const [yearPointsLeaders, setYearPointsLeaders] = useState<
		LeaderboardEntry[]
	>([]);
	const [yearUniqueLeaders, setYearUniqueLeaders] = useState<
		LeaderboardEntry[]
	>([]);
	const [monthlySections, setMonthlySections] = useState<LeaderboardSection[]>(
		[],
	);
	const [groupTotalCount, setGroupTotalCount] = useState<number>(0);

	const currentYear = new Date().getFullYear();

	useEffect(() => {
		const yearlyPointsTracker = new Map<string, number>(); // UserID -> Points
		const yearUniqueMap = new Map<string, Set<string>>(); // UserID -> Set of Bird IDs
		const groupUniqueSet = new Set<string>(); // Set of all unique Bird IDs in group
		const monthlyUniqueMap = new Map<string, Map<string, Set<string>>>(); // MonthKey -> UserID -> Set

		// Initialize maps
		group.memberIds.forEach((uid) => {
			yearlyPointsTracker.set(uid, 0);
			yearUniqueMap.set(uid, new Set());
		});

		// Initialize months (Year Start -> Current Month)
		const currentMonthIndex = new Date().getMonth();
		const months: string[] = [];
		for (let m = currentMonthIndex; m >= 0; m--) {
			const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
			months.push(monthKey);
			monthlyUniqueMap.set(monthKey, new Map());
			group.memberIds.forEach((uid) => {
				monthlyUniqueMap.get(monthKey)?.set(uid, new Set());
			});
		}

		// Process Stats
		members.forEach((member) => {
			const userStats = statsMap.get(member.id);
			if (!userStats) return;

			Object.entries(userStats).forEach(([dateKey, birdIds]) => {
				if (!dateKey.startsWith(`${currentYear}-`)) return;

				const yearSet = yearUniqueMap.get(member.id);
				birdIds.forEach((b) => {
					yearSet?.add(b);
					groupUniqueSet.add(b);
				});

				if (monthlyUniqueMap.has(dateKey)) {
					const monthSet = monthlyUniqueMap.get(dateKey)?.get(member.id);
					birdIds.forEach((b) => {
						monthSet?.add(b);
					});
				}
			});
		});

		// Calculate Monthly Points
		// New logic: All members get points based on rank (N points for 1st, N-1 for 2nd, ..., 1 for last)
		for (let m = 0; m < 12; m++) {
			const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
			const monthScores = members.map((member) => {
				const userStats = statsMap.get(member.id);
				const birdsInMonth = userStats?.[monthKey] || [];
				const uniqueCount = new Set(birdsInMonth).size;
				return { uid: member.id, count: uniqueCount };
			});

			const activeScores = monthScores.filter((s) => s.count > 0);
			if (activeScores.length === 0) continue;

			activeScores.sort((a, b) => b.count - a.count);

			// Points based on total group size (as per requirements)
			const numMembers = group.memberIds.length;
			let currentRank = 1;
			let i = 0;

			while (i < activeScores.length) {
				const currentScore = activeScores[i].count;
				const tiedUsers: string[] = [];

				// Collect all users with the same score
				while (
					i < activeScores.length &&
					activeScores[i].count === currentScore
				) {
					tiedUsers.push(activeScores[i].uid);
					i++;
				}

				// Points based on rank: numMembers - currentRank + 1
				const pointsToAward = numMembers - currentRank + 1;
				tiedUsers.forEach((uid) => {
					yearlyPointsTracker.set(
						uid,
						(yearlyPointsTracker.get(uid) || 0) + pointsToAward,
					);
				});

				// Move to next rank (skip tied positions)
				currentRank += tiedUsers.length;
			}
		}

		// Calculate Yearly Points
		// New logic: All members get points based on yearly species count rank
		const yearScores = members.map((member) => {
			const count = yearUniqueMap.get(member.id)?.size || 0;
			return { uid: member.id, count };
		});

		const activeYearScores = yearScores.filter((s) => s.count > 0);
		if (activeYearScores.length > 0) {
			activeYearScores.sort((a, b) => b.count - a.count);

			// Points based on total group size (as per requirements)
			const numMembers = group.memberIds.length;
			let currentRank = 1;
			let i = 0;

			while (i < activeYearScores.length) {
				const currentScore = activeYearScores[i].count;
				const tiedUsers: string[] = [];

				// Collect all users with the same score
				while (
					i < activeYearScores.length &&
					activeYearScores[i].count === currentScore
				) {
					tiedUsers.push(activeYearScores[i].uid);
					i++;
				}

				// Points based on rank: numMembers - currentRank + 1
				const pointsToAward = numMembers - currentRank + 1;
				tiedUsers.forEach((uid) => {
					yearlyPointsTracker.set(
						uid,
						(yearlyPointsTracker.get(uid) || 0) + pointsToAward,
					);
				});

				// Move to next rank (skip tied positions)
				currentRank += tiedUsers.length;
			}
		}

		// Build Leaderboard Sections (Helper)
		const buildLeaderboard = (
			getScore: (m: UserProfile) => number,
			limit: number,
		): LeaderboardEntry[] => {
			const entries = members
				.map((m) => ({
					user: m,
					value: getScore(m),
					rank: 0,
				}))
				.filter((e) => e.value > 0)
				.sort((a, b) => {
					if (b.value !== a.value) return b.value - a.value;
					return (a.user.displayName || "").localeCompare(
						b.user.displayName || "",
					);
				});

			for (let i = 0; i < entries.length; i++) {
				if (i > 0 && entries[i].value === entries[i - 1].value) {
					entries[i].rank = entries[i - 1].rank;
				} else {
					entries[i].rank = i + 1;
				}
			}
			return entries.slice(0, limit);
		};

		setYearPointsLeaders(
			buildLeaderboard(
				(m) => yearlyPointsTracker.get(m.id) || 0,
				members.length,
			),
		);
		setYearUniqueLeaders(
			buildLeaderboard(
				(m) => yearUniqueMap.get(m.id)?.size || 0,
				members.length,
			),
		);

		// Monthly Sections
		const newMonthlySections: LeaderboardSection[] = [];

		// If selectedMonth is provided, only show that month with all members
		if (selectedMonth) {
			const monthUserMap = monthlyUniqueMap.get(selectedMonth);
			if (monthUserMap) {
				// Show all members (no limit)
				const entries = buildLeaderboard(
					(m) => monthUserMap.get(m.id)?.size || 0,
					members.length,
				);

				// Only add section if there are entries (non-empty month)
				if (entries.length > 0) {
					const [y, m] = selectedMonth.split("-");
					const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
					const monthName = new Intl.DateTimeFormat(i18n.language, {
						month: "long",
					}).format(date);
					const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

					newMonthlySections.push({ title, entries });
				}
			}
		} else {
			// Default behavior: show top 3 for all months
			for (const monthKey of months) {
				const monthUserMap = monthlyUniqueMap.get(monthKey);
				if (!monthUserMap) continue;

				let totalInMonth = 0;
				monthUserMap.forEach((s) => {
					totalInMonth += s.size;
				});
				if (totalInMonth === 0) continue;

				const entries = buildLeaderboard(
					(m) => monthUserMap.get(m.id)?.size || 0,
					3,
				);

				const [y, m] = monthKey.split("-");
				const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
				const monthName = new Intl.DateTimeFormat(i18n.language, {
					month: "long",
				}).format(date);
				const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

				newMonthlySections.push({ title, entries });
			}
		}
		setMonthlySections(newMonthlySections);
		setGroupTotalCount(groupUniqueSet.size);
	}, [
		group.memberIds,
		members,
		statsMap,
		currentYear,
		i18n.language,
		selectedMonth,
	]);

	return {
		yearPointsLeaders,
		yearUniqueLeaders,
		monthlySections,
		currentYear,
		groupTotalCount,
	};
}
