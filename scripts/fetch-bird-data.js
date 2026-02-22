import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const birdsPath = path.join(__dirname, "../src/data/birds.json");
const localesPath = path.join(__dirname, "../src/locales/fi.json");

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to save
function saveBirds(data) {
	// Convert array to Map/Object with id as key
	const birdsMap = {};
	data.forEach((bird) => {
		birdsMap[bird.id] = bird;
	});
	fs.writeFileSync(birdsPath, JSON.stringify(birdsMap, null, "\t"));
}

const TARGET_WIDTH = 640;

// Check if URL is from Wikimedia reliably
function isWikimediaUrl(url) {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return (
			parsed.hostname === "wikimedia.org" ||
			parsed.hostname.endsWith(".wikimedia.org")
		);
	} catch (_e) {
		return false;
	}
}

// Extract filename for API query
function getWikimediaFilename(url) {
	if (!url) return null;
	try {
		// .../commons/thumb/a/ab/File_Name.jpg/640px-File_Name.jpg
		// .../commons/a/ab/File_Name.jpg
		const decoded = decodeURIComponent(url);
		const parts = decoded.split("/");
		// Usually the filename is the last part, but for thumbs strictly it might be the one before last if using the /thumb/ archive path?
		// Actually, for standard thumb urls: .../File.jpg/WIDTHpx-File.jpg -> The last part is the thumb name.
		// We want the original filename "File.jpg".

		const filename = parts.pop();
		if (filename.match(/^\d+px-/)) {
			// It's a thumb, remove the prefix or take the part before it?
			// Actually, in .../File.jpg/640px-File.jpg, the segment BEFORE the last one is the original filename.
			// Let's look at the structure again.
			// /wikipedia/commons/thumb/3/3f/Long-tailed-duck_%28cropped%29.jpg/640px-Long-tailed-duck_%28cropped%29.jpg
			// The segment before the last one is "Long-tailed-duck_%28cropped%29.jpg".
			if (url.includes("/thumb/")) {
				return parts.pop();
			}
		}
		return filename;
	} catch (_e) {
		return null;
	}
}

// Safely strip HTML tags by repeatedly removing them until none remain
function stripHtml(text) {
	if (!text) return "";
	let result = text;
	let prev = "";
	// Keep removing tags until no more tags are found
	while (result !== prev && result.includes("<")) {
		prev = result;
		result = result.replace(/<[^>]*>/g, "");
	}
	return result.trim();
}

async function fetchWikimediaImageInfo(filename, width = TARGET_WIDTH) {
	if (!filename) return null;

	const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${width}&titles=File:${encodeURIComponent(filename)}&format=json`;

	try {
		const res = await fetch(apiUrl, {
			headers: { "User-Agent": "BirdWatcherProject/1.0 (test@example.com)" },
		});
		const data = await res.json();
		const pages = data?.query?.pages;
		if (!pages) return null;

		const pageId = Object.keys(pages)[0];
		if (pageId === "-1") return null;

		const imageinfo = pages[pageId]?.imageinfo?.[0];
		if (!imageinfo) return null;

		const metadata = imageinfo.extmetadata || {};

		return {
			thumbUrl: imageinfo.thumburl || imageinfo.url,
			author: stripHtml(metadata.Artist?.value) || "Unknown",
			license: metadata.LicenseShortName?.value || "Unknown",
			licenseUrl: metadata.LicenseUrl?.value,
		};
	} catch (e) {
		console.warn(`Failed to fetch image info for ${filename}`, e);
		return null;
	}
}

async function main() {
	console.log("Starting bird data fetch...");

	const birdsData = JSON.parse(fs.readFileSync(birdsPath, "utf-8"));

	// Convert Map/Object to array for processing
	const birdsArray = Object.values(birdsData);

	const localesData = JSON.parse(fs.readFileSync(localesPath, "utf-8"));
	const birdTranslations = localesData.birds;

	let updatedCount = 0;

	// Process in batches/sequentially
	for (let i = 0; i < birdsArray.length; i++) {
		const bird = birdsArray[i];
		let changed = false;

		// 1. Fetch Basic Info if missing
		const hasBasicInfo = bird.wikiUrl && bird.imageUrl;
		let imageUrl = bird.imageUrl;

		if (!hasBasicInfo) {
			const birdName = birdTranslations[bird.id] || bird.id;
			if (birdName) {
				const wikiPageName = birdName.replace(/ /g, "_");
				const url = `https://fi.wikipedia.org/wiki/${encodeURIComponent(wikiPageName)}`;

				try {
					await sleep(1000);
					console.log(
						`Fetching page [${i + 1}/${birdsData.length}]: ${birdName}...`,
					);

					const response = await fetch(url, {
						headers: {
							"User-Agent":
								"BirdWatcherProject/1.0 (https://github.com/lauravuo/birdwatcher; test@example.com)",
						},
					});

					if (response.ok) {
						const html = await response.text();
						const ogImageMatch = html.match(
							/<meta property="og:image" content="([^"]+)"/,
						);
						const foundImage = ogImageMatch ? ogImageMatch[1] : null;

						if (foundImage && !foundImage.includes("Wikipedia-logo")) {
							imageUrl = foundImage;
							bird.wikiUrl = url;
							changed = true;
						} else {
							bird.wikiUrl = url; // Save URL even if no image
							changed = true;
						}
					} else if (response.status === 429) {
						console.warn("Rate limit. Waiting...");
						await sleep(5000);
						i--;
						continue;
					}
				} catch (e) {
					console.error(`Error fetching page ${birdName}:`, e);
				}
			}
		}

		// 2. Refresh Image URL and Attribution from Wikimedia API
		if (isWikimediaUrl(imageUrl)) {
			const filename = getWikimediaFilename(imageUrl);
			if (filename) {
				await sleep(150); // Small delay to avoid 429 Too Many Requests
				const info = await fetchWikimediaImageInfo(filename);
				if (info) {
					if (bird.imageUrl !== info.thumbUrl) {
						bird.imageUrl = info.thumbUrl;
						changed = true;
					}
					if (
						bird.imageAuthor !== info.author ||
						bird.imageLicense !== info.license ||
						bird.imageLicenseUrl !== info.licenseUrl
					) {
						bird.imageAuthor = info.author;
						bird.imageLicense = info.license;
						bird.imageLicenseUrl = info.licenseUrl;
						changed = true;
					}
				}
			}
		}

		if (changed) {
			updatedCount++;
			if (updatedCount % 10 === 0) {
				saveBirds(birdsArray);
				console.log(`Saved progress (${updatedCount} updated)...`);
			}
		}
	}

	saveBirds(birdsArray);
	console.log(`\nFinished. Total updated: ${updatedCount}`);
}

main().catch(console.error);
