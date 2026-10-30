/**
 * HTML email bodies. Every interpolated value goes through escapeHtml; the
 * subjects are plain text and are not escaped.
 */

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const shell = (inner: string) =>
  `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;">${inner}` +
  `<hr style="border:none;border-top:1px solid #eee;margin:24px 0;" /><p style="color:#aaa;font-size:12px;">MIST Dallas 2027 Organizing Team</p></div>`;
const h2 = (text: string) => `<h2 style="color:#1a1a1a;margin-bottom:8px;">${text}</h2>`;
const p = (text: string) => `<p style="color:#444;font-size:16px;line-height:1.6;">${text}</p>`;
const small = (text: string) => `<p style="color:#888;font-size:13px;line-height:1.5;">${text}</p>`;
const button = (href: string, label: string, color: string) =>
  `<div style="text-align:center;margin:28px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${label}</a></div>`;

export type DecisionKind = "accepted" | "rejected" | "redirected_dream_team";

export interface DecisionEmailInput {
  decision: DecisionKind;
  applicantName: string;
  roleTitle: string | null;
  siteUrl: string;
}

export function decisionEmail({ decision, applicantName, roleTitle, siteUrl }: DecisionEmailInput): { subject: string; html: string } {
  const name = escapeHtml(applicantName || "Organizer");
  const role = roleTitle ? escapeHtml(roleTitle) : null;
  const login = `${siteUrl}/login`;

  if (decision === "accepted") {
    return {
      subject: "Welcome to Our Orbit — MIST Dallas 2027",
      html: shell(
        h2(`Welcome to Our Orbit, ${name}.`) +
          p(`You've been selected to join the <strong>MIST Dallas 2027</strong> organizing team${role ? ` as <strong>${role}</strong>` : ""}.`) +
          p("Sign in with your Google account to open your role workbook, phase deliverables, and team resources.") +
          button(login, "Open the Board Portal", "#c9a84c") +
          small("If you have any issues, reply to this email or reach out to your AD.")
      ),
    };
  }

  if (decision === "rejected") {
    return {
      subject: "MIST Dallas 2027 Application Update",
      html: shell(
        h2(`Assalamu Alaikum ${name},`) +
          p(`Jazakallah khair for taking the time to apply${role ? ` for <strong>${role}</strong>` : ""} on the MIST Dallas 2027 organizing team. It genuinely means a lot that you wanted to be part of this — the fact that you showed up and put yourself out there says everything.`) +
          p("After careful review, we weren't able to move forward with your application for this role at this time. Please know this was not an easy decision, and it is not a reflection of your character or your love for this community.") +
          p("We would love to have you involved in another way — we'll be reaching out in <strong>January</strong> about joining our <strong>Dream Team</strong>, our incredible group of weekend volunteers who make the tournament come to life. It's a meaningful role and we'd be honored to have you.") +
          p("Thank you for caring about MIST Dallas. This community is better because you're in it. 🤍")
      ),
    };
  }

  return {
    subject: "Join the MIST Dallas 2027 Dream Team",
    html: shell(
      h2(`Assalamu Alaikum ${name},`) +
        p("Thank you for applying to the MIST Dallas 2027 organizing team. We'd love to have you on the <strong>Dream Team</strong>, our weekend volunteer crew that makes the tournament come to life.") +
        p("Sign in to the portal and we'll be in touch with next steps before event week.") +
        button(login, "Open the Board Portal", "#1f8a9b")
    ),
  };
}

export interface ReminderEmailInput {
  fullName: string;
  title: string;
  dateLabel: string;
  detail: string;
  daysBefore: number;
  siteUrl: string;
}

export function reminderEmail({ fullName, title, dateLabel, detail, daysBefore, siteUrl }: ReminderEmailInput): { subject: string; html: string } {
  const days = `${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  return {
    subject: `MIST Dallas deadline in ${days}: ${title}`,
    html: shell(
      h2(escapeHtml(title)) +
        p(`Assalamu alaykum ${escapeHtml(fullName || "there")},`) +
        p(`This is your MIST Dallas reminder that the following deadline is coming up in <strong>${days}</strong>.`) +
        p(`<strong>Due:</strong> ${escapeHtml(dateLabel)}`) +
        (detail ? p(escapeHtml(detail)) : "") +
        button(`${siteUrl}/portal/calendar`, "Open the Calendar", "#18798a") +
        small(`You're receiving this because you enabled deadline reminders in the portal. <a href="${escapeHtml(`${siteUrl}/portal/settings`)}">Manage preferences</a>`)
    ),
  };
}
