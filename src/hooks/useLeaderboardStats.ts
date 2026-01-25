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

	const currentYear = new Date().getFullYear();

	useEffect(() => {
		const yearlyPointsTracker = new Map<string, number>(); // UserID -> Points
		const yearUniqueMap = new Map<string, Set<string>>(); // UserID -> Set of Bird IDs
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

			let currentRank = 1;
			let i = 0;
			while (i < activeScores.length && currentRank <= 3) {
				const currentScore = activeScores[i].count;
				const tiedUsers: string[] = [];
				while (
					i < activeScores.length &&
					activeScores[i].count === currentScore
				) {
					tiedUsers.push(activeScores[i].uid);
					i++;
				}

				const pointsToAward = currentRank === 1 ? 3 : currentRank === 2 ? 2 : 1;
				tiedUsers.forEach((uid) => {
					yearlyPointsTracker.set(
						uid,
						(yearlyPointsTracker.get(uid) || 0) + pointsToAward,
					);
				});

				currentRank++;
			}
		}

		// Calculate Year Unique Bonus
		let maxYearlyUnique = 0;
		const yearlyWinners: string[] = [];
		members.forEach((member) => {
			const count = yearUniqueMap.get(member.id)?.size || 0;
			if (count > maxYearlyUnique) {
				maxYearlyUnique = count;
				yearlyWinners.length = 0;
				yearlyWinners.push(member.id);
			} else if (count === maxYearlyUnique && count > 0) {
				yearlyWinners.push(member.id);
			}
		});

		if (maxYearlyUnique > 0) {
			yearlyWinners.forEach((uid) => {
				yearlyPointsTracker.set(uid, (yearlyPointsTracker.get(uid) || 0) + 5);
			});
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
			buildLeaderboard((m) => yearlyPointsTracker.get(m.id) || 0, 3),
		);
		setYearUniqueLeaders(
			buildLeaderboard((m) => yearUniqueMap.get(m.id)?.size || 0, 3),
		);

		// Monthly Sections
		const newMonthlySections: LeaderboardSection[] = [];
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
		setMonthlySections(newMonthlySections);
	}, [group.memberIds, members, statsMap, currentYear, i18n.language]);

	return {
		yearPointsLeaders,
		yearUniqueLeaders,
		monthlySections,
		currentYear,
	};
}
