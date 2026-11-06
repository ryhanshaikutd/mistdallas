"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { isEmailConfigured, sendEmail, siteUrl } from "@/lib/email/resend";
import { sendPasswordReset, type ResetResult } from "@/lib/login/password-reset";

export type ForgotState = { status: "idle" } | { status: "sent" } | { status: "error"; error: string };

/**
 * "Forgot password?" form. Always answers the same for known and unknown
 * emails; the email itself goes out through Resend with a one-time link.
 */
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "");
  const result: ResetResult = await sendPasswordReset(email, {
    siteUrl: siteUrl(),
    emailConfigured: isEmailConfigured(),
    send: sendEmail,
    generateLink: async (addr) => {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: addr });
      if (error) {
        // No account for this email: not an error from the user's point of view.
        if (error.status === 404 || /not found/i.test(error.message)) return { hashedToken: null, error: null };
        return { hashedToken: null, error: error.message };
      }
      return { hashedToken: data.properties?.hashed_token ?? null, error: null };
    },
  });
  return result.ok ? { status: "sent" } : { status: "error", error: result.error };
}
