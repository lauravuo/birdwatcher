import { useTranslation } from "react-i18next";

interface SightingsFilterProps {
	years: number[];
	selectedYear: number;
	setSelectedYear: (year: number) => void;
	months: { value: number | null; label: string }[];
	selectedMonth: number | null;
	setSelectedMonth: (month: number | null) => void;
	species: string[];
	selectedSpecies: string | null;
	setSelectedSpecies: (species: string | null) => void;
}

export function SightingsFilter({
	years,
	selectedYear,
	setSelectedYear,
	months,
	selectedMonth,
	setSelectedMonth,
	species,
	selectedSpecies,
	setSelectedSpecies,
}: SightingsFilterProps) {
	const { t } = useTranslation();

	return (
		<div className="filters-container">
			<div className="filter-group">
				<label htmlFor="year-select">{t("common.year")}</label>
				<select
					id="year-select"
					className="filter-select"
					data-testid="year-filter"
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

			<div className="filter-group">
				<label htmlFor="month-select">{t("common.month")}</label>
				<select
					id="month-select"
					className="filter-select"
					data-testid="month-filter"
					value={selectedMonth === null ? "any" : selectedMonth}
					onChange={(e) => {
						const value = e.target.value;
						setSelectedMonth(value === "any" ? null : Number(value));
					}}
				>
					{months.map((m) => (
						<option key={m.value ?? "any"} value={m.value ?? "any"}>
							{m.label}
						</option>
					))}
				</select>
			</div>

			<div className="filter-group">
				<label htmlFor="species-select">{t("common.species")}</label>
				<select
					id="species-select"
					className="filter-select"
					value={selectedSpecies || "any"}
					onChange={(e) => {
						const value = e.target.value;
						setSelectedSpecies(value === "any" ? null : value);
					}}
				>
					<option value="any">{t("common.any")}</option>
					{species.map((birdId) => (
						<option key={birdId} value={birdId}>
							{t(`birds.${birdId}`)}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
