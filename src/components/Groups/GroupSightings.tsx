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
				const cursor = isInitial
					? undefined
					: (lastVisibleRef.current ?? undefined);
				const { sightings: newSightings, lastVisible: newCursor } =
					await getGroupSightings(group.memberIds, 20, cursor);

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
		[group.memberIds, t],
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
	);
}
