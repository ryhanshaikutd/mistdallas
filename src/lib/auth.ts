/**
 * Server-side auth helpers shared by every portal page and server action.
 *
 * Pages call the require* variants (they redirect). Server actions call
 * getActor() and return a friendly error instead of redirecting.
 */
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isBoard, isLeadership } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export interface Actor {
  user: User;
  profile: Profile;
  /** Client bound to the caller's session; reads go through RLS. */
  supabase: SupabaseClient;
  /** Service-role client for writes, after the action has checked permissions. */
  admin: SupabaseClient;
}

export type ActionResult = { success: true } | { success: false; error: string };

/** The signed-in user and their profile, or null when nobody is signed in. */
export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  let { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile && user.email) {
    // The signup trigger normally creates this row; heal the rare miss.
    const { data: created } = await admin
      .from("profiles")
      .upsert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name ?? "" }, { onConflict: "id" })
      .select("*")
      .maybeSingle();
    profile = created;
  }
  if (!profile) return null;
  return { user, profile: profile as Profile, supabase, admin };
}

export async function requireUser(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function requireRole(roles: readonly string[]): Promise<Actor> {
  const actor = await requireUser();
  if (!roles.includes(actor.profile.role)) redirect("/portal");
  return actor;
}

export async function requireBoard(): Promise<Actor> {
  const actor = await requireUser();
  if (!isBoard(actor.profile.role)) redirect("/portal");
  return actor;
}

export async function requireLeadership(): Promise<Actor> {
  const actor = await requireUser();
  if (!isLeadership(actor.profile.role)) redirect("/portal");
  return actor;
}

/** For server actions: the actor if they hold one of `roles`, else null. */
export async function actorWithRole(roles: readonly string[]): Promise<Actor | null> {
  const actor = await getActor();
  return actor && roles.includes(actor.profile.role) ? actor : null;
}
