import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en.json";
import fiTranslation from "./locales/fi.json";

const resources = {
	en: {
		translation: enTranslation,
	},
	fi: {
		translation: fiTranslation,
	},
};

// Get language from localStorage or use Finnish as default
const getInitialLanguage = () => {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem("language");
		if (stored) return stored;
	}
	return "fi";
};

i18n.use(initReactI18next).init({
	resources,
	lng: getInitialLanguage(),
	fallbackLng: "fi",
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
