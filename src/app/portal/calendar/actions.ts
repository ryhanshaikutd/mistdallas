"use server";

import { revalidatePath } from "next/cache";
import { format, parseISO } from "date-fns";
import { actorWithRole, type ActionResult } from "@/lib/auth";
import { LEADERSHIP_ROLES, PHASE_ENUM, PHASE_IDS, TEAM_LABELS } from "@/lib/constants";
import type { Priority, Team } from "@/lib/types";
import type { PhaseId } from "@/lib/workbook/types";

export interface MilestoneInput {
  id?: string;
  title: string;
  description: string;
  target_date: string;
  phase: PhaseId | null;
  priority: Priority;
  deadline_type: string;
  owner_label: string;
  send_reminders: boolean;
  date_label: string | null;
  team: Team | null;
}

const PRIORITIES: readonly Priority[] = ["low", "medium", "high", "critical"];
const NOT_ALLOWED: ActionResult = { success: false, error: "Only leadership can edit deadlines." };

function revalidate() {
  for (const p of ["/portal/calendar", "/portal/timeline", "/portal", "/portal/command", "/portal/planning"]) revalidatePath(p);
}

export async function upsertMilestone(input: MilestoneInput): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;

  const title = input.title?.trim();
  if (!title) return { success: false, error: "Give the deadline a title." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.target_date ?? "") || Number.isNaN(Date.parse(`${input.target_date}T00:00:00Z`))) {
    return { success: false, error: "Pick a valid date." };
  }
  if (!PRIORITIES.includes(input.priority)) return { success: false, error: "Unknown priority." };
  if (input.phase !== null && !PHASE_IDS.includes(input.phase)) return { success: false, error: "Unknown phase." };
  if (input.team !== null && !(input.team in TEAM_LABELS)) return { success: false, error: "Unknown team." };

  const row = {
    title,
    description: input.description?.trim() || null,
    target_date: input.target_date,
    phase: input.phase ? PHASE_ENUM[input.phase] : null,
    priority: input.priority,
    deadline_type: input.deadline_type?.trim() || "Deadline",
    owner_label: input.owner_label?.trim() || "All Teams",
    send_reminders: !!input.send_reminders,
    date_label: input.date_label?.trim() || format(parseISO(input.target_date), "MMM d"),
    team: input.team,
    is_recurring: false,
  };

  const query = input.id
    ? actor.admin.from("milestones").update(row).eq("id", input.id)
    : actor.admin.from("milestones").insert({ ...row, created_by: actor.user.id });
  const { error } = await query;
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true };
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.from("milestones").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true };
}
