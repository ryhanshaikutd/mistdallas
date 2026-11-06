export interface MeetingTemplate {
  title: string;
  cadence: string;
  owner: string;
  prompts: string[];
}

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    title: "Weekly Leadership Check-In",
    cadence: "Weekly",
    owner: "RD / ADs",
    prompts: [
      "What changed since the last meeting?",
      "Which teams are blocked?",
      "Which deadlines need escalation?",
      "What decisions need to be made today?",
    ],
  },
  {
    title: "Team Director Sync",
    cadence: "Weekly or biweekly",
    owner: "Directors",
    prompts: [
      "Progress since last check-in",
      "Open roles or staffing gaps",
      "Cross-team dependencies",
      "Next actions before the next meeting",
    ],
  },
  {
    title: "Event Week Command Briefing",
    cadence: "Daily during event week",
    owner: "Command Center",
    prompts: [
      "Room or schedule changes",
      "Competition delays",
      "Check-in / badge issues",
      "Escalations and owner assignments",
    ],
  },
];
