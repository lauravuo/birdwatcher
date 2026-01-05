import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import birds from "../data/birds.json";
import { addSighting } from "../lib/firestore";

const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

const observationTypes = [
	{ value: "visual", label: "Visual" },
	{ value: "audial", label: "Audial" },
	{ value: "both", label: "Both" },
];

export default function AddSighting({ onSubmit }: { onSubmit?: () => void }) {
	const { t } = useTranslation();
	const { currentUser } = useAuth();
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
	const [notes, setNotes] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const filteredBirds = birds
		.filter((b) =>
			t(`birds.${b.id}`).toLowerCase().includes(birdFilter.toLowerCase()),
		)
		.slice(0, 20); // Limit to 20 results for performance

	const selectedBirdName = selectedBird ? t(`birds.${selectedBird}`) : "";

	// Check if all required fields are filled
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

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlightedIndex((prev) =>
				prev < filteredBirds.length - 1 ? prev + 1 : prev,
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
		} else if (e.key === "Enter" && highlightedIndex >= 0) {
			e.preventDefault();
			handleBirdSelect(filteredBirds[highlightedIndex].id);
		} else if (e.key === "Escape") {
			setIsDropdownOpen(false);
			inputRef.current?.blur();
		}
	};

	const handleGetLocation = () => {
		if (!navigator.geolocation) {
			setLocationError(t("addSighting.locationNotSupported"));
			return;
		}

		setIsGettingLocation(true);
		setLocationError(null);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLatitude(position.coords.latitude);
				setLongitude(position.coords.longitude);
				setIsGettingLocation(false);
			},
			(error) => {
				setIsGettingLocation(false);
				let errorMessage = t("addSighting.locationError");
				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage = t("addSighting.locationPermissionDenied");
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = t("addSighting.locationUnavailable");
						break;
					case error.TIMEOUT:
						errorMessage = t("addSighting.locationTimeout");
						break;
				}
				setLocationError(errorMessage);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0,
			},
		);
	};

	const handleClearLocation = () => {
		setLatitude(undefined);
		setLongitude(undefined);
		setLocationName("");
		setLocationError(null);
	};

	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser || !selectedBird) return;

		setSubmitError(null);
		setIsSubmitting(true);

		try {
			await addSighting({
				userId: currentUser.uid,
				birdId: selectedBird,
				date,
				time: time || undefined,
				type: observationType as "visual" | "audial" | "both",
				latitude: latitude !== undefined ? latitude : undefined,
				longitude: longitude !== undefined ? longitude : undefined,
				locationName: locationName.trim() || undefined,
				notes: notes.trim() || undefined,
			});
			// Dispatch event to refresh sightings list
			window.dispatchEvent(new CustomEvent("sightingAdded"));
			if (onSubmit) onSubmit();
		} catch (error) {
			console.error("Failed to add sighting:", error);
			setSubmitError(
				error instanceof Error
					? error.message
					: t("addSighting.submitError") || "Failed to add sighting",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="add-sighting-form">
			<label htmlFor="bird-input">{t("addSighting.bird")}</label>
			<div className="bird-autocomplete">
				<input
					ref={inputRef}
					id="bird-input"
					type="text"
					placeholder={t("addSighting.filterBird")}
					value={selectedBird ? selectedBirdName : birdFilter}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onKeyDown={handleKeyDown}
					required
					className="bird-input"
				/>
				{isDropdownOpen && filteredBirds.length > 0 && (
					<div ref={dropdownRef} className="bird-dropdown">
						{filteredBirds.map((bird, index) => {
							const birdName = t(`birds.${bird.id}`);
							return (
								<button
									key={bird.id}
									type="button"
									className={`bird-option ${
										index === highlightedIndex ? "highlighted" : ""
									} ${selectedBird === bird.id ? "selected" : ""}`}
									onClick={() => handleBirdSelect(bird.id)}
									onMouseEnter={() => setHighlightedIndex(index)}
								>
									{birdName}
								</button>
							);
						})}
					</div>
				)}
			</div>

			<label htmlFor="date-picker">{t("addSighting.date")}</label>
			<input
				id="date-picker"
				type="date"
				value={date}
				onChange={(e) => setDate(e.target.value)}
				required
				className="form-input"
			/>

			<label htmlFor="time-picker">{t("addSighting.time")}</label>
			<input
				id="time-picker"
				type="time"
				value={time}
				onChange={(e) => setTime(e.target.value)}
				className="form-input"
			/>

			<fieldset className="observation-type-fieldset">
				<legend>{t("addSighting.type")}</legend>
				{observationTypes.map((type) => (
					<label key={type.value} className="radio-label">
						<input
							type="radio"
							name="observationType"
							value={type.value}
							checked={observationType === type.value}
							onChange={() => setObservationType(type.value)}
							required
						/>
						{t(`addSighting.${type.value}`)}
					</label>
				))}
			</fieldset>

			<div className="location-section">
				<div className="location-label">{t("addSighting.location")}</div>
				<div className="location-controls">
					<button
						type="button"
						onClick={handleGetLocation}
						disabled={isGettingLocation}
						className="location-button"
					>
						{isGettingLocation
							? t("addSighting.gettingLocation")
							: t("addSighting.getCurrentLocation")}
					</button>
					{(latitude !== undefined || longitude !== undefined) && (
						<button
							type="button"
							onClick={handleClearLocation}
							className="location-clear-button"
						>
							{t("addSighting.clearLocation")}
						</button>
					)}
				</div>
				{locationError && <div className="location-error">{locationError}</div>}
				{(latitude !== undefined || longitude !== undefined) && (
					<div className="location-coordinates">
						<div className="coordinate-row">
							<label htmlFor="latitude-input">
								{t("addSighting.latitude")}:
							</label>
							<input
								id="latitude-input"
								type="number"
								step="any"
								value={latitude?.toFixed(6) || ""}
								onChange={(e) =>
									setLatitude(
										e.target.value ? parseFloat(e.target.value) : undefined,
									)
								}
								className="coordinate-input"
								placeholder="60.123456"
							/>
						</div>
						<div className="coordinate-row">
							<label htmlFor="longitude-input">
								{t("addSighting.longitude")}:
							</label>
							<input
								id="longitude-input"
								type="number"
								step="any"
								value={longitude?.toFixed(6) || ""}
								onChange={(e) =>
									setLongitude(
										e.target.value ? parseFloat(e.target.value) : undefined,
									)
								}
								className="coordinate-input"
								placeholder="24.123456"
							/>
						</div>
						<label htmlFor="location-name">
							{t("addSighting.locationName")} ({t("addSighting.optional")}):
						</label>
						<input
							id="location-name"
							type="text"
							value={locationName}
							onChange={(e) => setLocationName(e.target.value)}
							className="form-input"
							placeholder={t("addSighting.locationNamePlaceholder")}
						/>
					</div>
				)}
			</div>

			<label htmlFor="notes">{t("addSighting.notes")}</label>
			<textarea
				id="notes"
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				rows={3}
				className="form-textarea"
				placeholder={t("addSighting.notesPlaceholder")}
			/>

			{submitError && <div className="submit-error">{submitError}</div>}
			<button
				type="submit"
				className="submit-button"
				disabled={!isFormValid || isSubmitting}
			>
				{isSubmitting
					? t("addSighting.submitting") || "Submitting..."
					: t("addSighting.submit")}
			</button>
		</form>
	);
}
