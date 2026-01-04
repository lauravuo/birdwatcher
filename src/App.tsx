import { GroupList } from "./components/Groups/GroupList";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function AuthenticatedApp() {
	const { currentUser, logout } = useAuth();

	if (!currentUser) {
		return <Login />;
	}

	return (
		<div className="app-container">
			<header>
				<h1>Birdwatcher</h1>
				<div className="user-info">
					<span>{currentUser.displayName}</span>
					<button type="button" onClick={logout}>
						Logout
					</button>
				</div>
			</header>
			<main>
				<div className="card">
					<GroupList />
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
