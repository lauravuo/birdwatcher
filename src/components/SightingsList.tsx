import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
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

	const getVideoIcon = (type: string) => {
		if (type === "visual") return "👁️ "; // visual
		if (type === "audial") return "👂 ";
		if (type === "both") return "👁️👂 ";
		return "👁️ "; // fallback
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
								style={{
									textDecoration: "none",
									color: "inherit",
									display: "block",
								}}
							>
								<div className="sighting-header">
									<span className="bird-name">{birdName}</span>
									<span className="sighting-date">
										{formatDate(sighting.date, sighting.time)}
									</span>
								</div>

								<div className="sighting-meta">
									<span className="observation-type">
										{getVideoIcon(sighting.type)}
										{getObservationTypeLabel(sighting.type)}
									</span>
									{showMemberName && members && (
										<span className="sighting-user">
											👤{" "}
											{members.get(sighting.userId)?.displayName ||
												t("common.anonymous")}
										</span>
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
