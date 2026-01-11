import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import type { Group } from "../types";

export function useUserGroups() {
	const { currentUser } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!currentUser) {
			setGroups([]);
			setLoading(false);
			return;
		}

		const q = query(
			collection(db, "groups"),
			where("memberIds", "array-contains", currentUser.uid),
		);

		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const userGroups = snapshot.docs.map((d) => ({
					id: d.id,
					...(d.data() as Omit<Group, "id">),
				})) as Group[];
				setGroups(userGroups);
				setLoading(false);
			},
			(err) => {
				console.error("useUserGroups onSnapshot error:", err);
				setError(err as Error);
				setLoading(false);
			},
		);

		return () => {
			unsubscribe();
		};
	}, [currentUser]);

	return { groups, loading, error };
}
