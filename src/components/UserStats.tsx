import { useTranslation } from "react-i18next";

interface UserStatsProps {
	stats: Record<string, string[]>;
}

export function UserStats({ stats }: UserStatsProps) {
	const { t, i18n } = useTranslation();
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth(); // 0-indexed

	const currentYearKeyPrefix = `${currentYear}-`;
	const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

	// Calculate unique birds
	const allTimeUnique = new Set(Object.values(stats).flat()).size;

	const yearUnique = new Set(
		Object.entries(stats)
			.filter(([key]) => key.startsWith(currentYearKeyPrefix))
			.flatMap(([_, birds]) => birds),
	).size;

	const monthUnique = (stats[currentMonthKey] || []).length;
	// Since stats[key] is a Set (via arrayUnion in Firestore), length is unique count for that month.

	const currentMonthLabel = now.toLocaleDateString(i18n.language, {
		month: "long",
	});

	return (
		<div className="stats-container">
			<div className="stat-item">
				<div className="stat-label">
					{currentMonthLabel} {currentYear}
				</div>
				<div className="stat-value">{monthUnique}</div>
			</div>
			<div className="stat-item">
				<div className="stat-label">
					{t("common.year")} {currentYear}
				</div>
				<div className="stat-value">{yearUnique}</div>
			</div>
			<div className="stat-item">
				<div className="stat-label">{t("common.total")}</div>
				<div className="stat-value">{allTimeUnique}</div>
			</div>
		</div>
	);
}
