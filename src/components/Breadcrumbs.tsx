import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { db } from "../lib/firebase";

export function Breadcrumbs() {
	const location = useLocation();
	const { t } = useTranslation();
	const pathnames = location.pathname.split("/").filter((x) => x);
	const [groupName, setGroupName] = useState<string | null>(null);
	const [joinCode, setJoinCode] = useState<string | null>(null);
	const [userName, setUserName] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

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

	// Fetch group name and code
	useEffect(() => {
		const fetchGroupData = async () => {
			if (groupId) {
				try {
					const docRef = doc(db, "groups", groupId);
					const docSnap = await getDoc(docRef);
					if (docSnap.exists()) {
						const data = docSnap.data();
						setGroupName(data.name);
						setJoinCode(data.joinCode);
					}
				} catch (e) {
					console.error("Failed to fetch group data for breadcrumb", e);
				}
			} else {
				setGroupName(null);
				setJoinCode(null);
			}
		};
		fetchGroupData();
	}, [groupId]);

	// Fetch user name if userId is present
	useEffect(() => {
		const fetchUserName = async () => {
			if (userId) {
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

	const handleShare = async () => {
		if (!joinCode) return;
		const url = `${window.location.origin}?group=${joinCode}`;
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy", err);
		}
	};

	// Only show share button if we are in a group view but NOT deeper (e.g. not in member view)
	// Actually, sharing the group link is useful even in member view?
	// User request: "displayed in breadcrumbs... maybe in breadcrumb row".
	// Usually share actions are contextual. If I am looking at a member, sharing the *group* might still be relevant,
	// but mostly relevant at group root.
	// Let's restrict to group root (pathnames length check?).
	// Path: /groups/[id] -> length 2.
	// Path: /groups/[id]/members/[id] -> length 4.
	// If we want it only on Group Info page:
	const showShareButton = groupId && !userId && joinCode;

	return (
		<nav className="breadcrumbs" aria-label="breadcrumb">
			<div className="breadcrumbs-content">
				<ol>
					{pathnames.map((value, index) => {
						const to = `/${pathnames.slice(0, index + 1).join("/")}`;
						const isLast = index === pathnames.length - 1;

						let label = value;
						if (value === "groups") return null;
						if (value === "members") return null;

						if (pathnames[index - 1] === "groups" && groupName) {
							label = groupName;
						}
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
				{showShareButton && (
					<button type="button" onClick={handleShare} className="share-button">
						{copied ? t("common.copied") : t("groups.share")}
					</button>
				)}
			</div>
		</nav>
	);
}
