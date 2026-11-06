import { requireUser } from "@/lib/auth";
import type { ReminderLeadTime } from "@/lib/types";
import SettingsClient from "@/components/portal/settings/SettingsClient";

export default async function SettingsPage() {
  const { user, profile, supabase } = await requireUser();
  const { data: reminder } = await supabase
    .from("reminder_preferences")
    .select("email_enabled, days_before")
    .eq("user_id", user.id)
    .maybeSingle();
  return <SettingsClient profile={profile} reminder={reminder as { email_enabled: boolean; days_before: ReminderLeadTime } | null} />;
}
