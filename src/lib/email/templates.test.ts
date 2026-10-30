import { describe, it, expect } from "vitest";
import { escapeHtml, decisionEmail, reminderEmail } from "@/lib/email/templates";

const SITE = "https://mistdallas.org";

describe("escapeHtml", () => {
  it("escapes the five HTML metacharacters", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#039;");
  });
});

describe("decisionEmail", () => {
  it("accepted: welcomes by name, names the seat, links to sign-in, no invite link", () => {
    const { subject, html } = decisionEmail({ decision: "accepted", applicantName: "Zed", roleTitle: "Marketing Lead", siteUrl: SITE });
    expect(subject).toBe("Welcome to Our Orbit — MIST Dallas 2027");
    expect(html).toContain("Welcome to Our Orbit, Zed.");
    expect(html).toContain("<strong>Marketing Lead</strong>");
    expect(html).toContain(`${SITE}/login`);
    expect(html).not.toMatch(/expire/i);
  });

  it("accepted without a seat title still reads naturally", () => {
    const { html } = decisionEmail({ decision: "accepted", applicantName: "Zed", roleTitle: null, siteUrl: SITE });
    expect(html).toContain("organizing team");
    expect(html).not.toContain("as <strong>");
  });

  it("rejected: the handbook's heartfelt note with the January Dream Team mention", () => {
    const { subject, html } = decisionEmail({ decision: "rejected", applicantName: "Zed", roleTitle: "Arts Coordinator", siteUrl: SITE });
    expect(subject).toBe("MIST Dallas 2027 Application Update");
    expect(html).toContain("Dream Team");
    expect(html).toContain("January");
    expect(html).toContain("Arts Coordinator");
  });

  it("redirected: invites to the Dream Team and links to sign-in", () => {
    const { subject, html } = decisionEmail({ decision: "redirected_dream_team", applicantName: "Zed", roleTitle: null, siteUrl: SITE });
    expect(subject).toBe("Join the MIST Dallas 2027 Dream Team");
    expect(html).toContain(`${SITE}/login`);
  });

  it("escapes names and titles in every variant", () => {
    for (const decision of ["accepted", "rejected", "redirected_dream_team"] as const) {
      const { html } = decisionEmail({ decision, applicantName: "<script>alert(1)</script>", roleTitle: "<i>x</i>", siteUrl: SITE });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<i>x</i>");
    }
  });
});

describe("reminderEmail", () => {
  it("pluralises the lead time and links to the calendar and settings", () => {
    const one = reminderEmail({ fullName: "Zed", title: "Budgets due", dateLabel: "Nov 7", detail: "No extensions.", daysBefore: 1, siteUrl: SITE });
    expect(one.subject).toBe("MIST Dallas deadline in 1 day: Budgets due");
    const seven = reminderEmail({ fullName: "Zed", title: "Budgets <due>", dateLabel: "Nov 7", detail: "", daysBefore: 7, siteUrl: SITE });
    expect(seven.subject).toBe("MIST Dallas deadline in 7 days: Budgets <due>");
    expect(seven.html).toContain("Budgets &lt;due&gt;");
    expect(seven.html).toContain(`${SITE}/portal/calendar`);
    expect(seven.html).toContain(`${SITE}/portal/settings`);
    expect(seven.html).toContain("Assalamu alaykum Zed");
  });
});
