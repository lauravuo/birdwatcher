import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAvailableSpecies } from "../../hooks/useAvailableSpecies";
import {
	getGroupMembers,
	getGroupSightings,
	getUsersStats,
} from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import type { Sighting } from "../../types/sighting";
import { SightingsFilter } from "../SightingsFilter";
import { SightingsList } from "../SightingsList";

interface GroupSightingsProps {
	group: Group;
}

export function GroupSightings({ group }: GroupSightingsProps) {
	const { t, i18n } = useTranslation();
	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState<number | null>(
		now.getMonth(),
	);
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [members, setMembers] = useState<Map<string, UserProfile>>(new Map());
	const [stats, setStats] = useState<Map<string, Record<string, string[]>>>(
		new Map(),
	);

	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null);
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

	const fetchData = useCallback(
		async (isInitial = true) => {
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

				const [sightingsResponse, statsMap] = await Promise.all([
					getGroupSightings(
						group.memberIds,
						startDate,
						endDate,
						20,
						cursor,
						selectedSpecies,
					),
					// Fetch stats for all members on initial load
					isInitial
						? getUsersStats(group.memberIds)
						: Promise.resolve(new Map()),
				]);

				const { sightings: newSightings, lastVisible: newCursor } =
					sightingsResponse;

				if (isInitial) {
					// Also fetch members on initial load
					const membersData = await getGroupMembers(group.memberIds);
					const membersMap = new Map<string, UserProfile>();
					membersData.forEach((member) => {
						membersMap.set(member.id, member);
					});
					setMembers(membersMap);
					setSightings(newSightings);

					// Update stats if fetched
					if (statsMap.size > 0) {
						setStats(statsMap as Map<string, Record<string, string[]>>);
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
				console.error("Failed to fetch sightings:", err);
				setError(t("groupSightings.failedToLoad"));
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[group.memberIds, selectedMonth, selectedYear, selectedSpecies, t],
	);

	useEffect(() => {
		let isMounted = true;

		fetchData(true);

		// Listen for sighting added events
		const handleSightingAdded = () => {
			if (isMounted) {
				fetchData(true);
			}
		};

		window.addEventListener("sightingAdded", handleSightingAdded);

		return () => {
			isMounted = false;
			window.removeEventListener("sightingAdded", handleSightingAdded);
		};
	}, [fetchData]);

	if (loading) {
		return <div>{t("groupSightings.loading")}</div>;
	}

	if (error) {
		return <div className="error-message">{error}</div>;
	}

	return (
		<div className="group-sightings-container">
			<h3>
				{t("groupSightings.title")} ({sightings.length})
			</h3>

			<div className="group-tab-card">
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

				<SightingsList
					sightings={sightings}
					hasMore={hasMore}
					loadingMore={loadingMore}
					onLoadMore={() => fetchData(false)}
					showMemberName={true}
					members={members}
				/>
			</div>
		</div>
	);
}
