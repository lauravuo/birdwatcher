import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { createGroup, joinGroup } from "../../lib/firestore";
import type { Group } from "../../types";

export function GroupList() {
	const { currentUser } = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Create Form
	const [newName, setNewName] = useState("");

	// Join Form
	const [joinCode, setJoinCode] = useState("");

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

				// Auto-select logic moved from App.tsx
				// If user is not owner of any group and has exactly 1 group, redirect to it
				if (userGroups.length === 1) {
					const group = userGroups[0];
					const isOwner = group.ownerId === currentUser.uid;
					if (!isOwner) {
						navigate(`/groups/${group.id}`);
					}
				}
			},
			(err) => {
				console.error("onSnapshot error:", err);
				setError(t("groupList.failedToLoadGroups"));
				setLoading(false);
			},
		);

		return () => {
			unsubscribe();
		};
	}, [currentUser, t, navigate]);

	// Auto-join from URL param
	useEffect(() => {
		if (!currentUser) return;

		const codeToJoin = searchParams.get("group");

		if (codeToJoin) {
			joinGroup(codeToJoin, {
				uid: currentUser.uid,
				displayName: currentUser.displayName,
				email: currentUser.email,
				photoURL: currentUser.photoURL,
			})
				.then(() => {
					// Clear the param from URL
					setSearchParams({});
				})
				.catch((err) => {
					console.error("Auto-join failed:", err);
					setError(
						`${t("groupList.failedToAutoJoinGroup")} '${codeToJoin}': ${
							err instanceof Error ? err.message : t("errors.unknown")
						}`,
					);
				});
		}
	}, [currentUser, t, searchParams, setSearchParams]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentUser) return;
		setError(null);
		try {
			const generatedCode = `${newName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Math.random().toString(36).substring(2, 8)}`;
			await createGroup(newName, generatedCode, {
				uid: currentUser.uid,
				displayName: currentUser.displayName,
				email: currentUser.email,
				photoURL: currentUser.photoURL,
			});
			setNewName("");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t("groupList.failedToCreateGroup");
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
				photoURL: currentUser.photoURL,
			});
			setJoinCode("");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t("groupList.failedToJoinGroup");
			setError(message);
		}
	};

	if (loading) return <div>{t("groupList.loadingGroups")}</div>;

	return (
		<div className="group-list-container">
			<h2>{t("groups.title")}</h2>
			{error && <div style={{ color: "red" }}>{error}</div>}

			{groups.length === 0 ? (
				<p>{t("groups.noGroups")}</p>
			) : (
				<ul className="group-list">
					{groups.map((group) => (
						<li key={group.id} className="group-item">
							<Link to={`/groups/${group.id}`} className="group-button">
								<strong>{group.name}</strong> <small>({group.joinCode})</small>
							</Link>
						</li>
					))}
				</ul>
			)}

			<hr />

			{/* Only show Create/Join forms in Development Mode */}
			{import.meta.env.DEV && (
				<div className="group-actions">
					<div className="create-group">
						<h3>{t("groupList.createGroupTitle")}</h3>
						<form onSubmit={handleCreate}>
							<div>
								<label>
									{t("groupList.groupNameLabel")}:
									<input
										type="text"
										value={newName}
										onChange={(e) => setNewName(e.target.value)}
										required
									/>
								</label>
							</div>
							<button type="submit">{t("groupList.createButton")}</button>
						</form>
					</div>

					<div className="join-group">
						<h3>{t("groupList.joinGroupTitle")}</h3>
						<form onSubmit={handleJoin}>
							<label>
								{t("groupList.joinCodeInputLabel")}:
								<input
									type="text"
									value={joinCode}
									onChange={(e) => setJoinCode(e.target.value)}
									required
								/>
							</label>
							<button type="submit">{t("groupList.joinButton")}</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
