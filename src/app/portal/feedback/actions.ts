"use server";

import { revalidatePath } from "next/cache";
import { actorWithRole, type ActionResult } from "@/lib/auth";
import { LEADERSHIP_ROLES, PHASE_ENUM, PHASE_IDS } from "@/lib/constants";
import type { PhaseId } from "@/lib/workbook/types";

export interface FeedbackThemeInput {
  id?: string;
  theme: string;
  source: string;
  sentiment: string;
  owner_label: string;
  phase: PhaseId | null;
  status: string;
  color: string | null;
  action: string;
  sort_order: number;
}

const NOT_ALLOWED: ActionResult = { success: false, error: "Only leadership can edit feedback themes." };

export async function upsertFeedbackTheme(input: FeedbackThemeInput): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const theme = input.theme?.trim();
  if (!theme) return { success: false, error: "Name the theme." };
  if (input.phase !== null && !PHASE_IDS.includes(input.phase)) return { success: false, error: "Unknown phase." };
  if (input.color && !/^#[0-9a-fA-F]{6}$/.test(input.color)) return { success: false, error: "Colour must be a hex value like #1f8a9b." };

  const row = {
    theme, source: input.source?.trim() ?? "", sentiment: input.sentiment?.trim() ?? "", owner_label: input.owner_label?.trim() ?? "",
    phase: input.phase ? PHASE_ENUM[input.phase] : null, status: input.status?.trim() || "Open", color: input.color || null,
    action: input.action?.trim() ?? "", sort_order: Number.isInteger(input.sort_order) ? input.sort_order : 0,
  };
  const query = input.id
    ? actor.admin.from("feedback_themes").update(row).eq("id", input.id)
    : actor.admin.from("feedback_themes").insert({ ...row, created_by: actor.user.id });
  const { error } = await query;
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/feedback");
  return { success: true };
}

export async function deleteFeedbackTheme(id: string): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.from("feedback_themes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/feedback");
  return { success: true };
}
