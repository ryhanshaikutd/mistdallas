/** Thin Resend client over fetch. Configured by RESEND_API_KEY and RESEND_FROM_EMAIL. */

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

/** Absolute site URL for links in emails; falls back to the production domain. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://mistdallas.org").replace(/\/$/, "");
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<SendResult> {
  if (!isEmailConfigured()) return { ok: false, error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [input.to], subject: input.subject, html: input.html }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: body.message ?? `Resend responded ${res.status}` };
    return { ok: true, id: body.id ?? "" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach Resend." };
  }
}
