import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/portal/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (profile?.onboarded) redirect("/portal");

  return <OnboardingFlow profile={profile} />;
}
