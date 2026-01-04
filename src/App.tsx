import { useState } from "react";
import { GroupList } from "./components/Groups/GroupList";
import { GroupMembers } from "./components/Groups/GroupMembers";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import type { Group } from "./types";

function AuthenticatedApp() {
	const { currentUser, logout } = useAuth();
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

	if (!currentUser) {
		return <Login />;
	}

	return (
		<div className="app-container">
			<header>
				<div className="header-content">
					<h1>Birdwatcher</h1>
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
							Logout
						</button>
					</div>
				</div>
			</header>
			<main>
				<div className="card">
					{selectedGroup ? (
						<GroupMembers
							group={selectedGroup}
							onBack={() => setSelectedGroup(null)}
						/>
					) : (
						<GroupList onSelectGroup={setSelectedGroup} />
					)}
				</div>
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
