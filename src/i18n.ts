import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Get language from localStorage or use Finnish as default
const getInitialLanguage = () => {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem("language");
		if (stored) return stored;
	}
	return "fi";
};

// Initial setup with empty resources - we will load them as needed
i18n.use(initReactI18next).init({
	resources: {},
	lng: getInitialLanguage(),
	fallbackLng: "fi",
	interpolation: {
		escapeValue: false,
	},
});

// Helper to load and add resource bundle
const loadResources = async (lng: string) => {
	if (!i18n.hasResourceBundle(lng, "translation")) {
		const data = await import(`./locales/${lng}.json`);
		i18n.addResourceBundle(lng, "translation", data.default || data);
	}
};

// Initialize with current language
loadResources(getInitialLanguage());

// Hook into language change to load new resources
i18n.on("languageChanged", (lng) => {
	loadResources(lng);
});

export default i18n;
