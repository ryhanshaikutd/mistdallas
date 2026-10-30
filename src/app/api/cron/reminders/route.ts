import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { selectReminders } from "@/lib/reminders";
import { localDateIso } from "@/lib/deadlines";
import { isEmailConfigured, sendEmail, siteUrl } from "@/lib/email/resend";
import { reminderEmail } from "@/lib/email/templates";

/**
 * GET /api/cron/reminders — run daily by Vercel Cron (see vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>". Sends each enabled
 * user one email per milestone that is exactly their lead time away, and
 * records the delivery so a second run the same day sends nothing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) return NextResponse.json({ ok: true, sent: 0, skipped: "email not configured" });

  const admin = createAdminClient();
  const todayIso = localDateIso(new Date());

  const [{ data: prefs }, { data: milestones }, { data: delivered }] = await Promise.all([
    admin.from("reminder_preferences").select("user_id, email_enabled, days_before").eq("email_enabled", true),
    admin.from("milestones").select("id, title, description, target_date, date_label, send_reminders").eq("send_reminders", true).not("target_date", "is", null),
    admin.from("reminder_deliveries").select("user_id, milestone_id").eq("reminder_date", todayIso),
  ]);

  const picks = selectReminders({ todayIso, prefs: prefs ?? [], milestones: milestones ?? [], delivered: delivered ?? [] });
  if (picks.length === 0) return NextResponse.json({ ok: true, date: todayIso, sent: 0, failed: [] });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", [...new Set(picks.map((p) => p.user_id))]);
  const byUser = new Map((profiles ?? []).map((p) => [p.id, p]));
  const byMilestone = new Map((milestones ?? []).map((m) => [m.id, m]));

  let sent = 0;
  const failed: { user_id: string; milestone_id: string; error: string }[] = [];
  for (const pick of picks) {
    const profile = byUser.get(pick.user_id);
    const milestone = byMilestone.get(pick.milestone_id);
    if (!profile?.email || !milestone) {
      failed.push({ ...pick, error: "missing profile or milestone" });
      continue;
    }
    const { subject, html } = reminderEmail({
      fullName: profile.full_name,
      title: milestone.title,
      dateLabel: milestone.date_label ?? milestone.target_date ?? "",
      detail: milestone.description ?? "",
      daysBefore: pick.days_before,
      siteUrl: siteUrl(),
    });
    const result = await sendEmail({ to: profile.email, subject, html });
    if (!result.ok) {
      failed.push({ user_id: pick.user_id, milestone_id: pick.milestone_id, error: result.error });
      continue;
    }
    const { error } = await admin
      .from("reminder_deliveries")
      .insert({ user_id: pick.user_id, milestone_id: pick.milestone_id, reminder_date: todayIso });
    // 23505 = unique violation: a concurrent run already recorded this delivery.
    if (error && error.code !== "23505") console.error("reminder delivery insert failed:", error.message);
    sent += 1;
  }

  return NextResponse.json({ ok: true, date: todayIso, sent, failed });
}
