import { useTranslation } from "react-i18next";
import type { UserProfile } from "../types";
import type { Sighting } from "../types/sighting";

interface SightingsListProps {
	sightings: Sighting[];
	hasMore?: boolean;
	loadingMore?: boolean;
	onLoadMore?: () => void;
	showMemberName?: boolean;
	members?: Map<string, UserProfile>;
}

export function SightingsList({
	sightings,
	hasMore = false,
	loadingMore = false,
	onLoadMore,
	showMemberName = false,
	members,
}: SightingsListProps) {
	const { t, i18n } = useTranslation();

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

	if (sightings.length === 0) {
		return <p className="no-sightings">{t("userView.noSightings")}</p>;
	}

	return (
		<div className="sightings-list-container">
			<ul className="sightings-list">
				{sightings.map((sighting) => {
					const birdName = t(`birds.${sighting.birdId}`);
					const memberName = showMemberName
						? members?.get(sighting.userId)?.displayName ||
							t("groupSightings.unknownUser")
						: null;

					return (
						<li key={sighting.id} className="sighting-item">
							<div className="sighting-header">
								<div className="sighting-bird">
									<strong>{birdName}</strong>
								</div>
								<div className="sighting-meta">
									{showMemberName && (
										<span className="sighting-member">{memberName}</span>
									)}
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
			{hasMore && onLoadMore && (
				<button
					type="button"
					onClick={onLoadMore}
					className="load-more-button"
					disabled={loadingMore}
				>
					{loadingMore ? t("common.loading") : t("common.loadMore")}
				</button>
			)}
		</div>
	);
}
