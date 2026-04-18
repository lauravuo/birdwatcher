import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, getUserStats } from "../lib/firestore";
import type { UserProfile } from "../types";

export function UserCompare() {
	const { t, i18n } = useTranslation();
	const { userId } = useParams<{ userId: string }>();
	const { currentUser } = useAuth();

	const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const now = new Date();
	const [selectedYear, setSelectedYear] = useState(now.getFullYear());
	const [selectedMonth, setSelectedMonth] = useState<number | null>(
		now.getMonth(),
	);

	const [myStats, setMyStats] = useState<Record<string, string[]>>({});
	const [theirStats, setTheirStats] = useState<Record<string, string[]>>({});

	// Derived filter options
	const [availableYears, setAvailableYears] = useState<number[]>([]);
	const [availableMonths, setAvailableMonths] = useState<
		{ value: number | null; label: string }[]
	>([]);

	useEffect(() => {
		const currentYear = new Date().getFullYear();
		setAvailableYears(Array.from({ length: 5 }, (_, i) => currentYear - i));

		setAvailableMonths([
			{ value: null, label: t("common.any") },
			...Array.from({ length: 12 }, (_, i) => ({
				value: i,
				label: new Date(2000, i, 1).toLocaleDateString(i18n.language, {
					month: "long",
				}),
			})),
		]);
	}, [i18n.language, t]);

	useEffect(() => {
		let isMounted = true;

		async function fetchData() {
			if (!currentUser || !userId) return;
			setLoading(true);
			try {
				const [targetProfile, myStatsData, theirStatsData] = await Promise.all([
					getUserProfile(userId),
					getUserStats(currentUser.uid),
					userId !== currentUser.uid
						? getUserStats(userId)
						: Promise.resolve({}),
				]);

				if (isMounted) {
					if (!targetProfile) {
						setError(t("errors.userNotFound"));
					} else {
						setTargetUser(targetProfile);
						setMyStats(myStatsData);
						if (userId !== currentUser.uid) {
							setTheirStats(theirStatsData);
						}
					}
					setLoading(false);
				}
			} catch (err) {
				console.error(err);
				if (isMounted) {
					setError(t("errors.unknown"));
					setLoading(false);
				}
			}
		}

		fetchData();

		return () => {
			isMounted = false;
		};
	}, [userId, currentUser, t]);

	if (loading) return <div className="loading">{t("common.loading")}</div>;
	if (error || !targetUser)
		return <div className="error-message">{error || t("errors.unknown")}</div>;

	const isSelf = currentUser?.uid === userId;
	const yearKey = selectedYear.toString();
	const monthKey =
		selectedMonth !== null
			? `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`
			: null;

	const renderList = (title: string, birds: string[]) => {
		// Sort birds alphabetically
		const sorted = [...birds].sort((a, b) => {
			const nameA = t(`birds.${a}`, a);
			const nameB = t(`birds.${b}`, b);
			return nameA.localeCompare(nameB);
		});

		return (
			<div className="compare-list">
				<h4>
					{title} ({sorted.length})
				</h4>
				{sorted.length === 0 ? (
					<p className="no-birds-text">{t("compare.noBirds")}</p>
				) : (
					<ul className="bird-list">
						{sorted.map((birdId) => (
							<li key={birdId}>{t(`birds.${birdId}`, birdId)}</li>
						))}
					</ul>
				)}
			</div>
		);
	};

	let compareContent: React.ReactNode;

	if (isSelf) {
		if (selectedMonth === null) {
			compareContent = (
				<p className="compare-prompt">{t("compare.selectMonthPrompt")}</p>
			);
		} else {
			const yearBirds = new Set(myStats[yearKey] || []);
			const monthBirds = new Set(myStats[monthKey as string] || []);

			const missingThisMonth = [...yearBirds].filter(
				(bird) => !monthBirds.has(bird),
			);
			const seenThisMonth = [...monthBirds];

			compareContent = (
				<div className="compare-results">
					{renderList(t("compare.missingThisMonth"), missingThisMonth)}
					{renderList(t("compare.seenThisMonth"), seenThisMonth)}
				</div>
			);
		}
	} else {
		let myBirdsSet: Set<string>;
		let theirBirdsSet: Set<string>;

		if (selectedMonth !== null) {
			myBirdsSet = new Set(myStats[monthKey as string] || []);
			theirBirdsSet = new Set(theirStats[monthKey as string] || []);
		} else {
			myBirdsSet = new Set(myStats[yearKey] || []);
			theirBirdsSet = new Set(theirStats[yearKey] || []);
		}

		const myBirds = [...myBirdsSet];
		const theirBirds = [...theirBirdsSet];

		const iHaveTheyDont = myBirds.filter((b) => !theirBirdsSet.has(b));
		const theyHaveIDont = theirBirds.filter((b) => !myBirdsSet.has(b));
		const bothHave = myBirds.filter((b) => theirBirdsSet.has(b));

		compareContent = (
			<div className="compare-results tri-column">
				{renderList(t("compare.youHaveTheyDont"), iHaveTheyDont)}
				{renderList(t("compare.theyHaveYouDont"), theyHaveIDont)}
				{renderList(t("compare.bothHave"), bothHave)}
			</div>
		);
	}

	return (
		<div className="compare-view">
			<div className="compare-header">
				<h2>
					{isSelf
						? t("compare.titleSelf")
						: t("compare.titleOther", { name: targetUser.displayName })}
				</h2>
			</div>

			<div className="compare-filters">
				<div className="filter-group">
					<label htmlFor="compare-year">{t("common.year")}</label>
					<select
						id="compare-year"
						value={selectedYear}
						onChange={(e) => setSelectedYear(Number(e.target.value))}
					>
						{availableYears.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
				<div className="filter-group">
					<label htmlFor="compare-month">{t("common.month")}</label>
					<select
						id="compare-month"
						value={selectedMonth === null ? "" : selectedMonth}
						onChange={(e) => {
							const val = e.target.value;
							setSelectedMonth(val === "" ? null : Number(val));
						}}
					>
						{availableMonths.map((m) => (
							<option key={m.label} value={m.value === null ? "" : m.value}>
								{m.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="compare-content-container">{compareContent}</div>
		</div>
	);
}
