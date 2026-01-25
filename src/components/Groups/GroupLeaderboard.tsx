import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Group, UserProfile } from "../../types";

interface LeaderboardEntry {
	user: UserProfile;
	value: number;
	rank: number;
	// Auxiliary stats for display if needed
	secondaryValue?: number;
}

interface LeaderboardSection {
	title: string;
	entries: LeaderboardEntry[];
}

interface GroupLeaderboardProps {
	group: Group;
	members: UserProfile[];
	userStats: Map<string, Record<string, string[]>>;
}

export function GroupLeaderboard({
	group,
	members,
	userStats: statsMap,
}: GroupLeaderboardProps) {
	const { t, i18n } = useTranslation();
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

	// Calculate leaderboards from provided stats
	useEffect(() => {
		// Data structures for calculation
		const pointsMap = new Map<string, number>(); // UserID -> Total Points
		const yearUniqueMap = new Map<string, Set<string>>(); // UserID -> Set of Bird IDs
		const monthlyUniqueMap = new Map<string, Map<string, Set<string>>>(); // MonthKey (YYYY-MM) -> UserID -> Set of Bird IDs

		// Initialize maps
		group.memberIds.forEach((uid) => {
			pointsMap.set(uid, 0);
			yearUniqueMap.set(uid, new Set());
		});

		// Initialize last 12 months (or just this year's months down to Jan)
		// Request says "start with current month and go down to year start"
		const currentMonthIndex = new Date().getMonth(); // 0-11
		const months: string[] = [];
		for (let m = currentMonthIndex; m >= 0; m--) {
			const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
			months.push(monthKey);
			monthlyUniqueMap.set(monthKey, new Map());
			group.memberIds.forEach((uid) => {
				monthlyUniqueMap.get(monthKey)?.set(uid, new Set());
			});
		}

		// 2. Process Stats
		// We need to process stats to fill:
		// - yearUniqueMap (for "Year Unique" leaderboard)
		// - monthlyUniqueMap (for "Monthly Unique" leaderboards)
		// - Calculate Points based on Wins (for "Year Points" leaderboard)

		// Helper to check if a sighting is in the current year
		// The statsMap is structure: UserID -> { "YYYY-MM": ["birdId", ...] }
		// Actually getUsersStats returns: Record<string, Record<string, string[]>>
		// Outer key: userId, Inner key: "YYYY-MM", Value: array of bird IDs

		members.forEach((member) => {
			const userStats = statsMap.get(member.id);
			if (!userStats) return;

			Object.entries(userStats).forEach(([dateKey, birdIds]) => {
				// Check if dateKey is in current year
				if (!dateKey.startsWith(`${currentYear}-`)) return;

				// Add to Year Unique
				const yearSet = yearUniqueMap.get(member.id);
				birdIds.forEach((b) => {
					yearSet?.add(b);
				});

				// Add to Monthly Unique (if tracked)
				if (monthlyUniqueMap.has(dateKey)) {
					const monthSet = monthlyUniqueMap.get(dateKey)?.get(member.id);
					birdIds.forEach((b) => {
						monthSet?.add(b);
					});
				}
			});
		});

		// 3. Calculate Points & Determine Winners

		// A. Monthly Contests
		// Iterate all 12 months (even future ones if we want, but logic implies valid data only for past/current)
		// The loop above `months` only covers Jan -> Current Month.
		// However, points calculation usually considers the whole year logic or just "wins so far"?
		// Let's stick to the prompt: "current year... start with current month and go down to year start."
		// But for POINTS, we should probably check all months that have passed or have data?
		// Existing logic checked 0-11. Let's do that for Points Calculation validity.

		const yearlyPointsTracker = new Map<string, number>(); // UserID -> Points
		group.memberIds.forEach((uid) => {
			yearlyPointsTracker.set(uid, 0);
		});

		for (let m = 0; m < 12; m++) {
			const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
			// We need to calculate max for this month to award point
			let maxBirds = 0;
			const winners: string[] = [];

			members.forEach((member) => {
				const userStats = statsMap.get(member.id);
				const birdsInMonth = userStats?.[monthKey] || [];
				// Unique check? The existing logic was `length`, implying just count of sightings?
				// "most unique birds" is the prompt.
				// Existing logic: `const count = userStats?.[monthKey]?.length || 0;` (Wait, existing logic used raw array length?)
				// Previous code: `const count = userStats?.[monthKey]?.length || 0;`
				// If stats are unique birds per month, then length is fine.
				// But usually we want unique set size.
				// Let's assume the array in stats might contain duplicates if the implementation allows, but usually `getUsersStats` returns sightings list.
				// Safest is to use Set size.
				const uniqueCount = new Set(birdsInMonth).size;

				if (uniqueCount > maxBirds) {
					maxBirds = uniqueCount;
					winners.length = 0;
					winners.push(member.id);
				} else if (uniqueCount === maxBirds && uniqueCount > 0) {
					winners.push(member.id);
				}
			});

			if (maxBirds > 0) {
				winners.forEach((uid) => {
					yearlyPointsTracker.set(uid, (yearlyPointsTracker.get(uid) || 0) + 1);
				});
			}
		}

		// B. Year Unique Contest
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
				// Year winner gets +2 points
				yearlyPointsTracker.set(uid, (yearlyPointsTracker.get(uid) || 0) + 2);
			});
		}

		// 4. Build Leaderboard Sections

		// --- Year Points Leaders ---
		const pointsEntries = members
			.map((m) => ({
				user: m,
				value: yearlyPointsTracker.get(m.id) || 0,
				rank: 0,
			}))
			.sort((a, b) => {
				if (b.value !== a.value) return b.value - a.value;
				return (a.user.displayName || "").localeCompare(
					b.user.displayName || "",
				);
			});

		// Assign ranks
		for (let i = 0; i < pointsEntries.length; i++) {
			if (i > 0 && pointsEntries[i].value === pointsEntries[i - 1].value) {
				pointsEntries[i].rank = pointsEntries[i - 1].rank;
			} else {
				pointsEntries[i].rank = i + 1;
			}
		}
		setYearPointsLeaders(pointsEntries.slice(0, 3));

		// --- Year Unique Leaders ---
		const yearUniqueEntries = members
			.map((m) => ({
				user: m,
				value: yearUniqueMap.get(m.id)?.size || 0,
				rank: 0,
			}))
			.sort((a, b) => {
				if (b.value !== a.value) return b.value - a.value;
				return (a.user.displayName || "").localeCompare(
					b.user.displayName || "",
				);
			});

		for (let i = 0; i < yearUniqueEntries.length; i++) {
			if (
				i > 0 &&
				yearUniqueEntries[i].value === yearUniqueEntries[i - 1].value
			) {
				yearUniqueEntries[i].rank = yearUniqueEntries[i - 1].rank;
			} else {
				yearUniqueEntries[i].rank = i + 1;
			}
		}
		setYearUniqueLeaders(yearUniqueEntries.slice(0, 3));

		// --- Monthly Unique Leaders ---
		const newMonthlySections: LeaderboardSection[] = [];
		for (const monthKey of months) {
			const monthUserMap = monthlyUniqueMap.get(monthKey);
			if (!monthUserMap) continue;

			// Skip month if absolutely no activity?
			// Prompt doesn't say. But cleaner to skip empty months or show "No data"?
			// Let's check total sightings count in this month
			let totalInMonth = 0;
			monthUserMap.forEach((s) => {
				totalInMonth += s.size;
			});
			if (totalInMonth === 0) continue;

			const entries = members
				.map((m) => ({
					user: m,
					value: monthUserMap.get(m.id)?.size || 0,
					rank: 0,
				}))
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

			// Format Month Name
			const [y, m] = monthKey.split("-");
			const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
			const monthName = new Intl.DateTimeFormat(i18n.language, {
				month: "long",
			}).format(date);
			// Capitalize
			const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

			newMonthlySections.push({
				title,
				entries: entries.slice(0, 3),
			});
		}
		setMonthlySections(newMonthlySections);
	}, [group.memberIds, members, statsMap, currentYear, i18n.language]);

	const renderSection = (
		title: string,
		entries: LeaderboardEntry[],
		unitLabel: string,
	) => (
		<div className="leaderboard-section">
			<h4 className="leaderboard-section-title">{title}</h4>
			{entries.length === 0 ? (
				<div className="no-data">{t("userView.noSightings")}</div>
			) : (
				<div className="leaderboard-list group-tab-card">
					{entries.map((entry) => (
						<Link
							to={`/groups/${group.id}/members/${entry.user.id}`}
							key={entry.user.id}
							className={`leaderboard-item rank-${entry.rank}`}
							style={{ textDecoration: "none", color: "inherit" }}
						>
							<div className="leaderboard-rank">
								{entry.rank === 1
									? "🥇"
									: entry.rank === 2
										? "🥈"
										: entry.rank === 3
											? "🥉"
											: `#${entry.rank}`}
							</div>
							<div className="leaderboard-user">
								{entry.user.photoURL && (
									<img
										src={entry.user.photoURL}
										alt={entry.user.displayName || "User"}
										className="user-avatar-small"
									/>
								)}
								<span className="user-name">
									{entry.user.displayName || t("common.anonymous")}
								</span>
							</div>
							<div className="leaderboard-stats">
								<div className="points">
									<span className="points-value">{entry.value}</span>
									<span className="points-label">{unitLabel}</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);

	return (
		<div className="leaderboard-container">
			{/* 1. Year Points */}
			{renderSection(
				t("leaderboard.yearPointsLeaders", { year: currentYear }),
				yearPointsLeaders,
				"pts",
			)}

			{/* 2. Year Unique */}
			{renderSection(
				t("leaderboard.yearUniqueLeaders", { year: currentYear }),
				yearUniqueLeaders,
				"spp",
			)}

			{/* 3. Monthly Unique */}
			{monthlySections.map((section) => (
				<div key={section.title}>
					{renderSection(
						t("leaderboard.monthUniqueLeaders", { month: section.title }),
						section.entries,
						"spp",
					)}
				</div>
			))}

			{/* If absolutely empty */}
			{yearPointsLeaders.length === 0 && monthlySections.length === 0 && (
				<div className="empty-state">{t("groupSightings.noSightings")}</div>
			)}
		</div>
	);
}
