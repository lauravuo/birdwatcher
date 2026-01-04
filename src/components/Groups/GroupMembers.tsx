import { useEffect, useState } from "react";
import { getGroupMembers } from "../../lib/firestore";
import type { Group, UserProfile } from "../../types";

interface GroupMembersProps {
	group: Group;
	onBack: () => void;
}

export function GroupMembers({ group, onBack }: GroupMembersProps) {
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
					setError("Failed to load group members.");
					setLoading(false);
				}
			}
		}

		fetchMembers();

		return () => {
			isMounted = false;
		};
	}, [group.memberIds]);

	if (loading) return <div>Loading members...</div>;

	return (
		<div className="group-members-container">
			<div className="group-header">
				<button type="button" onClick={onBack} className="back-button">
					← Back
				</button>
				<h2>{group.name}</h2>
				<small className="join-code">Join Code: {group.joinCode}</small>
			</div>

			{error && <div className="error-message">{error}</div>}

			<div className="members-section">
				<h3>Members ({members.length})</h3>
				<ul className="members-list">
					{members.map((member) => (
						<li key={member.id} className="member-item">
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
									<span className="owner-badge">Owner</span>
								)}
							</div>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
