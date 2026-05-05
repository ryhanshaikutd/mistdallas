import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/portal/DashboardClient";

export default async function PortalDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Fetch summary data based on role
  const isReviewer = ["regional_director", "internal_ad", "external_ad"].includes(profile?.role ?? "");

  const [{ data: applications }, { data: tasks }, { data: cycle }] = await Promise.all([
    isReviewer
      ? supabase.from("applications").select("id, status, applicant_name, created_at").order("created_at", { ascending: false }).limit(5)
      : supabase.from("applications").select("id, status").eq("applicant_id", user.id),
    supabase.from("tasks").select("id, title, status, due_date, priority").eq(
      profile?.role === "regional_director" ? "id" : "team",
      profile?.role === "regional_director" ? "id" : (profile?.team ?? "logistics")
    ).neq("status", "done").limit(5),
    supabase.from("recruitment_cycles").select("*").neq("type", "closed").order("created_at", { ascending: false }).limit(1).single(),
  ]);

  return (
    <DashboardClient
      profile={profile}
      recentApplications={applications ?? []}
      pendingTasks={tasks ?? []}
      activeCycle={cycle}
    />
  );
}
