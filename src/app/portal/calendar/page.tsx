import { requireBoard } from "@/lib/auth";
import { isLeadership } from "@/lib/constants";
import { localDateIso } from "@/lib/deadlines";
import { siteUrl } from "@/lib/email/resend";
import type { Milestone } from "@/lib/types";
import CalendarClient from "@/components/portal/calendar/CalendarClient";

export default async function CalendarPage() {
  const { user, profile, supabase } = await requireBoard();
  const [{ data: milestones }, { data: reminder }] = await Promise.all([
    supabase.from("milestones").select("*").order("target_date", { ascending: true, nullsFirst: false }),
    supabase.from("reminder_preferences").select("email_enabled, days_before").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <CalendarClient
      milestones={(milestones ?? []) as Milestone[]}
      canManage={isLeadership(profile.role)}
      reminder={reminder}
      todayIso={localDateIso(new Date())}
      portalUrl={`${siteUrl()}/portal/calendar`}
    />
  );
}
