import { requireBoard } from "@/lib/auth";
import { isLeadership } from "@/lib/constants";
import PlanningBoard from "@/components/portal/planning/PlanningBoard";

export default async function PlanningPage() {
  const { profile, supabase } = await requireBoard();
  const leadership = isLeadership(profile.role);

  const tasksQuery = supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, email), assigner:profiles!tasks_assigned_by_fkey(id, full_name)")
    .order("created_at", { ascending: false });

  if (!leadership && profile.team) {
    tasksQuery.eq("team", profile.team);
  }

  const [{ data: tasks }, { data: milestones }, { data: teamMembers }] = await Promise.all([
    tasksQuery,
    supabase.from("milestones").select("*").order("target_date"),
    profile.team
      ? supabase.from("profiles").select("id, full_name, role, team").eq("team", profile.team)
      : { data: [] },
  ]);

  return (
    <PlanningBoard
      profile={profile}
      tasks={tasks ?? []}
      milestones={milestones ?? []}
      teamMembers={teamMembers ?? []}
      isLeadership={leadership}
    />
  );
}
