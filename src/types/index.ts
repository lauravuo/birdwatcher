export interface UserProfile {
	id: string;
	displayName: string;
	email: string;
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
