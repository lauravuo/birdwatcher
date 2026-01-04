import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createGroup, getUserGroups, joinGroup } from "../../lib/firestore";
import type { Group } from "../../types";

export function GroupList() {
	const { currentUser } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Create Form
	const [newName, setNewName] = useState("");
	const [newCode, setNewCode] = useState("");

	// Join Form
	const [joinCode, setJoinCode] = useState("");

	const loadGroups = useCallback(async () => {
		if (!currentUser) return;
		try {
			const userGroups = await getUserGroups(currentUser.uid);
			setGroups(userGroups);
		} catch (err) {
			console.error("Failed to load groups:", err);
			setError("Failed to load groups.");
		} finally {
			setLoading(false);
		}
	}, [currentUser]);

	useEffect(() => {
		loadGroups();
	}, [loadGroups]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		setError(null);
		try {
			await createGroup(newName, newCode, {
				uid: currentUser.uid,
				displayName: currentUser.displayName,
				email: currentUser.email,
			});
			setNewName("");
			setNewCode("");
			await loadGroups();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to create group";
			setError(message);
		}
	};

	const handleJoin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		setError(null);
		try {
			await joinGroup(joinCode, {
				uid: currentUser.uid,
				displayName: currentUser.displayName,
				email: currentUser.email,
			});
			setJoinCode("");
			await loadGroups();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to join group";
			setError(message);
		}
	};

	if (loading) return <div>Loading groups...</div>;

	return (
		<div className="group-list-container">
			<h2>Your Groups</h2>
			{error && <div style={{ color: "red" }}>{error}</div>}

			{groups.length === 0 ? (
				<p>You haven't joined any groups yet.</p>
			) : (
				<ul className="group-list">
					{groups.map((group) => (
						<li key={group.id} className="group-item">
							<strong>{group.name}</strong> <small>({group.joinCode})</small>
						</li>
					))}
				</ul>
			)}

			<hr />

			<div className="group-actions">
				<div className="create-group">
					<h3>Create New Group</h3>
					<form onSubmit={handleCreate}>
						<div>
							<label>
								Group Name:
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									required
								/>
							</label>
						</div>
						<div>
							<label>
								Unique Join Code:
								<input
									type="text"
									value={newCode}
									onChange={(e) => setNewCode(e.target.value)}
									placeholder="e.g. bird-lovers-2024"
									pattern="[a-z0-9-]+"
									title="Lowercase letters, numbers, and hyphens only."
									required
								/>
							</label>
						</div>
						<button type="submit">Create Group</button>
					</form>
				</div>

				<div className="join-group">
					<h3>Join Existing Group</h3>
					<form onSubmit={handleJoin}>
						<label>
							Enter Join Code:
							<input
								type="text"
								value={joinCode}
								onChange={(e) => setJoinCode(e.target.value)}
								required
							/>
						</label>
						<button type="submit">Join</button>
					</form>
				</div>
			</div>
		</div>
	);
}
