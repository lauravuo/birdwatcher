import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupMembers, getGroupSightings } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import type { Sighting } from "../../types/sighting";

interface GroupSightingsProps {
	group: Group;
}

export function GroupSightings({ group }: GroupSightingsProps) {
	const { t, i18n } = useTranslation();
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

	const months = Array.from({ length: 12 }, (_, i) => {
		const date = new Date(2000, i, 1);
		return {
			value: i,
			label: date.toLocaleDateString(i18n.language, { month: "long" }),
		};
	});

	const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

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

				{sightings.length === 0 ? (
					<p className="no-sightings">{t("groupSightings.noSightings")}</p>
				) : (
					<ul className="sightings-list">
						{sightings.map((sighting) => {
							const member = members.get(sighting.userId);
							const memberName =
								member?.displayName || t("groupSightings.unknownUser");
							const birdName = t(`birds.${sighting.birdId}`);

							return (
								<li key={sighting.id} className="sighting-item">
									<div className="sighting-header">
										<div className="sighting-bird">
											<strong>{birdName}</strong>
										</div>
										<div className="sighting-meta">
											<span className="sighting-member">{memberName}</span>
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
						{loadingMore
							? t("common.loading", "Loading...")
							: t("common.loadMore", "Load More")}
					</button>
				)}
			</div>
		</div>
	);
}
