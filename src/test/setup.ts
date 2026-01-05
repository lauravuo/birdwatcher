import "@testing-library/jest-dom/vitest";
import i18n from "../i18n";

// Force English for all tests
beforeAll(async () => {
  await i18n.changeLanguage("en");
});
