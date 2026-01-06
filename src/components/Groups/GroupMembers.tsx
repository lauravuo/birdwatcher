import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupMembers } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";
import { GroupSightings } from "./GroupSightings";

interface GroupMembersProps {
	group: Group;
	onBack?: () => void;
	onSelectUser: (user: UserProfile) => void;
}

export function GroupMembers({
	group,
	onBack,
	onSelectUser,
}: GroupMembersProps) {
	const { t } = useTranslation();
	const [members, setMembers] = useState<UserProfile[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		async function fetchMembers() {
			try {
				const membersData = await getGroupMembers(group.memberIds);
				if (isMounted) {
					setMembers(membersData);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					console.error("Failed to fetch members:", err);
					setError(t("groupMembers.failedToLoadMembers"));
					setLoading(false);
				}
			}
		}

		fetchMembers();

		return () => {
			isMounted = false;
		};
	}, [group.memberIds, t]);

	if (loading) return <div>{t("groupMembers.loadingMembers")}</div>;

	return (
		<div className="group-members-container">
			<div className="group-header">
				{onBack && (
					<button type="button" onClick={onBack} className="back-button">
						{t("groupMembers.backButton")}
					</button>
				)}
				<h2>{group.name}</h2>
				<small className="join-code">
					{t("groups.joinCode")}: {group.joinCode}
				</small>
			</div>

			{error && <div className="error-message">{error}</div>}

			<div className="members-section">
				<h3>
					{t("groupMembers.membersCount")} ({members.length})
				</h3>
				<ul className="members-list">
					{members.map((member) => (
						<li key={member.id} className="member-item">
							<button
								type="button"
								className="member-item-button"
								onClick={() => onSelectUser(member)}
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
							</button>
						</li>
					))}
				</ul>
			</div>

			<GroupSightings group={group} />
		</div>
	);
}
