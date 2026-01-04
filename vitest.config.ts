/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom", // or jsdom
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
		setupFiles: ["./src/test/setup.ts"],
	},
});
