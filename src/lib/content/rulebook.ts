export interface RulebookEntry {
  category: string;
  color: string;
  question: string;
  answer: string;
  keywords: string[];
}

export const RULEBOOK_ENTRIES: RulebookEntry[] = [
  {
    category: "Confidentiality",
    color: "#b13f4a",
    question: "What information can organizers share outside the board?",
    answer: "Organizer planning, internal discussions, applicant details, registration data, participant records, judge details, and event issues should stay inside approved MIST Dallas channels. Share public-facing information only after leadership or communications approves it.",
    keywords: ["privacy", "confidential", "parents", "siblings", "outside", "board", "data"],
  },
  {
    category: "Professionalism",
    color: "#247a52",
    question: "What standard are organizers expected to follow?",
    answer: "Organizers are expected to communicate with ihsan, avoid drama, follow the chain of command, keep commitments, and represent MIST Dallas professionally in meetings, chats, emails, and event spaces.",
    keywords: ["ihsan", "drama", "professional", "conduct", "behavior"],
  },
  {
    category: "Roles",
    color: "#1f8a9b",
    question: "How do seats work?",
    answer: "Every seat is visible on the Teams page. Seats are assigned by leadership from the Positions page; once you hold one, your name and email appear in the directory, your workbook unlocks, and that seat counts as filled. Open seats stay visible with no personal information.",
    keywords: ["seat", "role", "directory", "open", "assigned", "workbook"],
  },
  {
    category: "Applications",
    color: "#c9972b",
    question: "What happens after someone applies?",
    answer: "Leadership reviews applications in the portal, moves them through review and interviews, and emails the decision. Accepting an application assigns the seat, so apply and sign in with the same Google account.",
    keywords: ["apply", "application", "accepted", "rejected", "interview", "email"],
  },
  {
    category: "Deadlines",
    color: "#7b61ff",
    question: "Where should organizers find deadlines?",
    answer: "The Calendar page is the deadline source of truth. Deadlines are grouped by phase, can be exported to calendar apps, and reminder emails go out daily from the portal to anyone who turns them on in Settings.",
    keywords: ["deadline", "calendar", "reminder", "phase", "export"],
  },
  {
    category: "Meetings",
    color: "#247a52",
    question: "How should meeting decisions be tracked?",
    answer: "Every meeting should end with decisions, blockers, owners, and next actions. Decisions that affect timeline, budget, roles, rooms, competitions, or public messaging should be added to the Decision Log on the Meetings page.",
    keywords: ["meeting", "decision", "blocker", "agenda", "action item"],
  },
  {
    category: "Event Weekend",
    color: "#b13f4a",
    question: "Who makes live event decisions?",
    answer: "Command Center should coordinate live event decisions. Room changes, schedule changes, major registration issues, safety concerns, and participant-facing updates should be approved through the correct lead before being announced.",
    keywords: ["event", "weekend", "command", "room", "schedule", "live"],
  },
  {
    category: "MyMIST",
    color: "#1f8a9b",
    question: "How should MyMIST data be used?",
    answer: "MyMIST remains the source of truth for registration. The portal should use MyMIST exports as planning snapshots for rosters, badges, room assignments, and check-in tools.",
    keywords: ["mymist", "registration", "export", "participants", "rosters"],
  },
];

export function searchRulebook(entries: RulebookEntry[], query: string): RulebookEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) =>
    [e.category, e.question, e.answer, ...e.keywords].some((text) => text.toLowerCase().includes(q))
  );
}
