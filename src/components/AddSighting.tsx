import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import birds from "../data/birds.json";
import { addSighting } from "../lib/firestore";

const today = new Date().toISOString().slice(0, 10);

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
	const [date, setDate] = useState(today);
	const [observationType, setObservationType] = useState("visual");
	const [notes, setNotes] = useState("");

	const filteredBirds = birds.filter((b) =>
		t(`birds.${b.id}`).toLowerCase().includes(birdFilter.toLowerCase()),
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		await addSighting({
			userId: currentUser.uid,
			birdId: selectedBird,
			date,
			type: observationType as "visual" | "audial" | "both",
			notes: notes.trim() || undefined,
		});
		if (onSubmit) onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto" }}>
			<label htmlFor="bird-filter">{t("addSighting.bird")}</label>
			<input
				id="bird-filter"
				type="text"
				placeholder={t("addSighting.filterBird")}
				value={birdFilter}
				onChange={(e) => setBirdFilter(e.target.value)}
				style={{ width: "100%" }}
			/>
			<label htmlFor="bird-select" style={{ marginTop: 8 }}>
				{t("addSighting.selectBird")}
			</label>
			<select
				id="bird-select"
				value={selectedBird}
				onChange={(e) => setSelectedBird(e.target.value)}
				required
				style={{ width: "100%", marginTop: 4 }}
			>
				<option value="" disabled>
					{t("addSighting.selectBird")}
				</option>
				{filteredBirds.map((bird) => (
					<option key={bird.id} value={bird.id}>
						{t(`birds.${bird.id}`)}
					</option>
				))}
			</select>

			<label htmlFor="date-picker" style={{ marginTop: 16 }}>
				{t("addSighting.date")}
			</label>
			<input
				id="date-picker"
				type="date"
				value={date}
				onChange={(e) => setDate(e.target.value)}
				style={{ width: "100%" }}
			/>

			<fieldset style={{ marginTop: 16, border: 0, padding: 0 }}>
				<legend>{t("addSighting.type")}</legend>
				{observationTypes.map((type) => (
					<label key={type.value} style={{ marginRight: 12 }}>
						<input
							type="radio"
							name="observationType"
							value={type.value}
							checked={observationType === type.value}
							onChange={() => setObservationType(type.value)}
						/>{" "}
						{t(`addSighting.${type.value}`)}
					</label>
				))}
			</fieldset>

			<label htmlFor="notes" style={{ marginTop: 16 }}>
				{t("addSighting.notes")}
			</label>
			<textarea
				id="notes"
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				rows={3}
				style={{ width: "100%" }}
				placeholder={t("addSighting.notesPlaceholder")}
			/>

			<button type="submit" style={{ marginTop: 20, width: "100%" }}>
				{t("addSighting.submit")}
			</button>
		</form>
	);
}
