import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getBirds } from "../lib/birds";
import { deleteSighting, getSighting, getUserProfile } from "../lib/firestore";
import type { BirdMap, UserProfile } from "../types";
import type { Sighting } from "../types/sighting";
import AddSighting from "./AddSighting";

export function SightingDetails() {
	const { t, i18n } = useTranslation();
	const { sightingId, groupId } = useParams<{
		sightingId: string;
		groupId?: string;
	}>();
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [birds, setBirds] = useState<BirdMap | null>(null);

	useEffect(() => {
		getBirds().then(setBirds);
	}, []);

	const [sighting, setSighting] = useState<Sighting | null>(null);
	const [user, setUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		if (!sightingId || !birds) return;

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
	}, [sightingId, t, birds]);

	if (!birds) return null;

	const formatDate = (dateString: string, timeString?: string) => {
		const date = new Date(`${dateString}T00:00:00`);
		const dateFormatted = date.toLocaleDateString(i18n.language, {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
		if (timeString) {
			return `${dateFormatted} ${t("common.at")} ${timeString}`;
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

	const handleDelete = async () => {
		if (!sighting || !currentUser || !sighting.id) return;
		if (window.confirm(t("common.confirmDelete"))) {
			try {
				await deleteSighting(sighting.id, currentUser.uid);
				// Go back to previous page or group view
				navigate(-1);
			} catch (err) {
				console.error("Failed to delete sighting", err);
				alert(t("errors.generic"));
			}
		}
	};

	const handleEditSuccess = () => {
		setIsEditing(false);
		// Sighting updated, reload data would happen if we used a listener,
		// or simpler: reload page to ensure fresh state
		window.location.reload();
	};

	if (loading) return <div>{t("common.loading")}</div>;
	if (error) return <div className="error-message">{error}</div>;
	if (!sighting) return <div>{t("errors.sightingNotFound")}</div>;

	const birdName = t(`birds.${sighting.birdId}`);
	const isOwner = currentUser && currentUser.uid === sighting.userId;
	const birdData = birds[sighting.birdId];

	if (isEditing) {
		return (
			<div className="sighting-details-container">
				<div className="card sighting-card-large">
					<button
						type="button"
						className="back-btn"
						onClick={() => setIsEditing(false)}
						style={{ marginBottom: "1rem" }}
					>
						← {t("common.cancel")}
					</button>
					<AddSighting
						activeGroupId={groupId || ""}
						onSubmit={handleEditSuccess}
						initialSighting={sighting}
						isEditing={true}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="sighting-details-container">
			<div className="card sighting-card-large">
				{/* Bird Image */}
				{birdData?.imageUrl && (
					<div className="bird-image-container">
						{birdData.wikiUrl ? (
							<a
								href={birdData.wikiUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="bird-image-link"
							>
								<img
									src={birdData.imageUrl}
									alt={birdName}
									className="bird-image"
								/>
							</a>
						) : (
							<img
								src={birdData.imageUrl}
								alt={birdName}
								className="bird-image"
							/>
						)}
						<div className="bird-image-attribution">
							{t("sightingDetails.imageBy")} {birdData.imageAuthor}
							{birdData.imageLicense && (
								<>
									{" • "}
									{t("sightingDetails.license")}:{" "}
									{birdData.imageLicenseUrl ? (
										<a
											href={birdData.imageLicenseUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											{birdData.imageLicense}
										</a>
									) : (
										birdData.imageLicense
									)}
								</>
							)}
							{birdData.wikiUrl && (
								<>
									{" • "}
									<a
										href={birdData.wikiUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										{t("sightingDetails.moreInfo")}
									</a>
								</>
							)}
						</div>
					</div>
				)}

				<div className="sighting-header-large">
					<h2>{birdName}</h2>
					<span className="sighting-type-badge">
						{sighting.type
							? getObservationTypeLabel(sighting.type)
							: t("addSighting.notSpecified")}
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
							<span className="detail-label">👤 {t("common.observer")}</span>
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

				{/* Edit/Delete Actions */}
				{isOwner && (
					<div className="sighting-actions" style={{ marginTop: "2rem" }}>
						<button
							type="button"
							className="action-btn edit-btn"
							onClick={() => setIsEditing(true)}
							style={{ marginRight: "1rem" }}
						>
							✏️ {t("common.edit")}
						</button>
						<button
							type="button"
							className="action-btn delete-btn"
							onClick={handleDelete}
						>
							🗑️ {t("common.delete")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
