"use server";

import { getActor } from "@/lib/auth";
import { isBoard, PHASE_IDS } from "@/lib/constants";
import { workbookFor } from "@/lib/workbook/content";
import { phasePercent, type WorkbookPhaseData } from "@/lib/workbook/progress";
import type { PhaseId } from "@/lib/workbook/types";

export type SaveResult = { success: true; percent: number; updatedAt: string } | { success: false; error: string };

const MAX_NOTES = 20_000;
const MAX_FIELD = 5_000;
const MAX_KEY = 64;

/** Accepts only the stored shape: checks are `true`, notes and fields are bounded strings. */
function sanitize(input: unknown): WorkbookPhaseData | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const checks: Record<string, true> = {};
  if (raw.checks && typeof raw.checks === "object") {
    for (const [key, value] of Object.entries(raw.checks as Record<string, unknown>)) {
      if (value === true && key.length <= MAX_KEY) checks[key] = true;
    }
  }
  const fields: Record<string, string> = {};
  if (raw.fields && typeof raw.fields === "object") {
    for (const [key, value] of Object.entries(raw.fields as Record<string, unknown>)) {
      if (typeof value === "string" && key.length <= MAX_KEY && value !== "") fields[key] = value.slice(0, MAX_FIELD);
    }
  }
  const notes = typeof raw.notes === "string" ? raw.notes.slice(0, MAX_NOTES) : "";
  return { checks, notes, fields };
}

/** Saves one phase of the caller's own workbook. The percent is computed here, never trusted from the client. */
export async function saveWorkbookPhase(input: { positionSlug: string; phase: PhaseId; data: WorkbookPhaseData }): Promise<SaveResult> {
  const actor = await getActor();
  if (!actor || !isBoard(actor.profile.role)) return { success: false, error: "Not allowed." };
  if (!PHASE_IDS.includes(input.phase)) return { success: false, error: "Unknown phase." };
  if (!actor.profile.position_id) return { success: false, error: "You don't have a seat yet." };

  const { data: seat } = await actor.admin.from("positions").select("slug").eq("id", actor.profile.position_id).maybeSingle();
  if (!seat?.slug || seat.slug !== input.positionSlug) return { success: false, error: "You can only save the workbook for your own seat." };

  const role = workbookFor(seat.slug);
  if (!role) return { success: false, error: "This seat has no workbook." };

  const data = sanitize(input.data);
  if (!data) return { success: false, error: "Invalid workbook data." };

  const percent = phasePercent(role.phases[input.phase], data);
  const updatedAt = new Date().toISOString();
  const { error } = await actor.admin.from("workbook_progress").upsert(
    { user_id: actor.user.id, position_slug: seat.slug, phase: input.phase, data, percent_complete: percent, updated_at: updatedAt },
    { onConflict: "user_id,position_slug,phase" }
  );
  if (error) return { success: false, error: error.message };
  return { success: true, percent, updatedAt };
}
