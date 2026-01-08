import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupMembers, getUsersStats } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";

interface LeaderboardEntry {
	user: UserProfile;
	totalPoints: number;
	monthlyWins: number;
	yearlyWin: boolean;
	rank: number;
}

interface GroupLeaderboardProps {
	group: Group;
}

export function GroupLeaderboard({ group }: GroupLeaderboardProps) {
	const { t } = useTranslation();
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const currentYear = new Date().getFullYear();

	useEffect(() => {
		async function fetchAndCalculate() {
			try {
				setLoading(true);
				setError(null);

				// 1. Fetch Users and Stats in parallel
				const [members, statsMap] = await Promise.all([
					getGroupMembers(group.memberIds),
					getUsersStats(group.memberIds, currentYear),
				]);

				// 2. Calculate Points
				const points = new Map<string, number>();
				const monthlyWins = new Map<string, number>();
				const yearlyWins = new Map<string, boolean>();

				group.memberIds.forEach((uid) => {
					points.set(uid, 0);
					monthlyWins.set(uid, 0);
					yearlyWins.set(uid, false);
				});

				// Monthly Contest (0-11)
				for (let month = 0; month < 12; month++) {
					const monthKey = `${currentYear}-${String(month + 1).padStart(2, "0")}`;
					let maxBirds = 0;
					const winners: string[] = [];

					// Find max birds for this month
					members.forEach((member) => {
						const userStats = statsMap.get(member.id);
						const count = userStats?.[monthKey]?.length || 0;
						if (count > maxBirds) {
							maxBirds = count;
							winners.length = 0; // Reset winners
							winners.push(member.id);
						} else if (count === maxBirds && count > 0) {
							winners.push(member.id);
						}
					});

					// Award points for monthly winners
					if (maxBirds > 0) {
						winners.forEach((uid) => {
							points.set(uid, (points.get(uid) || 0) + 1);
							monthlyWins.set(uid, (monthlyWins.get(uid) || 0) + 1);
						});
					}
				}

				// Yearly Contest
				let maxYearlyUnique = 0;
				const yearlyWinners: string[] = [];

				members.forEach((member) => {
					const userStats = statsMap.get(member.id) || {};
					const allBirds = new Set<string>();

					Object.entries(userStats).forEach(([key, birds]) => {
						if (key.startsWith(`${currentYear}-`)) {
							birds.forEach((b) => {
								allBirds.add(b);
							});
						}
					});

					const count = allBirds.size;
					if (count > maxYearlyUnique) {
						maxYearlyUnique = count;
						yearlyWinners.length = 0;
						yearlyWinners.push(member.id);
					} else if (count === maxYearlyUnique && count > 0) {
						yearlyWinners.push(member.id);
					}
				});

				// Award points for yearly winners (+2)
				if (maxYearlyUnique > 0) {
					yearlyWinners.forEach((uid) => {
						points.set(uid, (points.get(uid) || 0) + 2);
						yearlyWins.set(uid, true);
					});
				}

				// 3. Build Leaderboard Data
				const data: LeaderboardEntry[] = members.map((member) => ({
					user: member,
					totalPoints: points.get(member.id) || 0,
					monthlyWins: monthlyWins.get(member.id) || 0,
					yearlyWin: yearlyWins.get(member.id) || false,
					rank: 0,
				}));

				// Sort by Total Points DESC, then Name ASC
				data.sort((a, b) => {
					if (b.totalPoints !== a.totalPoints) {
						return b.totalPoints - a.totalPoints;
					}
					return (a.user.displayName || "").localeCompare(
						b.user.displayName || "",
					);
				});

				// Assign ranks (handle ties)
				let currentRank = 1;
				for (let i = 0; i < data.length; i++) {
					if (i > 0 && data[i].totalPoints < data[i - 1].totalPoints) {
						currentRank = i + 1;
					}
					data[i].rank = currentRank;
				}

				setLeaderboard(data);
			} catch (err) {
				console.error("Failed to calculate leaderboard:", err);
				setError(t("leaderboard.failedToLoad"));
			} finally {
				setLoading(false);
			}
		}

		fetchAndCalculate();
	}, [group.memberIds, currentYear, t]);

	if (loading)
		return <div className="leaderboard-loading">{t("common.loading")}</div>;
	if (error) return <div className="error-message">{error}</div>;
	if (leaderboard.length === 0) return null;

	return (
		<div className="leaderboard-container">
			<h3>
				{t("leaderboard.title")} ({currentYear})
			</h3>
			<div className="leaderboard-list">
				{leaderboard.map((entry) => (
					<div
						key={entry.user.id}
						className={`leaderboard-item rank-${entry.rank}`}
					>
						<div className="leaderboard-rank">#{entry.rank}</div>
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
								<span className="points-value">{entry.totalPoints}</span>
								<span className="points-label">pts</span>
							</div>
							<div className="badges">
								{entry.yearlyWin && (
									<span
										className="badge year-badge"
										title={t("leaderboard.yearlyWinner")}
									>
										🏆
									</span>
								)}
								{entry.monthlyWins > 0 && (
									<span
										className="badge month-badge"
										title={t("leaderboard.monthlyWinner", {
											count: entry.monthlyWins,
										})}
									>
										★ {entry.monthlyWins}
									</span>
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
