import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InsightsDashboard from "@/components/portal/insights/InsightsDashboard";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const allowed = ["regional_director", "internal_ad", "external_ad", "director"];
  if (!allowed.includes(profile?.role ?? "")) redirect("/portal");

  const isLeadership = ["regional_director", "internal_ad", "external_ad"].includes(profile?.role ?? "");

  const appsQuery = supabase
    .from("applications")
    .select("id, status, gender, is_internal, created_at, application_rankings(position:positions(team))");

  const tasksQuery = supabase
    .from("tasks")
    .select("id, status, team");

  if (!isLeadership && profile?.team) {
    tasksQuery.eq("team", profile.team);
  }

  const [{ data: applications }, { data: tasks }, { data: attendance }] = await Promise.all([
    isLeadership ? appsQuery : { data: [] },
    tasksQuery,
    supabase.from("attendance_records").select("id, event_name, event_date, school, team, cycle_year").order("event_date"),
  ]);

  return (
    <InsightsDashboard
      profile={profile}
      applications={applications ?? []}
      tasks={tasks ?? []}
      attendance={attendance ?? []}
      isLeadership={isLeadership}
    />
  );
}
