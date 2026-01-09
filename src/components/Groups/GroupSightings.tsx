import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupMembers, getGroupSightings } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import type { Sighting } from "../../types/sighting";
import { MonthYearFilter } from "../MonthYearFilter";
import { SightingsList } from "../SightingsList";

interface GroupSightingsProps {
	group: Group;
}

export function GroupSightings({ group }: GroupSightingsProps) {
	const { t } = useTranslation();
	const now = new Date();
	const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [viewMode, setViewMode] = useState<"month" | "year">("month");

	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [members, setMembers] = useState<Map<string, UserProfile>>(new Map());
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
				const { sightings: newSightings, lastVisible: newCursor } =
					await getGroupSightings(
						group.memberIds,
						startDate,
						endDate,
						20,
						cursor,
					);

				if (isInitial) {
					// Also fetch members on initial load
					const membersData = await getGroupMembers(group.memberIds);
					const membersMap = new Map<string, UserProfile>();
					membersData.forEach((member) => {
						membersMap.set(member.id, member);
					});
					setMembers(membersMap);
					setSightings(newSightings);
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
		[group.memberIds, selectedMonth, selectedYear, viewMode, t],
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
				<MonthYearFilter
					viewMode={viewMode}
					setViewMode={setViewMode}
					selectedMonth={selectedMonth}
					setSelectedMonth={setSelectedMonth}
					selectedYear={selectedYear}
					setSelectedYear={setSelectedYear}
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
