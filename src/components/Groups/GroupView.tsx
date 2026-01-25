import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { db } from "../../lib/firebase";
import { getGroupMembers, getUsersStats } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import { GroupLeaderboard } from "./GroupLeaderboard";
import { GroupMembersList } from "./GroupMembersList";
import { GroupSightings } from "./GroupSightings";

export function GroupView() {
	const { t } = useTranslation();
	const { groupId } = useParams<{ groupId: string }>();
	const [group, setGroup] = useState<Group | null>(null);
	const [members, setMembers] = useState<UserProfile[]>([]);
	const [userStats, setUserStats] = useState<
		Map<string, Record<string, string[]>>
	>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"stats" | "sightings" | "members">(
		"stats",
	);

	const currentYear = new Date().getFullYear();

	// Fetch Group, Members, and Stats
	useEffect(() => {
		if (!groupId) return;

		let isMounted = true;

		async function fetchData(id: string) {
			try {
				// Fetch Group
				const groupRef = doc(db, "groups", id);
				const groupSnap = await getDoc(groupRef);

				if (!groupSnap.exists()) {
					if (isMounted) {
						setError(t("errors.groupNotFound"));
						setLoading(false);
					}
					return;
				}

				const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;

				if (isMounted) {
					setGroup(groupData);
				}

				// Fetch Members and Stats in parallel
				const [membersData, statsData] = await Promise.all([
					getGroupMembers(groupData.memberIds),
					getUsersStats(groupData.memberIds, currentYear),
				]);

				if (isMounted) {
					setMembers(membersData);
					setUserStats(statsData);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.error("Failed to fetch group data:", err);
					setError(t("groupMembers.failedToLoadMembers"));
					setLoading(false);
				}
			}
		}

		fetchData(groupId);

		return () => {
			isMounted = false;
		};
	}, [groupId, currentYear, t]);

	if (loading) return <div>{t("groupMembers.loadingMembers")}</div>;
	if (error) return <div className="error-message">{error}</div>;
	if (!group) return <div>{t("errors.groupNotFound")}</div>;

	return (
		<div className="group-view-container">
			<div className="tabs-container">
				<button
					type="button"
					className={`tab-button ${activeTab === "stats" ? "active" : ""}`}
					onClick={() => setActiveTab("stats")}
					data-testid="tab-stats"
				>
					{t("groupView.tabs.stats")}
				</button>
				<button
					type="button"
					className={`tab-button ${activeTab === "sightings" ? "active" : ""}`}
					onClick={() => setActiveTab("sightings")}
					data-testid="tab-sightings"
				>
					{t("groupView.tabs.sightings")}
				</button>
				<button
					type="button"
					className={`tab-button ${activeTab === "members" ? "active" : ""}`}
					onClick={() => setActiveTab("members")}
					data-testid="tab-members"
				>
					{t("groupView.tabs.members")}
				</button>
			</div>

			<div className="tab-content">
				{activeTab === "stats" && (
					<GroupLeaderboard
						group={group}
						members={members}
						userStats={userStats}
					/>
				)}
				{activeTab === "sightings" && <GroupSightings group={group} />}
				{activeTab === "members" && (
					<GroupMembersList
						group={group}
						members={members}
						userStats={userStats}
					/>
				)}
			</div>
		</div>
	);
}
