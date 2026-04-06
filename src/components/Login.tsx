import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
	const { login } = useAuth();
	const { t } = useTranslation();

	return (
		<div className="login-container">
			<h1>{t("login.title")}</h1>
			<p>{t("login.subtitle")}</p>
			<button type="button" onClick={login}>
				{t("login.signInGoogle")}
			</button>
		</div>
	);
}
