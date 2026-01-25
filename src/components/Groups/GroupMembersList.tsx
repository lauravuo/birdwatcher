import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { Group, UserProfile } from "../../types";

interface GroupMembersListProps {
	group: Group;
	members: UserProfile[];
	userStats: Map<string, Record<string, string[]>>;
}

interface MemberWithBirdCount {
	member: UserProfile;
	birdCount: number;
}

export function GroupMembersList({
	group,
	members,
	userStats,
}: GroupMembersListProps) {
	const { t } = useTranslation();
	const { currentUser } = useAuth();

	// Calculate bird counts and sort members
	const sortedMembers = useMemo(() => {
		const membersWithCounts: MemberWithBirdCount[] = members.map((member) => {
			const stats = userStats.get(member.id);
			if (!stats) {
				return { member, birdCount: 0 };
			}

			// Aggregate unique birds across all months for this year
			const uniqueBirds = new Set<string>();
			for (const birdIds of Object.values(stats)) {
				for (const birdId of birdIds) {
					uniqueBirds.add(birdId);
				}
			}

			return { member, birdCount: uniqueBirds.size };
		});

		// Sort by bird count (descending), then by name
		return membersWithCounts.sort((a, b) => {
			if (b.birdCount !== a.birdCount) {
				return b.birdCount - a.birdCount;
			}
			return a.member.displayName.localeCompare(b.member.displayName);
		});
	}, [members, userStats]);

	return (
		<div className="members-section">
			<h3>
				{t("groupMembers.membersCount")} ({members.length})
			</h3>
			<div className="group-tab-card">
				<ul className="members-list">
					{sortedMembers.map(({ member, birdCount }) => (
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
									<span className="member-bird-count">
										{t("groupMembers.birdCount", { count: birdCount })}
									</span>
									{member.id === group.ownerId && (
										<span className="owner-badge">{t("groups.owner")}</span>
									)}
									{member.id === currentUser?.uid && (
										<span className="you-badge">{t("groups.you")}</span>
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
