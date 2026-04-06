import { useState } from "react";
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
	const { t, i18n } = useTranslation();
	const currentYear = new Date().getFullYear();
	const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
	const defaultMonth = `${currentYear}-${currentMonth}`;

	const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
	const [activeTab, setActiveTab] = useState<
		"yearPoints" | "yearUnique" | "monthUnique"
	>("yearPoints");

	const { yearPointsLeaders, yearUniqueLeaders, monthlySections } =
		useLeaderboardStats(group, members, statsMap, selectedMonth);

	const renderLeaderboardList = (
		entries: LeaderboardEntry[],
		unitLabel: string,
	) => (
		<div className="leaderboard-list">
			{entries.map((entry) => (
				<Link
					to={`/groups/${group.id}/members/${entry.user.id}`}
					key={entry.user.id}
					className={`leaderboard-item rank-${entry.rank} ${
						entry.rank <= 3 ? "top-3-item" : ""
					}`}
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
								className={
									entry.rank <= 3 ? "user-avatar-top-3" : "user-avatar-small"
								}
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
	);

	const hasLeaderboardData =
		yearPointsLeaders.length > 0 ||
		yearUniqueLeaders.length > 0 ||
		monthlySections.length > 0;

	return (
		<div className="leaderboard-container">
			{!hasLeaderboardData ? (
				<div className="empty-state">{t("groupSightings.noSightings")}</div>
			) : (
				<>
					{/* Tabs */}
					<div className="tabs-container">
						<button
							type="button"
							className={`tab-button ${activeTab === "yearPoints" ? "active" : ""}`}
							onClick={() => setActiveTab("yearPoints")}
							data-testid="leaderboard-tab-points"
						>
							{t("leaderboard.tabs.yearPoints")}
						</button>
						<button
							type="button"
							className={`tab-button ${activeTab === "yearUnique" ? "active" : ""}`}
							onClick={() => setActiveTab("yearUnique")}
							data-testid="leaderboard-tab-species"
						>
							{t("leaderboard.tabs.yearUnique")}
						</button>
						<button
							type="button"
							className={`tab-button ${activeTab === "monthUnique" ? "active" : ""}`}
							onClick={() => setActiveTab("monthUnique")}
							data-testid="leaderboard-tab-monthly"
						>
							{t("leaderboard.tabs.monthUnique")}
						</button>
					</div>

					<div className="tab-content">
						{activeTab === "yearPoints" && (
							<div className="leaderboard-section">
								<h3 className="leaderboard-section-title">
									{t("leaderboard.yearPointsLeaders", { year: currentYear })}
								</h3>
								{yearPointsLeaders.length === 0 ? (
									<div className="no-data">{t("userView.noSightings")}</div>
								) : (
									renderLeaderboardList(yearPointsLeaders, "pts")
								)}
							</div>
						)}

						{activeTab === "yearUnique" && (
							<div className="leaderboard-section">
								<h3 className="leaderboard-section-title">
									{t("leaderboard.yearUniqueLeaders", { year: currentYear })}
								</h3>
								{yearUniqueLeaders.length === 0 ? (
									<div className="no-data">{t("userView.noSightings")}</div>
								) : (
									renderLeaderboardList(yearUniqueLeaders, "spp")
								)}
							</div>
						)}

						{activeTab === "monthUnique" && (
							<div className="leaderboard-section">
								<div className="month-selector-container">
									<label
										htmlFor="month-select"
										className="month-selector-label"
									>
										{t("leaderboard.selectMonth")}:
									</label>
									<select
										id="month-select"
										value={selectedMonth}
										onChange={(e) => setSelectedMonth(e.target.value)}
										className="month-selector"
										data-testid="month-selector"
									>
										{generateMonthOptions(currentYear, i18n.language).map(
											(option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											),
										)}
									</select>
								</div>

								{monthlySections.length === 0 ? (
									<div className="empty-state">
										{t("leaderboard.noSightingsForMonth")}
									</div>
								) : (
									monthlySections.map((section) => (
										<div key={section.title}>
											<h3 className="leaderboard-section-title">
												{t("leaderboard.monthUniqueLeaders", {
													month: section.title,
												})}
											</h3>
											{renderLeaderboardList(section.entries, "spp")}
										</div>
									))
								)}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}

// Helper function to generate month options
function generateMonthOptions(
	year: number,
	language: string,
): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	const currentMonth = new Date().getMonth();

	for (let m = 0; m <= currentMonth; m++) {
		const monthKey = `${year}-${String(m + 1).padStart(2, "0")}`;
		const date = new Date(year, m);
		const monthName = new Intl.DateTimeFormat(language, {
			month: "long",
		}).format(date);
		options.push({
			value: monthKey,
			label: `${monthName} ${year}`,
		});
	}

	return options.reverse(); // Most recent first
}
