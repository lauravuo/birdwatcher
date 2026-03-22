import { useTranslation } from "react-i18next";
import type { Group, UserProfile } from "../../types";
import { GroupFirstSightings } from "./GroupFirstSightings";

interface GroupSummaryProps {
	group: Group;
	members: UserProfile[];
	groupTotalCount: number;
	onTabChange?: (
		tab: "summary" | "leaderboard" | "sightings" | "members",
	) => void;
}

export function GroupSummary({
	group,
	members,
	groupTotalCount,
	onTabChange,
}: GroupSummaryProps) {
	const { t } = useTranslation();
	const currentYear = new Date().getFullYear();

	return (
		<div className="leaderboard-container">
			{/* 1. Group Total */}
			<div className="leaderboard-section">
				<h3 className="leaderboard-section-title">
					{t("leaderboard.groupTotal", { year: currentYear })}
				</h3>
				{groupTotalCount > 0 ? (
					<div className="leaderboard-list">
						<button
							type="button"
							className="leaderboard-item"
							style={{
								cursor: onTabChange ? "pointer" : "default",
								width: "100%",
								textAlign: "left",
								background: "var(--bg-tertiary)",
								color: "inherit",
								fontFamily: "inherit",
								fontSize: "inherit",
								border: "1px solid var(--border-color)",
								padding: "0.75rem 1rem",
							}}
							onClick={() => onTabChange?.("sightings")}
							disabled={!onTabChange}
							data-testid="group-total-click"
						>
							<div className="leaderboard-rank">👥</div>
							<div className="leaderboard-user">
								<span className="user-name">{group.name}</span>
							</div>
							<div className="leaderboard-stats">
								<div className="points">
									<span className="points-value">{groupTotalCount}</span>
									<span className="points-label">spp</span>
								</div>
							</div>
						</button>
					</div>
				) : (
					<div className="empty-state">{t("groupSightings.noSightings")}</div>
				)}
			</div>

			<GroupFirstSightings group={group} members={members} year={currentYear} />
		</div>
	);
}
