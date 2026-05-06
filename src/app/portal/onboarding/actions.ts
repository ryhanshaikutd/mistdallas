"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function completeOnboarding(data: {
  preferred_name: string;
  fun_fact: string;
  theme: "light" | "dark";
  nav_style: "sidebar" | "topnav";
}) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use admin client so RLS can never block this write
  const admin = await createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      preferred_name: data.preferred_name || null,
      fun_fact: data.fun_fact || null,
      theme: data.theme,
      nav_style: data.nav_style,
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) {
    console.error("completeOnboarding error:", error.message);
    throw new Error("Failed to save your preferences. Please try again.");
  }

  redirect("/portal");
}
