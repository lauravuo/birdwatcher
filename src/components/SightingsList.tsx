import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import birdsData from "../data/birds.json";
import type { BirdMap, UserProfile } from "../types";
import type { Sighting } from "../types/sighting";

const birds = birdsData as BirdMap;

const VisualIcon = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		role="img"
		aria-label="Visual observation"
	>
		<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
		<circle cx="12" cy="12" r="3" />
	</svg>
);

const AudialIcon = () => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
		role="img"
		aria-label="Audial observation"
	>
		<path d="M11 5L6 9H2v6h4l5 4V5z" />
		<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
		<path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
	</svg>
);

const BothIcon = () => (
	<div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
		<VisualIcon />
		<AudialIcon />
	</div>
);

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

	const getObservationIcon = (type?: string) => {
		if (type === "visual") return <VisualIcon />;
		if (type === "audial") return <AudialIcon />;
		if (type === "both") return <BothIcon />;
		return null;
	};

	return (
		<div className="sightings-list-container">
			<ul className="sightings-list">
				{sightings.map((sighting) => {
					const birdName = t(`birds.${sighting.birdId}`);

					return (
						<li
							key={sighting.id}
							className="sighting-item"
							data-testid="sighting-item"
						>
							<Link
								to={`/groups/${groupId}/members/${sighting.userId}/sightings/${sighting.id}`}
								className="sighting-item-link"
							>
								{/* Background Image Container */}
								{birds[sighting.birdId]?.imageUrl ? (
									<img
										src={birds[sighting.birdId]?.imageUrl}
										alt=""
										className="sighting-bg"
										loading="lazy"
									/>
								) : (
									<div className="sighting-bg" />
								)}

								{/* Top Metadata */}
								<div className="sighting-meta-top">
									<div className="sighting-meta-top-right">
										<span
											className="sighting-date"
											title={
												sighting.type
													? getObservationTypeLabel(sighting.type)
													: undefined
											}
										>
											{getObservationIcon(sighting.type)}
											<span>{formatDate(sighting.date)}</span>
										</span>
									</div>
								</div>

								{/* Bottom Metadata */}
								<div className="sighting-meta-bottom">
									<h3 className="sighting-bird-name">{birdName}</h3>
									{showMemberName &&
										members &&
										members.get(sighting.userId) && (
											<div className="sighting-user-avatar">
												{members.get(sighting.userId)?.photoURL ? (
													<img
														src={
															members.get(sighting.userId)?.photoURL ||
															undefined
														}
														alt={members.get(sighting.userId)?.displayName}
														className="avatar-img"
													/>
												) : (
													<span className="avatar-fallback">👤</span>
												)}
											</div>
										)}
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
