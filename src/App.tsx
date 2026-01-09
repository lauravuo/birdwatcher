import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes } from "react-router-dom";
import AddSightingButton from "./components/AddSightingButton";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { GroupList } from "./components/Groups/GroupList";
import { GroupView } from "./components/Groups/GroupView";
import { Login } from "./components/Login";
import { SightingDetails } from "./components/SightingDetails";
import { UserView } from "./components/UserView";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";

function AuthenticatedApp() {
	const { currentUser, logout } = useAuth();
	const { t } = useTranslation();

	if (!currentUser) {
		return <Login />;
	}

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
			<Breadcrumbs />
			<main>
				<div className="card">
					<Routes>
						<Route path="/" element={<GroupList />} />
						<Route path="/groups/:groupId" element={<GroupView />} />
						<Route
							path="/groups/:groupId/members/:userId"
							element={<UserView />}
						/>
						<Route
							path="/groups/:groupId/members/:userId/sightings/:sightingId"
							element={<SightingDetails />}
						/>
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
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
