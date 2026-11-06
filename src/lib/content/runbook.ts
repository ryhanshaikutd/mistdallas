export interface RunbookSection {
  title: string;
  color: string;
  owner: string;
  items: string[];
}

export const RUNBOOK_SECTIONS: RunbookSection[] = [
  {
    title: "Command Center",
    color: "#1f8a9b",
    owner: "RD, ADs, Ops",
    items: [
      "Keep the master schedule, room changes, and escalation log open.",
      "Route every issue to one owner and one next action.",
      "Protect organizers from duplicate instructions by making Command Center the final source of truth.",
    ],
  },
  {
    title: "Main Check-In",
    color: "#247a52",
    owner: "Registration + Ops",
    items: [
      "Verify registration status before badge pickup.",
      "Use badge code, QR, or NFC UID as the event-week identity key.",
      "Escalate missing registration, wrong school, or competition conflicts immediately.",
    ],
  },
  {
    title: "Competition Rooms",
    color: "#7b61ff",
    owner: "Competitions + Room Captains",
    items: [
      "Check students into the correct room/time block before a round starts.",
      "Report no-shows, wrong-room scans, and judge delays to Command Center.",
      "Do not move a competition room without Ops and Comms approval.",
    ],
  },
  {
    title: "Communications",
    color: "#c9972b",
    owner: "Ops 2 + PR",
    items: [
      "Only send public updates after confirming with Command Center.",
      "Use one message for each change: what changed, who is affected, where to go, and when.",
      "Keep internal updates separate from participant-facing announcements.",
    ],
  },
  {
    title: "Escalations",
    color: "#b13f4a",
    owner: "RD / ADs",
    items: [
      "Safety, privacy, parent concerns, and conduct issues go straight to leadership.",
      "Document who reported the issue, what happened, what action was taken, and whether follow-up is needed.",
      "When unsure, escalate early instead of improvising.",
    ],
  },
];
