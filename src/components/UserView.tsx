import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getUserSightings,
	getUserStats,
	recalculateUserStats,
} from "../lib/firestore";
import type { UserProfile } from "../types";
import type { Sighting } from "../types/sighting";

interface UserViewProps {
	user: UserProfile;
	onBack: () => void;
}

export function UserView({ user, onBack }: UserViewProps) {
	const { t } = useTranslation();
	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [stats, setStats] = useState<Record<string, string[]>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
			const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
			const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${lastDay}`;

			const [sightingsData, statsData] = await Promise.all([
				getUserSightings(user.id, startDate, endDate),
				getUserStats(user.id),
			]);

			setSightings(sightingsData);
			setStats(statsData);

			// Auto-recalculate if stats seem empty but we have sightings (backfill)
			// This is a simple heuristic: if we have sightings for this month but no stats for this month.
			// Ideally we assume if the document is empty we might need backfill.
			// Let's just check if stats is completely empty but sightings is not empty.
			// But since we only fetched this month's sightings, we can't be sure about global state.
			// A safer check: if stats is empty, try recalculate once.
			if (Object.keys(statsData).length === 0 && sightingsData.length > 0) {
				console.log("Stats missing, recalculating...");
				await recalculateUserStats(user.id);
				const newStats = await getUserStats(user.id);
				setStats(newStats);
			}

			setLoading(false);
		} catch (err) {
			console.error("Failed to fetch user data:", err);
			setError(t("userView.failedToLoad", "Failed to load sightings"));
			setLoading(false);
		}
	}, [user.id, selectedMonth, selectedYear, t]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const formatDate = (dateString: string, timeString?: string) => {
		const date = new Date(`${dateString}T00:00:00`);
		const dateFormatted = date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
		if (timeString) {
			return `${dateFormatted} ${timeString}`;
		}
		return dateFormatted;
	};

	const getObservationTypeLabel = (type: string) => {
		switch (type) {
			case "visual":
				return t("addSighting.visual");
			case "audial":
				return t("addSighting.audial");
			case "both":
				return t("addSighting.both");
			default:
				return type;
		}
	};

	const months = Array.from({ length: 12 }, (_, i) => {
		const date = new Date(2000, i, 1);
		return {
			value: i,
			label: date.toLocaleDateString(undefined, { month: "long" }),
		};
	});

	const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

	return (
		<div className="user-view">
			<div className="user-view-header">
				<button type="button" onClick={onBack} className="back-button">
					← {t("common.back", "Back")}
				</button>
				<div className="user-profile-summary">
					{user.photoURL && (
						<img
							src={user.photoURL}
							alt={user.displayName}
							className="user-avatar-large"
						/>
					)}
					<h2>{user.displayName}</h2>
				</div>
			</div>

			<div className="filters-container">
				<div className="filter-group">
					<label htmlFor="month-select">{t("common.month", "Month")}</label>
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
				<div className="filter-group">
					<label htmlFor="year-select">{t("common.year", "Year")}</label>
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

			<div className="stats-container">
				<div className="stat-item">
					<div className="stat-label">
						{months[selectedMonth].label} {selectedYear}
					</div>
					<div className="stat-value">
						{
							(
								stats[
									`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
								] || []
							).length
						}
					</div>
				</div>
				<div className="stat-item">
					<div className="stat-label">
						{t("common.year", "Year")} {selectedYear}
					</div>
					<div className="stat-value">
						{Object.entries(stats)
							.filter(([key]) => key.startsWith(`${selectedYear}-`))
							.reduce((acc, [_, birds]) => acc + birds.length, 0)}
					</div>
				</div>
				<div className="stat-item">
					<div className="stat-label">{t("common.total", "Total")}</div>
					<div className="stat-value">
						{Object.values(stats).reduce((acc, birds) => acc + birds.length, 0)}
					</div>
				</div>
			</div>

			{loading ? (
				<div>{t("common.loading", "Loading...")}</div>
			) : error ? (
				<div className="error-message">{error}</div>
			) : (
				<div className="group-sightings-container">
					<h3>
						{t("userView.sightings", "Sightings")} ({sightings.length})
					</h3>
					{sightings.length === 0 ? (
						<p className="no-sightings">
							{t("userView.noSightings", "No sightings found for this period")}
						</p>
					) : (
						<ul className="sightings-list">
							{sightings.map((sighting) => {
								const birdName = t(`birds.${sighting.birdId}`);

								return (
									<li key={sighting.id} className="sighting-item">
										<div className="sighting-header">
											<div className="sighting-bird">
												<strong>{birdName}</strong>
											</div>
											<div className="sighting-meta">
												<span className="sighting-date">
													{formatDate(sighting.date, sighting.time)}
												</span>
											</div>
										</div>
										<div className="sighting-details">
											<span className="sighting-type">
												{getObservationTypeLabel(sighting.type)}
											</span>
											{sighting.locationName && (
												<span className="sighting-location">
													📍 {sighting.locationName}
												</span>
											)}
											{sighting.notes && (
												<div className="sighting-notes">{sighting.notes}</div>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
