"use server";

import { revalidatePath } from "next/cache";
import { actorWithRole } from "@/lib/auth";
import { LEADERSHIP_ROLES } from "@/lib/constants";
import type { ApplicationStatus } from "@/lib/types";
import { decisionEmail, type DecisionKind } from "@/lib/email/templates";
import { isEmailConfigured, sendEmail, siteUrl } from "@/lib/email/resend";

const STATUSES: readonly ApplicationStatus[] = [
  "submitted", "under_review", "interview_scheduled", "accepted", "rejected", "redirected_dream_team", "offered_different_position",
];
const EMAILED = new Set<ApplicationStatus>(["accepted", "rejected", "redirected_dream_team"]);

export type DecisionResult =
  | { success: true; emailed: boolean; emailError?: string }
  | { success: false; error: string };

function friendlySeatError(message: string): string {
  if (/position_full/.test(message)) return "That seat is full. Raise its max holders or pick another seat.";
  if (/position_not_found/.test(message)) return "That seat is not available.";
  return message;
}

/**
 * Moves an application to a new status. Accepting also assigns the chosen seat
 * (default: the applicant's first choice), and decisions email the applicant
 * when Resend is configured. Leadership only.
 */
export async function decideApplication(input: {
  applicationId: string;
  status: ApplicationStatus;
  positionId?: string | null;
}): Promise<DecisionResult> {
  const actor = await actorWithRole(LEADERSHIP_ROLES);
  if (!actor) return { success: false, error: "Only leadership can review applications." };
  if (!STATUSES.includes(input.status)) return { success: false, error: "Unknown status." };
  const { admin } = actor;

  const { data: app } = await admin
    .from("applications")
    .select("id, applicant_id, applicant_name, applicant_email, status, application_rankings(rank, position_id)")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (!app) return { success: false, error: "Application not found." };

  const rankings = ([...(app.application_rankings ?? [])] as { rank: number; position_id: string }[]).sort((a, b) => a.rank - b.rank);
  let roleTitle: string | null = null;
  const patch: Record<string, unknown> = { status: input.status };

  if (input.status === "accepted") {
    const positionId = input.positionId || rankings[0]?.position_id;
    if (!positionId) return { success: false, error: "Choose a seat to assign before accepting." };
    const { data: pos } = await admin.from("positions").select("id, slug, title, is_active").eq("id", positionId).maybeSingle();
    if (!pos?.slug || !pos.is_active) return { success: false, error: "That seat is not available." };
    const { error: seatErr } = await admin.rpc("assign_seat", { p_profile_id: app.applicant_id, p_position_slug: pos.slug });
    if (seatErr) return { success: false, error: friendlySeatError(seatErr.message) };
    roleTitle = pos.title;
    patch.alternate_position_id = rankings[0]?.position_id === pos.id ? null : pos.id;
  } else if (rankings[0]) {
    const { data: pos } = await admin.from("positions").select("title").eq("id", rankings[0].position_id).maybeSingle();
    roleTitle = pos?.title ?? null;
  }

  const { error } = await admin.from("applications").update(patch).eq("id", app.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/portal/review");
  revalidatePath("/portal");

  let emailed = false;
  let emailError: string | undefined;
  if (EMAILED.has(input.status)) {
    if (!isEmailConfigured()) {
      emailError = "email is not configured";
    } else {
      const { subject, html } = decisionEmail({
        decision: input.status as DecisionKind,
        applicantName: app.applicant_name,
        roleTitle,
        siteUrl: siteUrl(),
      });
      const sent = await sendEmail({ to: app.applicant_email, subject, html });
      if (sent.ok) emailed = true;
      else emailError = sent.error;
    }
  }
  return { success: true, emailed, emailError };
}
