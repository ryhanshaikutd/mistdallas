import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import OnboardingFlow from "@/components/portal/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { profile } = await requireUser();
  if (profile.onboarded) redirect("/portal");
  return <OnboardingFlow profile={profile} />;
}
