import { requireLeadership } from "@/lib/auth";
import ReviewDashboard from "@/components/portal/review/ReviewDashboard";

export default async function ReviewPage() {
  const { profile, supabase } = await requireLeadership();

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
