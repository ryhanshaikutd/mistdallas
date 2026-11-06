"use server";

import { revalidatePath } from "next/cache";
import { actorWithRole, type ActionResult } from "@/lib/auth";
import { AUDIENCE_LABELS, LEADERSHIP_ROLES, TEAM_LABELS } from "@/lib/constants";
import type { AnnouncementAudience, Priority, Team } from "@/lib/types";

export interface AnnouncementInput {
  id?: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audience_team: Team | null;
  priority: Priority;
  is_active: boolean;
}

const PRIORITIES: readonly Priority[] = ["low", "medium", "high", "critical"];
const NOT_ALLOWED: ActionResult = { success: false, error: "Only leadership can post announcements." };

function revalidate() {
  revalidatePath("/portal");
  revalidatePath("/portal/announcements");
}

export async function upsertAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;

  const title = input.title?.trim();
  if (!title) return { success: false, error: "Give the announcement a title." };
  if (!(input.audience in AUDIENCE_LABELS)) return { success: false, error: "Unknown audience." };
  if (!PRIORITIES.includes(input.priority)) return { success: false, error: "Unknown priority." };
  const team = input.audience === "team" ? input.audience_team : null;
  if (input.audience === "team" && (!team || !(team in TEAM_LABELS))) return { success: false, error: "Pick the team this announcement is for." };

  const row = { title, body: input.body?.trim() ?? "", audience: input.audience, audience_team: team, priority: input.priority, is_active: !!input.is_active };
  const query = input.id
    ? actor.admin.from("announcements").update(row).eq("id", input.id)
    : actor.admin.from("announcements").insert({ ...row, created_by: actor.user.id });
  const { error } = await query;
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.from("announcements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true };
}
