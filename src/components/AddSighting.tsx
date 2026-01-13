import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import birds from "../data/birds.json";
import { addSighting, updateSighting } from "../lib/firestore";
import type { Sighting } from "../types/sighting";

const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

const observationTypes = [
	{ value: "visual", label: "Visual" },
	{ value: "audial", label: "Audial" },
	{ value: "both", label: "Both" },
];

export default function AddSighting({
	activeGroupId,
	onSubmit,
	initialSighting,
	isEditing = false,
}: {
	activeGroupId: string;
	onSubmit?: () => void;
	initialSighting?: Sighting;
	isEditing?: boolean;
}) {
	const { t } = useTranslation();
	const { currentUser } = useAuth();
	const navigate = useNavigate();
	const [birdFilter, setBirdFilter] = useState("");
	const [selectedBird, setSelectedBird] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [date, setDate] = useState(today);
	const [time, setTime] = useState(currentTime);
	const [observationType, setObservationType] = useState("audial");
	const [latitude, setLatitude] = useState<number | undefined>(undefined);
	const [longitude, setLongitude] = useState<number | undefined>(undefined);
	const [locationName, setLocationName] = useState("");
	const [isGettingLocation, setIsGettingLocation] = useState(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLUListElement>(null);
	const [submitting, setSubmitting] = useState(false);

	// Prefill state for editing
	useEffect(() => {
		if (initialSighting && isEditing) {
			setSelectedBird(initialSighting.birdId);
			setBirdFilter(t(`birds.${initialSighting.birdId}`));
			setDate(initialSighting.date);
			setTime(initialSighting.time || currentTime);
			setObservationType(initialSighting.type);
			setLatitude(initialSighting.latitude);
			setLongitude(initialSighting.longitude);
			setLocationName(initialSighting.locationName || "");
			setNotes(initialSighting.notes || "");
		}
	}, [initialSighting, isEditing, t]);

	const filteredBirds = birds
		.filter((b) =>
			t(`birds.${b.id}`).toLowerCase().includes(birdFilter.toLowerCase()),
		)
		.slice(0, 20);

	const isFormValid =
		selectedBird !== "" && date !== "" && observationType !== "";

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleInputFocus = () => {
		setIsDropdownOpen(true);
		setHighlightedIndex(-1);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setBirdFilter(value);
		setSelectedBird(""); // Clear selection when typing
		setIsDropdownOpen(true);
		setHighlightedIndex(-1);
	};

	const handleBirdSelect = (birdId: string) => {
		setSelectedBird(birdId);
		setBirdFilter(t(`birds.${birdId}`));
		setIsDropdownOpen(false);
		inputRef.current?.blur();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
			setIsDropdownOpen(true);
			return;
		}

		if (isDropdownOpen) {
			if (e.key === "ArrowDown") {
				setHighlightedIndex((prev) =>
					prev < filteredBirds.length - 1 ? prev + 1 : prev,
				);
			} else if (e.key === "ArrowUp") {
				setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
			} else if (e.key === "Enter" && highlightedIndex >= 0) {
				handleBirdSelect(filteredBirds[highlightedIndex].id);
			} else if (e.key === "Escape") {
				setIsDropdownOpen(false);
			}
		}
	};

	const handleGetLocation = () => {
		setIsGettingLocation(true);
		setLocationError(null);
		if (!navigator.geolocation) {
			setLocationError(t("errors.geolocationNotSupported"));
			setIsGettingLocation(false);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLatitude(position.coords.latitude);
				setLongitude(position.coords.longitude);
				setIsGettingLocation(false);
			},
			(error) => {
				console.error("Error getting location:", error);
				setLocationError(t("errors.locationPermissionDenied"));
				setIsGettingLocation(false);
			},
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser || !isFormValid) return;

		setSubmitting(true);
		setSubmitError(null);

		const sightingData: Omit<Sighting, "id" | "createdAt"> = {
			userId: currentUser.uid,
			birdId: selectedBird,
			date,
			time,
			type: observationType as "visual" | "audial" | "both",
			locationName,
			latitude,
			longitude,
			notes,
		};

		try {
			if (isEditing && initialSighting && initialSighting.id) {
				await updateSighting(initialSighting.id, sightingData);
			} else {
				await addSighting(sightingData);
			}

			// Wait for propagation
			await new Promise((resolve) => setTimeout(resolve, 200));

			if (onSubmit) {
				onSubmit();
			} else {
				// Default behavior for Add: navigate to user view
				navigate(`/groups/${activeGroupId}/members/${currentUser.uid}`);
			}
		} catch (error) {
			console.error("Error saving sighting:", error);
			setSubmitError(t("addSighting.submitError"));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="add-sighting-container">
			<h2>{isEditing ? t("common.edit") : t("addSighting.title")}</h2>
			<form
				onSubmit={handleSubmit}
				className="add-sighting-form"
				data-testid="add-sighting-form"
			>
				{/* Bird Selection */}
				<div className="form-group">
					<label htmlFor="bird-input">{t("addSighting.bird")}</label>
					<div className="autocomplete-wrapper">
						<input
							id="bird-input"
							ref={inputRef}
							type="text"
							value={birdFilter}
							onChange={handleInputChange}
							onFocus={handleInputFocus}
							onKeyDown={handleKeyDown}
							placeholder={t("addSighting.filterBird")}
							className="form-input"
							autoComplete="off"
							data-testid="bird-input"
						/>
						{isDropdownOpen && filteredBirds.length > 0 && (
							<ul className="autocomplete-dropdown" ref={dropdownRef}>
								{filteredBirds.map((bird, index) => (
									<li
										key={bird.id}
										onClick={() => handleBirdSelect(bird.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												handleBirdSelect(bird.id);
											}
										}}
										className={`bird-option ${
											index === highlightedIndex ? "highlighted" : ""
										}`}
									>
										{t(`birds.${bird.id}`)}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				{/* Date and Time */}
				<div className="form-row">
					<div className="form-group">
						<label htmlFor="date-input">{t("addSighting.date")}</label>
						<input
							id="date-input"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="form-input"
							max={today}
							required
						/>
					</div>
					<div className="form-group">
						<label htmlFor="time-input">{t("addSighting.time")}</label>
						<input
							id="time-input"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="form-input"
						/>
					</div>
				</div>

				{/* Observation Type */}
				<div className="form-group">
					<span className="label-text">{t("addSighting.type")}</span>
					<div className="radio-group">
						{observationTypes.map((type) => (
							<label
								key={type.value}
								htmlFor={`type-${type.value}`}
								className="radio-label"
							>
								<input
									id={`type-${type.value}`}
									type="radio"
									name="observationType"
									value={type.value}
									checked={observationType === type.value}
									onChange={(e) => setObservationType(e.target.value)}
								/>
								{t(`addSighting.${type.value}`)}
							</label>
						))}
					</div>
				</div>

				{/* Location */}
				<div className="form-group">
					<label htmlFor="location-input">{t("addSighting.location")}</label>
					<div className="location-inputs">
						<input
							id="location-input"
							type="text"
							value={locationName}
							onChange={(e) => setLocationName(e.target.value)}
							placeholder={t("addSighting.locationPlaceholder")}
							className="form-input"
						/>
						<button
							type="button"
							onClick={handleGetLocation}
							disabled={isGettingLocation}
							className="location-btn"
							data-testid="get-location-btn"
							title={t("addSighting.getLocation")}
						>
							📍
						</button>
					</div>
					{locationError && (
						<p className="error-message-small">{locationError}</p>
					)}
					{latitude && longitude && (
						<p className="location-coords">
							{latitude.toFixed(4)}, {longitude.toFixed(4)}
						</p>
					)}
				</div>

				{/* Notes */}
				<div className="form-group">
					<label htmlFor="notes">{t("addSighting.notes")}</label>
					<textarea
						id="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="form-input textarea"
						placeholder={t("addSighting.notesPlaceholder")}
						rows={3}
					/>
				</div>

				{submitError && (
					<div
						className="error-message"
						style={{ color: "red", marginBottom: "1rem" }}
					>
						{submitError}
					</div>
				)}

				{/* Actions */}
				<div className="form-actions">
					<button
						type="submit"
						disabled={!isFormValid || submitting}
						className="submit-btn"
						data-testid="submit-sighting-btn"
					>
						{submitting
							? t("common.saving")
							: isEditing
								? t("common.save")
								: t("addSighting.submit")}
					</button>
				</div>
			</form>
		</div>
	);
}
