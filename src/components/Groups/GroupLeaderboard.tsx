import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
	type LeaderboardEntry,
	useLeaderboardStats,
} from "../../hooks/useLeaderboardStats";
import type { Group, UserProfile } from "../../types";
import { GroupFirstSightings } from "./GroupFirstSightings";

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

	const {
		yearPointsLeaders,
		yearUniqueLeaders,
		monthlySections,
		groupTotalCount,
	} = useLeaderboardStats(group, members, statsMap, selectedMonth);

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
				<div className="leaderboard-list">
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
			{yearPointsLeaders.length === 0 &&
			yearUniqueLeaders.length === 0 &&
			monthlySections.length === 0 ? (
				<div className="empty-state">{t("groupSightings.noSightings")}</div>
			) : (
				<>
					{/* 0. Group Total */}
					{groupTotalCount > 0 && (
						<div className="leaderboard-section">
							<h4 className="leaderboard-section-title">
								{t("leaderboard.groupTotal", { year: currentYear })}
							</h4>
							<div className="leaderboard-list">
								<div className="leaderboard-item" style={{ cursor: "default" }}>
									<div className="leaderboard-rank">👥</div>
									<div className="leaderboard-user">
										<span className="user-name">{group.name}</span>
									</div>
									<div className="leaderboard-stats">
										<div className="points">
											<span className="points-value">{groupTotalCount}</span>
											<span className="points-label">spp</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* 1. Latest Birds */}
					<GroupFirstSightings
						group={group}
						members={members}
						year={currentYear}
					/>

					{/* 2. Year Points */}
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

					{/* 3. Monthly Unique Section - Heading, Month Selector, and Stats */}
					{monthlySections.length === 0 ? (
						<>
							<div className="leaderboard-section">
								<h4 className="leaderboard-section-title">
									{t("leaderboard.monthUniqueLeaders", {
										month: new Intl.DateTimeFormat(i18n.language, {
											month: "long",
										}).format(new Date(currentYear, new Date().getMonth())),
									})}
								</h4>
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
							</div>
							<div className="empty-state">
								{t("leaderboard.noSightingsForMonth")}
							</div>
						</>
					) : (
						monthlySections.map((section) => (
							<div key={section.title} className="leaderboard-section">
								<h4 className="leaderboard-section-title">
									{t("leaderboard.monthUniqueLeaders", {
										month: section.title,
									})}
								</h4>
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
								<div className="leaderboard-list">
									{section.entries.map((entry) => (
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
													<span className="points-label">spp</span>
												</div>
											</div>
										</Link>
									))}
								</div>
							</div>
						))
					)}
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
