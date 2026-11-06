import { requireUser } from "@/lib/auth";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";
import { getCurrentSeason } from "@/lib/season";
import ApplicationForm from "@/components/portal/apply/ApplicationForm";

export default async function ApplyPage() {
  const { user, profile, supabase } = await requireUser();

  const [{ data: positions }, { data: cycle }, season] = await Promise.all([
    // Only seats leadership has opened can be ranked.
    supabase.from("positions").select("*").eq("is_active", true).eq("open_for_applications", true).order("sort_order"),
    supabase.from("recruitment_cycles").select("*").neq("type", "closed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getCurrentSeason(supabase),
  ]);

  // Check if already applied this cycle
  const { data: existing } = cycle
    ? await supabase.from("applications").select("id, status").eq("applicant_id", user.id).eq("cycle_id", cycle.id).maybeSingle()
    : { data: null };

  const isInternal = user.email?.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) ?? false;

  return (
    <ApplicationForm
      profile={profile}
      positions={positions ?? []}
      cycle={cycle}
      season={season}
      existingApplication={existing}
      isInternal={isInternal}
    />
  );
}
