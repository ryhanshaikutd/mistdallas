"use server";

import { revalidatePath } from "next/cache";
import { actorWithRole, type ActionResult } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/lib/constants";

const NOT_ALLOWED_MESSAGE = "Only leadership can change seats.";
const NOT_ALLOWED: ActionResult = { success: false, error: NOT_ALLOWED_MESSAGE };

function revalidateSeats() {
  for (const p of ["/portal/positions", "/portal/teams", "/portal/directory", "/portal/progress", "/portal/command", "/portal"]) {
    revalidatePath(p);
  }
}

function friendlySeatError(message: string): string {
  if (/position_full/.test(message)) return "That seat is full.";
  if (/position_not_found/.test(message)) return "That seat no longer exists.";
  if (/profile_not_found/.test(message)) return "That person no longer has a profile.";
  if (/forbidden/.test(message)) return NOT_ALLOWED_MESSAGE;
  return message;
}

export async function setPositionOpen(positionId: string, open: boolean): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.from("positions").update({ open_for_applications: open }).eq("id", positionId);
  if (error) return { success: false, error: error.message };
  revalidateSeats();
  revalidatePath("/portal/apply");
  return { success: true };
}

export async function setMaxHolders(positionId: string, max: number | null): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  if (max !== null && (!Number.isInteger(max) || max < 1)) return { success: false, error: "Max holders must be a whole number of at least 1, or blank for unlimited." };
  const { error } = await actor.admin.from("positions").update({ max_holders: max }).eq("id", positionId);
  if (error) return { success: false, error: error.message };
  revalidateSeats();
  return { success: true };
}

export async function assignSeat(profileId: string, positionSlug: string): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.rpc("assign_seat", { p_profile_id: profileId, p_position_slug: positionSlug });
  if (error) return { success: false, error: friendlySeatError(error.message) };
  revalidateSeats();
  return { success: true };
}

export async function unassignSeat(profileId: string): Promise<ActionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return NOT_ALLOWED;
  const { error } = await actor.admin.rpc("unassign_seat", { p_profile_id: profileId });
  if (error) return { success: false, error: friendlySeatError(error.message) };
  revalidateSeats();
  return { success: true };
}
