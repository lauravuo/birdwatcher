import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LATEST_FIRSTS_COUNT } from "../../constants";
import { db } from "../../lib/firebase";
import type { Group, GroupYearlyStats, UserProfile } from "../../types";
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
					const data = snapshot.data() as GroupYearlyStats;
					const latestFirsts = data.latestFirsts || [];
					const mockSightings: Sighting[] = latestFirsts.map((first) => ({
						id: first.sightingId,
						birdId: first.birdId,
						date: first.date,
						time: "12:00", // Placeholder for UI
						type: "visual",
						userId: first.userId,
						createdAt: first.createdAt,
					}));
					setSightings(mockSightings.slice(0, LATEST_FIRSTS_COUNT));
				} else {
					setSightings([]);
				}
				setLoading(false);
			},
			(err) => {
				console.error("📡 GroupFirstSightings: error", err);
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
			<h3 className="leaderboard-section-title">
				{t("leaderboard.latestFirsts")}
			</h3>
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
