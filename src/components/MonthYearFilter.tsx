import { useTranslation } from "react-i18next";

interface MonthYearFilterProps {
	viewMode: "month" | "year";
	setViewMode: (mode: "month" | "year") => void;
	selectedMonth: number;
	setSelectedMonth: (month: number) => void;
	selectedYear: number;
	setSelectedYear: (year: number) => void;
}

export function MonthYearFilter({
	viewMode,
	setViewMode,
	selectedMonth,
	setSelectedMonth,
	selectedYear,
	setSelectedYear,
}: MonthYearFilterProps) {
	const { t, i18n } = useTranslation();

	const months = Array.from({ length: 12 }, (_, i) => {
		const date = new Date(2000, i, 1);
		return {
			value: i,
			label: date.toLocaleDateString(i18n.language, { month: "long" }),
		};
	});

	const now = new Date();
	const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

	return (
		<div className="filters-container">
			<div className="filter-group">
				<div className="view-mode-toggle">
					<button
						type="button"
						className={`toggle-button ${viewMode === "month" ? "active" : ""}`}
						onClick={() => setViewMode("month")}
					>
						{t("common.month")}
					</button>
					<button
						type="button"
						className={`toggle-button ${viewMode === "year" ? "active" : ""}`}
						onClick={() => setViewMode("year")}
					>
						{t("common.year")}
					</button>
				</div>
			</div>

			{viewMode === "month" && (
				<div className="filter-group">
					<label htmlFor="month-select">{t("common.month")}</label>
					<select
						id="month-select"
						className="filter-select"
						value={selectedMonth}
						onChange={(e) => setSelectedMonth(Number(e.target.value))}
					>
						{months.map((m) => (
							<option key={m.value} value={m.value}>
								{m.label}
							</option>
						))}
					</select>
				</div>
			)}
			<div className="filter-group">
				<label htmlFor="year-select">{t("common.year")}</label>
				<select
					id="year-select"
					className="filter-select"
					value={selectedYear}
					onChange={(e) => setSelectedYear(Number(e.target.value))}
				>
					{years.map((y) => (
						<option key={y} value={y}>
							{y}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
