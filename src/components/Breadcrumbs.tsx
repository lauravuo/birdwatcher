import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { db } from "../lib/firebase";

export function Breadcrumbs() {
	const location = useLocation();
	const pathnames = location.pathname.split("/").filter((x) => x);
	const [groupName, setGroupName] = useState<string | null>(null);
	const [userName, setUserName] = useState<string | null>(null);

	const groupIndex = pathnames.indexOf("groups");
	const groupId =
		groupIndex !== -1 && pathnames[groupIndex + 1]
			? pathnames[groupIndex + 1]
			: null;

	const memberIndex = pathnames.indexOf("members");
	const userId =
		memberIndex !== -1 && pathnames[memberIndex + 1]
			? pathnames[memberIndex + 1]
			: null;

	// Fetch group name if groupId is present
	useEffect(() => {
		const fetchGroupName = async () => {
			if (groupId) {
				try {
					const docRef = doc(db, "groups", groupId);
					const docSnap = await getDoc(docRef);
					if (docSnap.exists()) {
						setGroupName(docSnap.data().name);
					}
				} catch (e) {
					console.error("Failed to fetch group name for breadcrumb", e);
				}
			} else {
				setGroupName(null);
			}
		};
		fetchGroupName();
	}, [groupId]);

	// Fetch user name if userId is present
	useEffect(() => {
		const fetchUserName = async () => {
			if (userId) {
				// Ideally we could get this from a users cache or passing state,
				// but fetching profile works for now.
				// However, UserProfile is not always public?
				// Rules allow reading profiles if authenticated.
				try {
					const docRef = doc(db, "users", userId);
					const docSnap = await getDoc(docRef);
					if (docSnap.exists()) {
						setUserName(docSnap.data().displayName);
					}
				} catch (e) {
					console.error("Failed to fetch user name for breadcrumb", e);
				}
			} else {
				setUserName(null);
			}
		};
		fetchUserName();
	}, [userId]);

	return (
		<nav className="breadcrumbs" aria-label="breadcrumb">
			<ol>
				{pathnames.map((value, index) => {
					const to = `/${pathnames.slice(0, index + 1).join("/")}`;
					const isLast = index === pathnames.length - 1;

					let label = value;
					// Map segments to readable names
					if (value === "groups") return null; // Skip 'groups' label
					if (value === "members") return null; // Skip 'members' label

					// If previous was 'groups', this is groupId
					if (pathnames[index - 1] === "groups" && groupName) {
						label = groupName;
					}
					// If previous was 'members', this is userId
					if (pathnames[index - 1] === "members" && userName) {
						label = userName;
					}

					if (isLast) {
						return (
							<li key={to} aria-current="page">
								{groupName && pathnames[index - 1] === "groups"
									? groupName
									: userName && pathnames[index - 1] === "members"
										? userName
										: label}
							</li>
						);
					}

					return (
						<li key={to}>
							<Link to={to}>{label}</Link>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
