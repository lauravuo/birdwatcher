import type { BirdMap } from "../types";

let birdsPromise: Promise<BirdMap> | null = null;

/**
 * Loads bird data asynchronously.
 * Results are cached in memory after the first load.
 */
export async function getBirds(): Promise<BirdMap> {
	if (!birdsPromise) {
		birdsPromise = import("../data/birds.json").then(
			(m) => m.default as BirdMap,
		);
	}
	return birdsPromise;
}
