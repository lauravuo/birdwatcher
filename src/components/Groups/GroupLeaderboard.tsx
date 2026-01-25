import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
	type LeaderboardEntry,
	useLeaderboardStats,
} from "../../hooks/useLeaderboardStats";
import type { Group, UserProfile } from "../../types";

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
	const { t } = useTranslation();
	const { yearPointsLeaders, yearUniqueLeaders, monthlySections, currentYear } =
		useLeaderboardStats(group, members, statsMap);

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
			{yearPointsLeaders.length > 0 &&
				renderSection(
					t("leaderboard.yearPointsLeaders", { year: currentYear }),
					yearPointsLeaders,
					"pts",
				)}

			{/* 2. Year Unique */}
			{yearUniqueLeaders.length > 0 &&
				renderSection(
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
			{yearPointsLeaders.length === 0 &&
				yearUniqueLeaders.length === 0 &&
				monthlySections.length === 0 && (
					<div className="empty-state">{t("groupSightings.noSightings")}</div>
				)}
		</div>
	);
}
