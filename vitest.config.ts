/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom", // or jsdom
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
	},
});
