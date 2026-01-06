import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
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
	const { t, i18n } = useTranslation();
	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [stats, setStats] = useState<Record<string, string[]>>({});
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(
		async (isInitial = true) => {
			if (isInitial) {
				setLoading(true);
				setError(null);
			} else {
				setLoadingMore(true);
			}

			try {
				const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
				const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
				const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${lastDay}`;
				const cursor = isInitial
					? undefined
					: (lastVisibleRef.current ?? undefined);

				const [sightingsResponse, statsData] = await Promise.all([
					getUserSightings(user.id, startDate, endDate, 20, cursor),
					// Only fetch stats on initial load to avoid redundant reads?
					// For simplicity keeping as is, or optimize if needed.
					// Actually, getUserStats is cheap if cached, but let's just fetch it.
					// However, if we paginate, we shouldn't re-fetch stats every time?
					// Let's assume stats won't change drastically during pagination.
					// But the current implementation fetches both in parallel.
					// We only need stats for the header.
					isInitial ? getUserStats(user.id) : Promise.resolve({}),
				]);

				const { sightings: newSightings, lastVisible: newCursor } =
					sightingsResponse;

				if (isInitial) {
					setSightings(newSightings);
					setStats(statsData);

					// Auto-recalculate if stats seem empty but we have sightings (backfill)
					if (
						Object.keys(statsData).length === 0 &&
						newSightings.length > 0 &&
						cursor === undefined
					) {
						console.log("Stats missing, recalculating...");
						await recalculateUserStats(user.id);
						const newStats = await getUserStats(user.id);
						setStats(newStats);
					}
				} else {
					setSightings((prev) => [...prev, ...newSightings]);
				}

				lastVisibleRef.current = newCursor;
				// Only show "Load More" if we received a full page of results
				setHasMore(newSightings.length === 20);

				setLoading(false);
				setLoadingMore(false);
			} catch (err) {
				console.error("Failed to fetch user data:", err);
				setError(t("userView.failedToLoad", "Failed to load sightings"));
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[user.id, selectedMonth, selectedYear, t],
	);

	useEffect(() => {
		fetchData(true);
	}, [fetchData]);

	const formatDate = (dateString: string, timeString?: string) => {
		const date = new Date(`${dateString}T00:00:00`);
		const dateFormatted = date.toLocaleDateString(i18n.language, {
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
			label: date.toLocaleDateString(i18n.language, { month: "long" }),
		};
	});

	const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

	return (
		<div className="user-view">
			<div className="user-view-header">
				<button type="button" onClick={onBack} className="back-button">
					← {t("common.back")}
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
						{t("common.year")} {selectedYear}
					</div>
					<div className="stat-value">
						{Object.entries(stats)
							.filter(([key]) => key.startsWith(`${selectedYear}-`))
							.reduce((acc, [_, birds]) => acc + birds.length, 0)}
					</div>
				</div>
				<div className="stat-item">
					<div className="stat-label">{t("common.total")}</div>
					<div className="stat-value">
						{Object.values(stats).reduce((acc, birds) => acc + birds.length, 0)}
					</div>
				</div>
			</div>

			{loading ? (
				<div>{t("common.loading")}</div>
			) : error ? (
				<div className="error-message">{error}</div>
			) : (
				<div className="group-sightings-container">
					<h3>
						{t("userView.sightings")} ({sightings.length})
					</h3>
					{sightings.length === 0 ? (
						<p className="no-sightings">{t("userView.noSightings")}</p>
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
					{hasMore && (
						<button
							type="button"
							onClick={() => fetchData(false)}
							className="load-more-button"
							disabled={loadingMore}
						>
							{loadingMore ? t("common.loading") : t("common.loadMore")}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
