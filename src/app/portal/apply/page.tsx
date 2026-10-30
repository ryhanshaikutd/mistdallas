import { requireUser } from "@/lib/auth";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";
import ApplicationForm from "@/components/portal/apply/ApplicationForm";

export default async function ApplyPage() {
  const { user, profile, supabase } = await requireUser();
  const { data: positions } = await supabase.from("positions").select("*").eq("is_active", true).order("team").order("phase");
  const { data: cycle } = await supabase.from("recruitment_cycles").select("*").neq("type", "closed").order("created_at", { ascending: false }).limit(1).maybeSingle();

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
      existingApplication={existing}
      isInternal={isInternal}
    />
  );
}
