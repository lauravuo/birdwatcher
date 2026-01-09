import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Group, UserProfile } from "../../types";

interface GroupMembersListProps {
	group: Group;
	members: UserProfile[];
}

export function GroupMembersList({ group, members }: GroupMembersListProps) {
	const { t } = useTranslation();

	return (
		<div className="members-section">
			<h3>
				{t("groupMembers.membersCount")} ({members.length})
			</h3>
			<div className="group-tab-card">
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
		</div>
	);
}
