import { useEffect, useState } from "react";

/**
 * Calculates available species based on stats and selected timeframe.
 *
 * @param stats - A Record (for single user) or Map (for multiple users) of stats.
 *                Structure: Record<"YYYY-MM", birdId[]> or Map<userId, Record<"YYYY-MM", birdId[]>>
 * @param selectedYear - The currently selected year (number).
 * @param selectedMonth - The currently selected month (0-11) or null for "Any".
 * @returns Sorted array of unique birdIds available in the selected period.
 */
export function useAvailableSpecies(
	stats:
		| Record<string, string[]> // Single user stats
		| Map<string, Record<string, string[]>>, // Multi-user stats (group)
	selectedYear: number,
	selectedMonth: number | null,
) {
	const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);

	useEffect(() => {
		const species = new Set<string>();

		// Helper to process a single user's stats object
		const processStats = (userStats: Record<string, string[]>) => {
			Object.entries(userStats).forEach(([dateKey, birds]) => {
				const [y, m] = dateKey.split("-").map(Number);

				// Filter by Year
				if (y !== selectedYear) return;

				// Filter by Month (if not "Any")
				// month in stats is 1-based (01..12), selectedMonth is 0-based (0..11)
				if (selectedMonth !== null) {
					if (m !== selectedMonth + 1) return;
				}

				birds.forEach((bird) => {
					species.add(bird);
				});
			});
		};

		if (stats instanceof Map) {
			// Handle Map (Group View)
			stats.forEach((userStats) => {
				processStats(userStats);
			});
		} else {
			// Handle Record (User View)
			processStats(stats);
		}

		setAvailableSpecies(Array.from(species).sort());
	}, [stats, selectedYear, selectedMonth]);

	return availableSpecies;
}
