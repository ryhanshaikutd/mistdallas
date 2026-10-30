import { requireUser } from "@/lib/auth";
import { isLeadership, PRIORITY_ORDER } from "@/lib/constants";
import { getCurrentSeason, currentPhase } from "@/lib/season";
import { localDateIso } from "@/lib/deadlines";
import { announcementVisible } from "@/lib/announcements";
import { workbookFor } from "@/lib/workbook/content";
import { nextActions, overallPercent, type WorkbookPhaseData } from "@/lib/workbook/progress";
import type { PhaseId } from "@/lib/workbook/types";
import type { Announcement, Team } from "@/lib/types";
import DashboardClient from "@/components/portal/DashboardClient";

export default async function PortalDashboard() {
  const { user, profile, supabase } = await requireUser();
  const isReviewer = isLeadership(profile.role);
  const todayIso = localDateIso(new Date());

  const [{ data: applications }, { data: tasks }, { data: milestones }, { data: cycle }, season, { data: announcementsRaw }, { data: seat }] =
    await Promise.all([
      isReviewer
        ? supabase.from("applications").select("id, status, applicant_name, created_at").order("created_at", { ascending: false }).limit(5)
        : supabase.from("applications").select("id, status").eq("applicant_id", user.id),
      supabase.from("tasks").select("id, title, status, due_date, priority, team").neq("status", "done").order("due_date", { ascending: true }).limit(20),
      supabase.from("milestones").select("id, title, target_date, owner_label").not("target_date", "is", null).order("target_date", { ascending: true }),
      supabase.from("recruitment_cycles").select("*").neq("type", "closed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      getCurrentSeason(supabase),
      supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      profile.position_id
        ? supabase.from("positions").select("slug, title, team").eq("id", profile.position_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const announcements = ((announcementsRaw ?? []) as Announcement[])
    .filter((a) => announcementVisible(a, { role: profile.role, team: profile.team }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.created_at.localeCompare(a.created_at))
    .slice(0, 2);

  const role = workbookFor(seat?.slug);
  let workbookPercent: number | null = null;
  let actions: ReturnType<typeof nextActions> = [];
  if (seat?.slug && role) {
    const { data: rows } = await supabase.from("workbook_progress").select("phase, data").eq("user_id", user.id).eq("position_slug", seat.slug);
    const byPhase: Partial<Record<PhaseId, WorkbookPhaseData>> = {};
    for (const row of rows ?? []) byPhase[row.phase as PhaseId] = row.data as WorkbookPhaseData;
    workbookPercent = overallPercent(role, byPhase);
    if (season) actions = nextActions(role, byPhase, season, todayIso);
  }

  return (
    <DashboardClient
      profile={profile}
      recentApplications={applications ?? []}
      pendingTasks={tasks ?? []}
      milestones={milestones ?? []}
      activeCycle={cycle}
      season={season}
      currentPhase={season ? currentPhase(season, todayIso) : null}
      todayIso={todayIso}
      announcements={announcements}
      seat={seat ? { slug: seat.slug, title: seat.title, team: seat.team as Team } : null}
      workbookPercent={workbookPercent}
      nextActions={actions}
    />
  );
}
