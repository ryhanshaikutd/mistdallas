import { isLeadership } from "@/lib/constants";
import type { Team, UserRole } from "@/lib/types";

/** Mirrors public.can_write_team(): leadership anywhere; directors, chairs and leads on their own team. */
export function canWriteTeam(viewer: { role: UserRole; team: Team | null }, team: Team | null): boolean {
  if (isLeadership(viewer.role)) return true;
  return ["director", "chair", "lead"].includes(viewer.role) && team !== null && viewer.team === team;
}
