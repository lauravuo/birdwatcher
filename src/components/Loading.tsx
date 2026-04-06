import { useTranslation } from "react-i18next";
import "./Loading.css";

export function Loading() {
	const { t } = useTranslation();

	return (
		<div className="loading-container" data-testid="loading-spinner">
			<div className="loading-content">
				<div className="bird-loader">
					<div className="bird-body" />
					<div className="bird-wing" />
				</div>
				<p className="loading-text">{t("app.loading_message")}</p>
			</div>
		</div>
	);
}
