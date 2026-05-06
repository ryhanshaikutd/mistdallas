"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function saveSettings(data: {
  preferred_name: string;
  fun_fact: string;
  theme: "light" | "dark";
  nav_style: "sidebar" | "topnav";
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      preferred_name: data.preferred_name || null,
      fun_fact: data.fun_fact || null,
      theme: data.theme,
      nav_style: data.nav_style,
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
