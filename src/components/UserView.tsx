import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAvailableSpecies } from "../hooks/useAvailableSpecies";
import {
	getUserProfile,
	getUserSightings,
	getUserStats,
	recalculateUserStats,
} from "../lib/firestore";
import type { UserProfile } from "../types";
import type { Sighting } from "../types/sighting";
import { SightingsFilter } from "./SightingsFilter";
import { SightingsList } from "./SightingsList";

export function UserView() {
	const { t, i18n } = useTranslation();
	const { userId } = useParams<{ userId: string }>();
	const { currentUser } = useAuth();

	const [user, setUser] = useState<UserProfile | null>(null);
	const [userLoading, setUserLoading] = useState(true);

	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState<number | null>(
		now.getMonth(),
	);
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [stats, setStats] = useState<Record<string, string[]>>({});
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
	const requestIdRef = useRef(0);
	const [error, setError] = useState<string | null>(null);

	// Derived filter options
	const [availableYears, setAvailableYears] = useState<number[]>([]);
	const [availableMonths, setAvailableMonths] = useState<
		{ value: number | null; label: string }[]
	>([]);
	// Calculate static options (Years/Months)
	useEffect(() => {
		const currentYear = new Date().getFullYear();
		// Show 5 years
		setAvailableYears(Array.from({ length: 5 }, (_, i) => currentYear - i));

		setAvailableMonths([
			{ value: null, label: t("common.any") },
			...Array.from({ length: 12 }, (_, i) => ({
				value: i,
				label: new Date(2000, i, 1).toLocaleDateString(i18n.language, {
					month: "long",
				}),
			})),
		]);
	}, [i18n.language, t]);

	const availableSpecies = useAvailableSpecies(
		stats,
		selectedYear,
		selectedMonth,
	);

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

			const requestId = ++requestIdRef.current;

			if (isInitial) {
				setLoading(true);
				setError(null);
			} else {
				setLoadingMore(true);
			}

			try {
				let startDate: string;
				let endDate: string;

				if (selectedMonth !== null) {
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
					getUserSightings(
						user.id,
						startDate,
						endDate,
						20,
						cursor,
						selectedSpecies,
					),
					// Only fetch stats on initial load
					isInitial ? getUserStats(user.id) : Promise.resolve({}),
				]);

				if (requestId !== requestIdRef.current) return;

				const { sightings: newSightings, lastVisible: newCursor } =
					sightingsResponse;

				if (isInitial) {
					setSightings(newSightings);
					if (Object.keys(statsData).length > 0) {
						setStats(statsData);
					}

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
		[user, selectedMonth, selectedYear, selectedSpecies, t],
	);

	// Listen for refresh events
	useEffect(() => {
		const handleRefresh = () => {
			fetchData(true);
		};
		window.addEventListener("sightingAdded", handleRefresh);
		return () => window.removeEventListener("sightingAdded", handleRefresh);
	}, [fetchData]);

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
					<h2 data-testid="user-view-heading">
						{user.displayName}
						{userId === currentUser?.uid && (
							<span className="you-badge">{t("groups.you")}</span>
						)}
					</h2>
				</div>
			</div>

			<SightingsFilter
				years={availableYears}
				selectedYear={selectedYear}
				setSelectedYear={setSelectedYear}
				months={availableMonths}
				selectedMonth={selectedMonth}
				setSelectedMonth={setSelectedMonth}
				species={availableSpecies}
				selectedSpecies={selectedSpecies}
				setSelectedSpecies={setSelectedSpecies}
			/>

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
