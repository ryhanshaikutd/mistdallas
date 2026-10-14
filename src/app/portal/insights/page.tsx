import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isLeadership } from "@/lib/constants";
import InsightsDashboard from "@/components/portal/insights/InsightsDashboard";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!isLeadership(profile?.role) && profile?.role !== "director") redirect("/portal");

  const leadership = isLeadership(profile?.role);

  const appsQuery = supabase
    .from("applications")
    .select("id, status, gender, is_internal, created_at, application_rankings(position:positions(team))");

  const tasksQuery = supabase
    .from("tasks")
    .select("id, status, team");

  if (!leadership && profile?.team) {
    tasksQuery.eq("team", profile.team);
  }

  const [{ data: applications }, { data: tasks }, { data: attendance }] = await Promise.all([
    leadership ? appsQuery : { data: [] },
    tasksQuery,
    supabase.from("attendance_records").select("id, event_name, event_date, school, team, cycle_year").order("event_date"),
  ]);

  // Normalize Supabase nested query shape to match component types
  type AppRow = {
    id: string; status: string; gender: string; is_internal: boolean; created_at: string;
    application_rankings?: { position?: { team: string } | null }[];
  };

  const normalizedApps: AppRow[] = (applications ?? []).map((a) => ({
    ...a,
    application_rankings: (a.application_rankings ?? []).map((r) => ({
      position: Array.isArray(r.position) ? r.position[0] ?? null : r.position ?? null,
    })),
  }));

  return (
    <InsightsDashboard
      profile={profile}
      applications={normalizedApps}
      tasks={tasks ?? []}
      attendance={attendance ?? []}
      isLeadership={leadership}
    />
  );
}
