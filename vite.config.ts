import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
					vendor: [
						"react",
						"react-dom",
						"react-router-dom",
						"react-i18next",
						"i18next",
					],
				},
			},
		},
		chunkSizeWarningLimit: 600,
	},
});
