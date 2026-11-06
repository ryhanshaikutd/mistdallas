/**
 * Password reset by email. The app sends the email itself (through Resend)
 * instead of Supabase's built-in mailer, which only delivers to members of
 * the Supabase project and is limited to a couple of emails an hour.
 *
 * The link carries the hashed recovery token to /auth/confirm, which turns it
 * into a session and forwards to the set-a-new-password page. Nothing here
 * reveals whether an email has an account.
 */
import { passwordResetEmail } from "@/lib/email/templates";
import type { SendResult } from "@/lib/email/resend";

export const RESET_PASSWORD_PATH = "/auth/reset-password";

export interface ResetDeps {
  siteUrl: string;
  emailConfigured: boolean;
  /** Returns the hashed recovery token for the email, or null when no account exists. */
  generateLink: (email: string) => Promise<{ hashedToken: string | null; error: string | null }>;
  send: (input: { to: string; subject: string; html: string }) => Promise<SendResult>;
}

export type ResetResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildResetLink(siteUrl: string, hashedToken: string): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type: "recovery", next: RESET_PASSWORD_PATH });
  return `${siteUrl.replace(/\/$/, "")}/auth/confirm?${params.toString()}`;
}

export async function sendPasswordReset(rawEmail: string, deps: ResetDeps): Promise<ResetResult> {
  const email = (rawEmail ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!deps.emailConfigured) {
    return { ok: false, error: "Password reset emails aren't set up yet. Ask a board lead to help you sign in." };
  }

  const { hashedToken, error } = await deps.generateLink(email);
  if (error) {
    console.error("[password-reset] generateLink failed:", error);
    return { ok: false, error: "We couldn't start a reset right now. Try again in a minute." };
  }
  // Unknown account: same answer as a known one, no email.
  if (!hashedToken) return { ok: true };

  const { subject, html } = passwordResetEmail({ resetUrl: buildResetLink(deps.siteUrl, hashedToken) });
  const sent = await deps.send({ to: email, subject, html });
  if (!sent.ok) {
    console.error("[password-reset] send failed:", sent.error);
    return { ok: false, error: "We couldn't send the email right now. Try again in a minute." };
  }
  return { ok: true };
}
