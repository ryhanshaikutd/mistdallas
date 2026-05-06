import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/portal/onboarding/OnboardingFlow";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = await createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.onboarded) redirect("/portal");

  return <OnboardingFlow profile={profile} />;
}
