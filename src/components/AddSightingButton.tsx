import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AddSighting from "./AddSighting";

export default function AddSightingButton({
	activeGroupId,
}: {
	activeGroupId: string;
}) {
	const [open, setOpen] = useState(false);
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { currentUser } = useAuth();

	// Keyboard handler for closing dialog
	const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape") setOpen(false);
		if (e.key === "Enter" || e.key === " ") e.stopPropagation();
	};

	const handleSubmit = () => {
		setOpen(false);
		if (currentUser) {
			navigate(`/groups/${activeGroupId}/members/${currentUser.uid}`);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="add-sighting-button"
				aria-label={t("addSighting.addSightingLabel")}
			>
				+
			</button>
			{open && (
				<div
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100vw",
						height: "100vh",
						background: "rgba(0,0,0,0.3)",
						zIndex: 1001,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
					onClick={() => setOpen(false)}
					onKeyDown={handleDialogKeyDown}
				>
					<div
						role="document"
						className="add-sighting-dialog"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Escape") setOpen(false);
						}}
					>
						<AddSighting
							activeGroupId={activeGroupId}
							onSubmit={handleSubmit}
						/>
					</div>
				</div>
			)}
		</>
	);
}
