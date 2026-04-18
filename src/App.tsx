import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
	Link,
	matchPath,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import AddSightingButton from "./components/AddSightingButton";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { Loading } from "./components/Loading";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useUserGroups } from "./hooks/useUserGroups";
import "./App.css";

// Lazy-load route components
const Login = lazy(() => import("./components/Login"));
const GroupList = lazy(() =>
	import("./components/Groups/GroupList").then((m) => ({
		default: m.GroupList,
	})),
);
const GroupView = lazy(() =>
	import("./components/Groups/GroupView").then((m) => ({
		default: m.GroupView,
	})),
);
const UserView = lazy(() =>
	import("./components/UserView").then((m) => ({ default: m.UserView })),
);
const SightingDetails = lazy(() =>
	import("./components/SightingDetails").then((m) => ({
		default: m.SightingDetails,
	})),
);
const UserCompare = lazy(() =>
	import("./components/UserCompare").then((m) => ({ default: m.UserCompare })),
);

function AuthenticatedApp() {
	const { currentUser, logout } = useAuth();
	const { t } = useTranslation();
	const location = useLocation();
	const { groups } = useUserGroups();

	if (!currentUser) {
		return (
			<Suspense fallback={<Loading />}>
				<Login />
			</Suspense>
		);
	}

	// Try to get groupId from current path
	const match = matchPath({ path: "/groups/:groupId/*" }, location.pathname);
	const urlGroupId = match?.params.groupId;

	// Active group is either from URL or first found group
	const activeGroupId = urlGroupId || (groups.length > 0 ? groups[0].id : null);

	return (
		<div className="app-container">
			<header>
				<div className="header-content">
					<h1>{t("app.title")}</h1>
					<div className="user-info">
						<Link
							to={
								activeGroupId
									? `/groups/${activeGroupId}/members/${currentUser.uid}`
									: "#"
							}
							className="user-profile-link"
							data-testid="user-profile-link"
						>
							{currentUser.photoURL && (
								<img
									src={currentUser.photoURL}
									alt=""
									className="user-avatar-small"
								/>
							)}
							<span>{currentUser.displayName}</span>
						</Link>
						<button type="button" onClick={logout} className="logout-button">
							{t("app.logout")}
						</button>
					</div>
				</div>
			</header>
			<Breadcrumbs />
			<main>
				<div className="card">
					<Suspense fallback={<Loading />}>
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
							<Route
								path="/groups/:groupId/members/:userId/compare"
								element={<UserCompare />}
							/>
							<Route path="*" element={<Navigate to="/" replace />} />
						</Routes>
					</Suspense>
				</div>
				{groups.length > 0 && activeGroupId && (
					<AddSightingButton activeGroupId={activeGroupId} />
				)}
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
