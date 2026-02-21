import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import birdsData from "../data/birds.json";
import type { BirdMap, UserProfile } from "../types";
import type { Sighting } from "../types/sighting";

const birds = birdsData as BirdMap;

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
	const { groupId } = useParams<{ groupId: string }>();

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

	const getObservationTypeIcon = (type: string) => {
		if (type === "visual") return "👁️";
		if (type === "audial") return "👂";
		if (type === "both") return "👁️👂";
		return "👁️";
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
			<ul className="sightings-grid">
				{sightings.map((sighting) => {
					const birdName = t(`birds.${sighting.birdId}`);
					const birdData = birds[sighting.birdId];
					const member = members?.get(sighting.userId);

					return (
						<li
							key={sighting.id}
							className="sighting-card"
							data-testid="sighting-item"
						>
							<Link
								to={`/groups/${groupId}/members/${sighting.userId}/sightings/${sighting.id}`}
								className="sighting-card-link"
							>
								<div className="sighting-card-image-wrapper">
									{birdData?.imageUrl ? (
										<img
											src={birdData.imageUrl}
											alt={birdName}
											className="sighting-card-image"
										/>
									) : (
										<div className="sighting-card-image-placeholder">🐦</div>
									)}
									<div className="sighting-card-gradient" />

									<span
										role="img"
										className="sighting-card-type-badge"
										aria-label={getObservationTypeLabel(sighting.type)}
										title={getObservationTypeLabel(sighting.type)}
									>
										{getObservationTypeIcon(sighting.type)}
									</span>

									{showMemberName && member && (
										<span
											className="sighting-card-avatar"
											title={member.displayName || t("common.anonymous")}
										>
											{member.photoURL ? (
												<img
													src={member.photoURL}
													alt={member.displayName || t("common.anonymous")}
													className="sighting-card-avatar-img"
												/>
											) : (
												<span className="sighting-card-avatar-fallback">
													👤
												</span>
											)}
										</span>
									)}
								</div>

								<div className="sighting-card-footer">
									<span className="sighting-card-bird-name">{birdName}</span>
									<span className="sighting-card-date">
										{formatDate(sighting.date, sighting.time)}
									</span>
								</div>
							</Link>
						</li>
					);
				})}
			</ul>
			{hasMore && (
				<div className="load-more-container">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={loadingMore}
						className="load-more-button"
					>
						{loadingMore ? t("common.loading") : t("common.loadMore")}
					</button>
				</div>
			)}
		</div>
	);
}
