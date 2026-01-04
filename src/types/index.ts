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
