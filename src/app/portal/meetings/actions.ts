"use server";

import { revalidatePath } from "next/cache";
import { getActor, type ActionResult } from "@/lib/auth";
import { TEAM_LABELS } from "@/lib/constants";
import { canWriteTeam } from "@/lib/permissions";
import { DECISION_CATEGORIES, type DecisionCategory, type Team } from "@/lib/types";

export interface MeetingNoteInput {
  title: string;
  meeting_date: string;
  team: Team | null;
  agenda: string;
  blockers: string;
  action_items: string;
}

export interface DecisionInput {
  title: string;
  category: DecisionCategory;
  decision: string;
  rationale: string;
  owner_label: string;
  team: Team | null;
  decided_on: string;
}

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const validTeam = (t: Team | null) => t === null || t in TEAM_LABELS;
const CANNOT: ActionResult = { success: false, error: "You can only write for your own team." };

export async function createMeetingNote(input: MeetingNoteInput): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };
  if (!validTeam(input.team)) return { success: false, error: "Unknown team." };
  if (!canWriteTeam(actor.profile, input.team)) return CANNOT;
  const title = input.title?.trim();
  if (!title) return { success: false, error: "Give the meeting a title." };
  if (!isDate(input.meeting_date)) return { success: false, error: "Pick the meeting date." };

  const { error } = await actor.admin.from("meeting_notes").insert({
    title, meeting_date: input.meeting_date, team: input.team,
    agenda: input.agenda?.trim() ?? "", blockers: input.blockers?.trim() ?? "", action_items: input.action_items?.trim() ?? "",
    created_by: actor.user.id,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/meetings");
  return { success: true };
}

export async function deleteMeetingNote(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };
  const { data: row } = await actor.admin.from("meeting_notes").select("team").eq("id", id).maybeSingle();
  if (!row) return { success: false, error: "Meeting note not found." };
  if (!canWriteTeam(actor.profile, row.team)) return CANNOT;
  const { error } = await actor.admin.from("meeting_notes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/meetings");
  return { success: true };
}

export async function createDecision(input: DecisionInput): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };
  if (!validTeam(input.team)) return { success: false, error: "Unknown team." };
  if (!canWriteTeam(actor.profile, input.team)) return CANNOT;
  const title = input.title?.trim();
  if (!title) return { success: false, error: "Give the decision a title." };
  if (!DECISION_CATEGORIES.includes(input.category)) return { success: false, error: "Unknown category." };
  if (!isDate(input.decided_on)) return { success: false, error: "Pick the decision date." };

  const { error } = await actor.admin.from("decisions").insert({
    title, category: input.category, decision: input.decision?.trim() ?? "", rationale: input.rationale?.trim() ?? "",
    owner_label: input.owner_label?.trim() ?? "", team: input.team, decided_on: input.decided_on, created_by: actor.user.id,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/meetings");
  return { success: true };
}

export async function deleteDecision(id: string): Promise<ActionResult> {
  const actor = await getActor();
  if (!actor) return { success: false, error: "Not authenticated." };
  const { data: row } = await actor.admin.from("decisions").select("team").eq("id", id).maybeSingle();
  if (!row) return { success: false, error: "Decision not found." };
  if (!canWriteTeam(actor.profile, row.team)) return CANNOT;
  const { error } = await actor.admin.from("decisions").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/meetings");
  return { success: true };
}
