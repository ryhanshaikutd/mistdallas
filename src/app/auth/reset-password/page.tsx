import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/** Reached from the reset-link email after /auth/confirm has created a session. */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link_expired");
  return <ResetPasswordClient email={user.email ?? ""} />;
}
