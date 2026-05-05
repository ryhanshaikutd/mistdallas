import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlanningBoard from "@/components/portal/planning/PlanningBoard";

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const excluded = ["applicant"];
  if (excluded.includes(profile?.role ?? "")) redirect("/portal");

  const isLeadership = ["regional_director", "internal_ad", "external_ad"].includes(profile?.role ?? "");

  const tasksQuery = supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, email), assigner:profiles!tasks_assigned_by_fkey(id, full_name)")
    .order("created_at", { ascending: false });

  if (!isLeadership && profile?.team) {
    tasksQuery.eq("team", profile.team);
  }

  const [{ data: tasks }, { data: milestones }, { data: teamMembers }] = await Promise.all([
    tasksQuery,
    supabase.from("milestones").select("*").order("target_date"),
    profile?.team
      ? supabase.from("profiles").select("id, full_name, role, team").eq("team", profile.team)
      : { data: [] },
  ]);

  return (
    <PlanningBoard
      profile={profile}
      tasks={tasks ?? []}
      milestones={milestones ?? []}
      teamMembers={teamMembers ?? []}
      isLeadership={isLeadership}
    />
  );
}
