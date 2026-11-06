import { describe, it, expect, vi } from "vitest";
import { buildResetLink, sendPasswordReset, type ResetDeps } from "@/lib/login/password-reset";

const SITE = "https://mistdallas.org";

function deps(over: Partial<ResetDeps> = {}): ResetDeps & { send: ReturnType<typeof vi.fn>; generateLink: ReturnType<typeof vi.fn> } {
  const generateLink = vi.fn(async () => ({ hashedToken: "tok123" as string | null, error: null as string | null }));
  const send = vi.fn(async () => ({ ok: true as const, id: "em_1" }));
  return { siteUrl: SITE, emailConfigured: true, generateLink, send, ...over } as never;
}

describe("buildResetLink", () => {
  it("points at /auth/confirm with the hashed token, recovery type and the reset page as next", () => {
    const url = new URL(buildResetLink(SITE, "abc/def"));
    expect(url.origin + url.pathname).toBe(`${SITE}/auth/confirm`);
    expect(url.searchParams.get("token_hash")).toBe("abc/def");
    expect(url.searchParams.get("type")).toBe("recovery");
    expect(url.searchParams.get("next")).toBe("/auth/reset-password");
  });
});

describe("sendPasswordReset", () => {
  it("rejects a malformed email without touching auth", async () => {
    const d = deps();
    const r = await sendPasswordReset("not-an-email", d);
    expect(r).toEqual({ ok: false, error: "Enter a valid email address." });
    expect(d.generateLink).not.toHaveBeenCalled();
  });

  it("fails clearly when email sending is not configured", async () => {
    const d = deps({ emailConfigured: false });
    const r = await sendPasswordReset("a@b.co", d);
    expect(r.ok).toBe(false);
    expect(d.generateLink).not.toHaveBeenCalled();
  });

  it("sends a reset email with the link for a known account", async () => {
    const d = deps();
    const r = await sendPasswordReset("  Lead@Board.Test ", d);
    expect(r).toEqual({ ok: true });
    expect(d.generateLink).toHaveBeenCalledWith("lead@board.test");
    const [{ to, subject, html }] = d.send.mock.calls[0] as [{ to: string; subject: string; html: string }];
    expect(to).toBe("lead@board.test");
    expect(subject).toMatch(/password/i);
    expect(html).toContain(`${SITE}/auth/confirm?token_hash=tok123`);
  });

  it("answers the same for an unknown account and sends nothing", async () => {
    const d = deps({ generateLink: vi.fn(async () => ({ hashedToken: null, error: null })) });
    const r = await sendPasswordReset("nobody@board.test", d);
    expect(r).toEqual({ ok: true });
    expect(d.send).not.toHaveBeenCalled();
  });

  it("surfaces a send failure instead of pretending", async () => {
    const d = deps({ send: vi.fn(async () => ({ ok: false as const, error: "Resend responded 500" })) });
    const r = await sendPasswordReset("lead@board.test", d);
    expect(r).toEqual({ ok: false, error: "We couldn't send the email right now. Try again in a minute." });
  });
});
