import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
	getUserProfile,
	getUserSightings,
	getUserStats,
	recalculateUserStats,
} from "../lib/firestore";
import type { UserProfile } from "../types";
import type { Sighting } from "../types/sighting";
import { MonthYearFilter } from "./MonthYearFilter";
import { SightingsList } from "./SightingsList";

export function UserView() {
	const { t } = useTranslation();
	const { userId } = useParams<{ userId: string }>();

	const [user, setUser] = useState<UserProfile | null>(null);
	const [userLoading, setUserLoading] = useState(true);

	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [viewMode, setViewMode] = useState<"month" | "year">("month");
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [stats, setStats] = useState<Record<string, string[]>>({});
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Fetch User Profile
	useEffect(() => {
		if (!userId) return;
		let isMounted = true;
		async function loadUser(id: string) {
			try {
				const userProfile = await getUserProfile(id);
				if (isMounted) {
					setUser(userProfile);
					setUserLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.error("Failed to load user profile", err);
					setError(t("errors.userNotFound")); // Or generic error
					setUserLoading(false);
				}
			}
		}
		loadUser(userId);
		return () => {
			isMounted = false;
		};
	}, [userId, t]);

	const fetchData = useCallback(
		async (isInitial = true) => {
			if (!user) return;

			if (isInitial) {
				setLoading(true);
				setError(null);
			} else {
				setLoadingMore(true);
			}

			try {
				let startDate: string;
				let endDate: string;

				if (viewMode === "month") {
					startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
					const lastDay = new Date(
						selectedYear,
						selectedMonth + 1,
						0,
					).getDate();
					endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${lastDay}`;
				} else {
					startDate = `${selectedYear}-01-01`;
					endDate = `${selectedYear}-12-31`;
				}
				const cursor = isInitial
					? undefined
					: (lastVisibleRef.current ?? undefined);

				const [sightingsResponse, statsData] = await Promise.all([
					getUserSightings(user.id, startDate, endDate, 20, cursor),
					// Only fetch stats on initial load
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
		[user, selectedMonth, selectedYear, viewMode, t],
	);

	useEffect(() => {
		if (user) {
			fetchData(true);
		}
	}, [fetchData, user]);

	if (userLoading) {
		return <div>{t("common.loading")}</div>;
	}

	if (!user) {
		return <div className="error-message">{t("errors.userNotFound")}</div>;
	}

	const currentStatsDate = new Date();
	const currentStatsMonthKey = `${currentStatsDate.getFullYear()}-${String(currentStatsDate.getMonth() + 1).padStart(2, "0")}`;
	const currentStatsYearKeyPrefix = `${currentStatsDate.getFullYear()}-`;

	// Needed for stats label
	const currentMonthLabel = new Date(
		currentStatsDate.getFullYear(),
		currentStatsDate.getMonth(),
		1,
	).toLocaleDateString(undefined, { month: "long" });

	return (
		<div className="user-view">
			<div className="user-view-header">
				{/* Removed Back button as Breadcrumbs handle navigation */}

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

			<MonthYearFilter
				viewMode={viewMode}
				setViewMode={setViewMode}
				selectedMonth={selectedMonth}
				setSelectedMonth={setSelectedMonth}
				selectedYear={selectedYear}
				setSelectedYear={setSelectedYear}
			/>

			<div className="stats-container">
				<div className="stat-item">
					<div className="stat-label">
						{currentMonthLabel} {currentStatsDate.getFullYear()}
					</div>
					<div className="stat-value">
						{(stats[currentStatsMonthKey] || []).length}
					</div>
				</div>
				<div className="stat-item">
					<div className="stat-label">
						{t("common.year")} {currentStatsDate.getFullYear()}
					</div>
					<div className="stat-value">
						{Object.entries(stats)
							.filter(([key]) => key.startsWith(currentStatsYearKeyPrefix))
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
					<SightingsList
						sightings={sightings}
						hasMore={hasMore}
						loadingMore={loadingMore}
						onLoadMore={() => fetchData(false)}
					/>
				</div>
			)}
		</div>
	);
}
