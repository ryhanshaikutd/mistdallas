import { isBoard, isLeadership } from "@/lib/constants";
import type { Announcement, Team, UserRole } from "@/lib/types";

export type AnnouncementScope = Pick<Announcement, "audience" | "audience_team" | "is_active">;

export function announcementVisible(a: AnnouncementScope, viewer: { role: UserRole; team: Team | null }): boolean {
  const leader = isLeadership(viewer.role);
  if (!a.is_active) return leader;
  switch (a.audience) {
    case "all":
      return true;
    case "board":
      return isBoard(viewer.role);
    case "leadership":
      return leader;
    case "team":
      return leader || (a.audience_team !== null && viewer.team === a.audience_team);
    default:
      return false;
  }
}
