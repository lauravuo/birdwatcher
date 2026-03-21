export interface UserProfile {
	id: string;
	displayName: string;
	email: string;
	photoURL: string | null;
	groupIds: string[];
}

export interface Group {
	id: string;
	name: string;
	joinCode: string;
	ownerId: string;
	memberIds: string[];
	createdAt: number; // Timestamp
}

export interface Bird {
	id: string;
	wikiUrl?: string;
	imageUrl?: string;
	imageAuthor?: string;
	imageLicense?: string;
	imageLicenseUrl?: string;
}

export type BirdMap = Record<string, Bird>;

export interface GroupFirstSighting {
	birdId: string;
	sightingId: string;
	userId: string;
	date: string;
	createdAt: number;
}

export interface GroupYearlyStats {
	groupId: string;
	year: number;
	seenBirds: string[];
	latestFirsts: GroupFirstSighting[];
}
