import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../lib/firebase";
import type { Group, UserProfile } from "../../types";
import type { Sighting } from "../../types/sighting";
import { SightingsList } from "../SightingsList";

interface GroupFirstSightingsProps {
	group: Group;
	members: UserProfile[];
	year: number;
}

export function GroupFirstSightings({
	group,
	members,
	year,
}: GroupFirstSightingsProps) {
	const { t } = useTranslation();
	const [sightings, setSightings] = useState<Sighting[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const docRef = doc(db, "group_yearly_stats", `${group.id}_${year}`);
		const unsubscribe = onSnapshot(
			docRef,
			(snapshot) => {
				if (snapshot.exists()) {
					const data = snapshot.data();
					const latestFirsts = data.latestFirsts || [];
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const mockSightings: Sighting[] = latestFirsts.map((first: any) => ({
						id: first.sightingId,
						birdId: first.birdId,
						userId: first.userId,
						date: first.date,
						createdAt: first.createdAt,
						// Required fields with mock data suitable for SightingsList
						time: "00:00",
						type: "visual",
						latitude: 0,
						longitude: 0,
						locationName: "",
					}));
					setSightings(mockSightings);
				} else {
					setSightings([]);
				}
				setLoading(false);
			},
			(err) => {
				console.error("Failed to load group first sightings", err);
				setLoading(false);
			},
		);

		return () => unsubscribe();
	}, [group.id, year]);

	const membersMap = new Map<string, UserProfile>();
	members.forEach((member) => {
		membersMap.set(member.id, member);
	});

	if (loading) {
		return <div className="loading-state">{t("common.loading")}</div>;
	}

	if (sightings.length === 0) {
		return null;
	}

	return (
		<div className="leaderboard-section">
			<h4 className="leaderboard-section-title">
				{t("leaderboard.latestFirsts", { year })}
			</h4>
			<SightingsList
				sightings={sightings}
				hasMore={false}
				loadingMore={false}
				onLoadMore={() => {}}
				showMemberName={true}
				members={membersMap}
			/>
		</div>
	);
}
