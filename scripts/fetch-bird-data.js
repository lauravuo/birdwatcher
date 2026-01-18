import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const birdsPath = path.join(__dirname, "../src/data/birds.json");
const localesPath = path.join(__dirname, "../src/locales/fi.json");

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to save
function saveBirds(data) {
	fs.writeFileSync(birdsPath, JSON.stringify(data, null, "\t"));
}

const TARGET_WIDTH = 640;

function getResizedUrl(url, width = TARGET_WIDTH) {
	if (!url) return null;
	if (!url.includes("upload.wikimedia.org")) return url;

	// Pattern 1: Already a thumbnail
	// .../commons/thumb/a/ab/File.jpg/1280px-File.jpg
	if (url.includes("/thumb/")) {
		return url.replace(/\/(\d+)px-/, `/${width}px-`);
	}

	// Pattern 2: Original file
	// .../commons/a/ab/File.jpg
	// Target: .../commons/thumb/a/ab/File.jpg/640px-File.jpg
	// Need to handle extension correctly.
	// However, sometimes it's .../commons/a/ab/File.jpg
	// Thumb path: .../commons/thumb/a/ab/File.jpg/${width}px-File.jpg
	// Note: If SVG, thumb needs .png ending?
	// Wikimedia logic: /thumb/archive/a/ab/...
	// Simpler approach: Use the /thumb/ URL construction if we can identify parts.

	const parts = url.split("/commons/");
	if (parts.length === 2) {
		const pathAfterCommons = parts[1];
		// Ensure no other segments like /transcoded/
		const filename = pathAfterCommons.split("/").pop();
		return `${parts[0]}/commons/thumb/${pathAfterCommons}/${width}px-${filename}`;
	}

	return url;
}

async function main() {
	console.log("Starting bird data fetch...");

	const birdsData = JSON.parse(fs.readFileSync(birdsPath, "utf-8"));
	const localesData = JSON.parse(fs.readFileSync(localesPath, "utf-8"));
	const birdTranslations = localesData.birds;

	let updatedCount = 0;
	let errorCount = 0;

	for (let i = 0; i < birdsData.length; i++) {
		const bird = birdsData[i];

		let needsFetch = true;

		if (bird.wikiUrl && bird.imageUrl) {
			// Check if Image URL needs resizing
			const resized = getResizedUrl(bird.imageUrl);
			if (resized && resized !== bird.imageUrl) {
				bird.imageUrl = resized;
				updatedCount++;
				// console.log(`Resized image for ${bird.id}`);
			}
			needsFetch = false;
		}

		if (!needsFetch) {
			continue;
		}

		const birdName = birdTranslations[bird.id] || bird.id;
		if (!birdName) {
			console.warn(`No Finnish translation found for ID: ${bird.id}`);
			continue;
		}

		const wikiPageName = birdName.replace(/ /g, "_");
		const url = `https://fi.wikipedia.org/wiki/${encodeURIComponent(wikiPageName)}`;

		try {
			// Respect rate limits: 1 second delay
			await sleep(1000);

			console.log(`Fetching [${i + 1}/${birdsData.length}]: ${birdName}...`);

			const response = await fetch(url, {
				headers: {
					"User-Agent":
						"BirdWatcherProject/1.0 (https://github.com/lauravuo/birdwatcher; test@example.com)",
				},
			});

			if (response.status === 404) {
				console.error(`Page not found for ${birdName} (${bird.id}) at ${url}`);
				errorCount++;
				continue;
			}

			if (response.status === 429) {
				console.warn(`Rate limit hits for ${birdName}. Waiting 10 seconds...`);
				await sleep(10000);
				i--; // Retry this one
				continue;
			}

			if (!response.ok) {
				console.error(`Error fetching ${url}: ${response.status}`);
				errorCount++;
				continue;
			}

			const html = await response.text();

			// Extract Main Image (OG Image)
			// <meta property="og:image" content="https://upload.wikimedia.org/..." />
			const ogImageMatch = html.match(
				/<meta property="og:image" content="([^"]+)"/,
			);
			let imageUrl = ogImageMatch ? ogImageMatch[1] : null;

			// Filter out generic Wikipedia logo
			if (imageUrl && imageUrl.includes("Wikipedia-logo")) {
				imageUrl = null;
			}

			// Resize
			if (imageUrl) {
				imageUrl = getResizedUrl(imageUrl);
			}

			bird.wikiUrl = url;
			bird.imageUrl = imageUrl || undefined;

			if (imageUrl) {
				// console.log(`Image found for ${birdName}`);
			} else {
				console.warn(`No image found for ${birdName}`);
			}

			updatedCount++;

			// Save every 20 items to prevent data loss
			if (updatedCount % 20 === 0) {
				saveBirds(birdsData);
				console.log("...Data saved internally...");
			}
		} catch (err) {
			console.error(`Exception processing ${birdName}:`, err);
			errorCount++;
			// If network error, maybe wait longer
			await sleep(5000);
		}
	}

	// Final save
	saveBirds(birdsData);
	console.log(`\nFinished. Updated: ${updatedCount}, Errors: ${errorCount}`);
	console.log(`Data saved to ${birdsPath}`);
}

main().catch(console.error);
