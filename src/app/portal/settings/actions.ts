"use server";

import { getActor, type ActionResult } from "@/lib/auth";

export async function saveSettings(data: {
  preferred_name: string;
  fun_fact: string;
  theme: "light" | "dark";
  nav_style: "sidebar" | "topnav";
}): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };

  const { error } = await actor.admin
    .from("profiles")
    .update({
      preferred_name: data.preferred_name || null,
      fun_fact: data.fun_fact || null,
      theme: data.theme,
      nav_style: data.nav_style,
    })
    .eq("id", actor.user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

const LEAD_TIMES = [1, 3, 7, 14];

export async function saveReminderPreferences(data: { email_enabled: boolean; days_before: number }): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };
  if (!LEAD_TIMES.includes(data.days_before)) return { success: false, error: "Reminders can go out 1, 3, 7 or 14 days before." };

  const { error } = await actor.admin
    .from("reminder_preferences")
    .upsert({ user_id: actor.user.id, email_enabled: !!data.email_enabled, days_before: data.days_before }, { onConflict: "user_id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
