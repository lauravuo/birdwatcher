export interface Sighting {
	id?: string;
	userId: string;
	birdId: string;
	date: string; // YYYY-MM-DD
	time?: string; // HH:MM (24-hour format)
	type: "visual" | "audial" | "both";
	latitude?: number;
	longitude?: number;
	locationName?: string;
	notes?: string;
	createdAt: number;
}
