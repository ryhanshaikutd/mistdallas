import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReviewDashboard from "@/components/portal/review/ReviewDashboard";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const allowed = ["regional_director", "internal_ad", "external_ad"];
  if (!allowed.includes(profile?.role ?? "")) redirect("/portal");

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      *,
      application_rankings (
        rank,
        position:positions (id, title, phase, team)
      ),
      reviewer_notes (*)
    `)
    .order("created_at", { ascending: false });

  const { data: positions } = await supabase.from("positions").select("*").eq("is_active", true);

  return <ReviewDashboard applications={applications ?? []} positions={positions ?? []} profile={profile} />;
}
