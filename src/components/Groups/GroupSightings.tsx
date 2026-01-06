import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupMembers, getGroupSightings } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import type { Sighting } from "../../types/sighting";

interface GroupSightingsProps {
	group: Group;
}

export function GroupSightings({ group }: GroupSightingsProps) {
	const { t } = useTranslation();
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [members, setMembers] = useState<Map<string, UserProfile>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Fetch sightings and members in parallel
			const [sightingsData, membersData] = await Promise.all([
				getGroupSightings(group.memberIds),
				getGroupMembers(group.memberIds),
			]);

			setSightings(sightingsData);
			// Create a map for quick lookup
			const membersMap = new Map<string, UserProfile>();
			membersData.forEach((member) => {
				membersMap.set(member.id, member);
			});
			setMembers(membersMap);
			setLoading(false);
		} catch (err) {
			console.error("Failed to fetch sightings:", err);
			setError(t("groupSightings.failedToLoad"));
			setLoading(false);
		}
	}, [group.memberIds, t]);

	useEffect(() => {
		let isMounted = true;

		fetchData();

		// Listen for sighting added events
		const handleSightingAdded = () => {
			if (isMounted) {
				fetchData();
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
		</div>
	);
}
