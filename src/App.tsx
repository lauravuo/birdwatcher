import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AddSightingButton from "./components/AddSightingButton";
import { GroupList } from "./components/Groups/GroupList";
import { GroupMembers } from "./components/Groups/GroupMembers";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { db } from "./lib/firebase";
import type { Group } from "./types";

function AuthenticatedApp() {
	const { currentUser, logout } = useAuth();
	const { t } = useTranslation();
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	const [groups, setGroups] = useState<Group[]>([]);

	// Fetch user's groups
	useEffect(() => {
		if (!currentUser) {
			setGroups([]);
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

				// Auto-select if user is not owner of any group and has exactly 1 group
				const isOwnerOfAny = userGroups.some(
					(g) => g.ownerId === currentUser.uid,
				);
				if (!isOwnerOfAny && userGroups.length === 1 && !selectedGroup) {
					setSelectedGroup(userGroups[0]);
				}
			},
			(err) => {
				console.error("Failed to fetch groups:", err);
			},
		);

		return () => {
			unsubscribe();
		};
	}, [currentUser, selectedGroup]);

	if (!currentUser) {
		return <Login />;
	}

	// Check if user owns any groups
	const isOwnerOfAny = groups.some((g) => g.ownerId === currentUser.uid);
	const isSingleGroupNonOwner = !isOwnerOfAny && groups.length === 1;

	return (
		<div className="app-container">
			<header>
				<div className="header-content">
					<h1>{t("app.title")}</h1>
					<div className="user-info">
						{currentUser.photoURL && (
							<img
								src={currentUser.photoURL}
								alt=""
								className="user-avatar-small"
							/>
						)}
						<span>{currentUser.displayName}</span>
						<button type="button" onClick={logout} className="logout-button">
							{t("app.logout")}
						</button>
					</div>
				</div>
			</header>
			<main>
				<div className="card">
					{selectedGroup ? (
						<GroupMembers
							group={selectedGroup}
							onBack={
								isSingleGroupNonOwner ? undefined : () => setSelectedGroup(null)
							}
						/>
					) : (
						<GroupList onSelectGroup={setSelectedGroup} />
					)}
				</div>
				<AddSightingButton />
			</main>
		</div>
	);
}

function App() {
	return (
		<AuthProvider>
			<AuthenticatedApp />
		</AuthProvider>
	);
}

export default App;
