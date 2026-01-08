import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { db } from "../../lib/firebase";
import { getGroupMembers } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import { GroupLeaderboard } from "./GroupLeaderboard";
import { GroupSightings } from "./GroupSightings";

export function GroupMembers() {
	const { t } = useTranslation();
	const { groupId } = useParams<{ groupId: string }>();
	const [group, setGroup] = useState<Group | null>(null);
	const [members, setMembers] = useState<UserProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch Group and Members
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

				// Fetch Members
				const membersData = await getGroupMembers(groupData.memberIds);
				if (isMounted) {
					setMembers(membersData);
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
	}, [groupId, t]);

	if (loading) return <div>{t("groupMembers.loadingMembers")}</div>;
	if (error) return <div className="error-message">{error}</div>;
	if (!group) return <div>{t("errors.groupNotFound")}</div>;

	return (
		<div className="group-members-container">
			<div className="group-header">
				<h2>{group.name}</h2>
				<small className="join-code">
					{t("groups.joinCode")}: {window.location.origin}?group=
					{group.joinCode}
				</small>
			</div>

			<div className="members-section">
				<h3>
					{t("groupMembers.membersCount")} ({members.length})
				</h3>
				<ul className="members-list">
					{members.map((member) => (
						<li key={member.id} className="member-item">
							<Link
								to={`/groups/${group.id}/members/${member.id}`}
								className="member-item-button"
							>
								<div className="member-avatar">
									{member.photoURL ? (
										<img src={member.photoURL} alt={member.displayName} />
									) : (
										<div className="avatar-placeholder">
											{member.displayName.charAt(0).toUpperCase()}
										</div>
									)}
								</div>
								<div className="member-info">
									<span className="member-name">{member.displayName}</span>
									{member.id === group.ownerId && (
										<span className="owner-badge">{t("groups.owner")}</span>
									)}
								</div>
							</Link>
						</li>
					))}
				</ul>
			</div>

			<GroupLeaderboard group={group} />
			<GroupSightings group={group} />
		</div>
	);
}
