import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { getSighting, getUserProfile } from "../lib/firestore";
import type { UserProfile } from "../types";
import type { Sighting } from "../types/sighting";

export function SightingDetails() {
	const { t, i18n } = useTranslation();
	const { sightingId } = useParams<{ sightingId: string }>();

	const [sighting, setSighting] = useState<Sighting | null>(null);
	const [user, setUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!sightingId) return;

		let isMounted = true;

		async function fetchData() {
			try {
				setLoading(true);
				const data = await getSighting(sightingId || "");

				if (isMounted) {
					if (!data) {
						setError(t("errors.sightingNotFound"));
					} else {
						setSighting(data);
						// Fetch user details for the sighting
						try {
							const userData = await getUserProfile(data.userId);
							if (isMounted) setUser(userData);
						} catch (e) {
							console.error("Failed to load user for sighting", e);
						}
					}
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.error("Failed to fetch sighting:", err);
					setError(t("errors.sightingNotFound"));
					setLoading(false);
				}
			}
		}

		fetchData();

		return () => {
			isMounted = false;
		};
	}, [sightingId, t]);

	const formatDate = (dateString: string, timeString?: string) => {
		const date = new Date(`${dateString}T00:00:00`);
		const dateFormatted = date.toLocaleDateString(i18n.language, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		if (timeString) {
			return `${dateFormatted} ${t("common.at", "at")} ${timeString}`;
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

	if (loading) return <div>{t("common.loading")}</div>;
	if (error) return <div className="error-message">{error}</div>;
	if (!sighting) return <div>{t("errors.sightingNotFound")}</div>;

	const birdName = t(`birds.${sighting.birdId}`);

	return (
		<div className="sighting-details-container">
			<div className="card sighting-card-large">
				<div className="sighting-header-large">
					<h2>{birdName}</h2>
					<span className="sighting-type-badge">
						{getObservationTypeLabel(sighting.type)}
					</span>
				</div>

				<div className="sighting-grid">
					{/* Row 1: Date & Time */}
					<div className="detail-item">
						<span className="detail-label">📅 {t("addSighting.date")}</span>
						<span className="detail-value">
							{formatDate(sighting.date, sighting.time)}
						</span>
					</div>

					{/* Row 1: Observer */}
					{user && (
						<div className="detail-item">
							<span className="detail-label">
								👤 {t("common.observer", "Observer")}
							</span>
							<span className="detail-value user-pill">
								{user.photoURL && (
									<img
										src={user.photoURL}
										alt={user.displayName}
										className="user-avatar-tiny"
									/>
								)}
								{user.displayName}
							</span>
						</div>
					)}

					{/* Row 2: Location */}
					{(sighting.locationName ||
						(sighting.latitude && sighting.longitude)) && (
						<div className="detail-item full-width">
							<span className="detail-label">
								📍 {t("addSighting.location")}
							</span>
							<div className="detail-value">
								{sighting.locationName && (
									<div className="location-name">{sighting.locationName}</div>
								)}
								{sighting.latitude && sighting.longitude && (
									<a
										href={`https://www.google.com/maps/search/?api=1&query=${sighting.latitude},${sighting.longitude}`}
										target="_blank"
										rel="noopener noreferrer"
										className="map-link"
									>
										{sighting.latitude.toFixed(6)},{" "}
										{sighting.longitude.toFixed(6)}
									</a>
								)}
							</div>
						</div>
					)}

					{/* Row 3: Notes */}
					{sighting.notes && (
						<div className="detail-item full-width">
							<span className="detail-label">📝 {t("addSighting.notes")}</span>
							<p className="sighting-notes-large">{sighting.notes}</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
