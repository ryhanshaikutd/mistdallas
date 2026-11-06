import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ArrowRight, Briefcase, CalendarClock, Radar } from "lucide-react";
import { TEAM_LABELS, PHASE_LABELS } from "@/lib/constants";
import { deadlineTiming } from "@/lib/deadlines";
import type { RosterRow, TeamReadiness } from "@/lib/roster";
import type { Milestone } from "@/lib/types";

interface Props {
  readiness: TeamReadiness[];
  attention: TeamReadiness[];
  openSeats: RosterRow[];
  overdue: Milestone[];
  dueThisWeek: Milestone[];
  next: Milestone[];
  todayIso: string;
  canManageSeats: boolean;
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;

export default function CommandCenter({ readiness, attention, openSeats, overdue, dueThisWeek, next, todayIso, canManageSeats }: Props) {
  const attentionTeams = new Set(attention.map((t) => t.team));
  const tiles = [
    { label: "Open seats", value: openSeats.length, tone: openSeats.length ? "#F59E0B" : "var(--p-accent-green)", hint: openSeats.length ? "Applications and seat assignments should focus here first." : "Every seat is filled." },
    { label: "Due this week", value: dueThisWeek.length, tone: dueThisWeek.length ? "var(--p-accent)" : "var(--p-muted)", hint: dueThisWeek.length ? "Check these at the next stand-up." : "No deadline pressure in the next 7 days." },
    { label: "Overdue", value: overdue.length, tone: overdue.length ? "#EF4444" : "var(--p-accent-green)", hint: overdue.length ? "Needs follow-up or a new date." : "Nothing overdue." },
    { label: "Teams needing attention", value: attention.length, tone: attention.length ? "#F59E0B" : "var(--p-accent-green)", hint: "Open seats or workbook progress under 35%." },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border p-5 flex items-start gap-3" style={card}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--p-accent)" + "18" }}>
          <Radar className="w-4 h-4" style={{ color: "var(--p-accent)" }} />
        </div>
        <div>
          <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Command Center</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--p-muted)" }}>Staffing, deadlines and readiness in one place, as of {format(parseISO(todayIso), "EEEE, MMMM d")}.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border p-4" style={card}>
            <div className="text-xs" style={{ color: "var(--p-muted)" }}>{t.label}</div>
            <div className="text-3xl font-bold mt-1" style={{ color: t.tone, fontFamily: "var(--font-syne)" }}>{t.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{t.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        {/* Team readiness */}
        <section className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
            <div>
              <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Team readiness</h3>
              <p className="text-xs" style={{ color: "var(--p-muted)" }}>Teams with open seats or lower progress first.</p>
            </div>
            <Link href="/portal/teams" className="text-xs font-medium" style={{ color: "var(--p-accent)" }}>All teams</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {readiness.map((t) => (
              <div key={t.team} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--p-text)" }}>{TEAM_LABELS[t.team]}</span>
                    {attentionTeams.has(t.team) && <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />}
                  </div>
                  <div className="text-xs" style={{ color: "var(--p-muted)" }}>
                    {t.filled}/{t.total} filled · {t.open} open · starts {t.starts.map((p) => PHASE_LABELS[p]).join(", ")}
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: t.progress < 35 ? "#F59E0B" : "var(--p-accent-green)" }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{t.progress}%</div>
                  <Link href={`/portal/teams/${t.team}`} className="text-xs font-medium inline-flex items-center gap-1" style={{ color: "var(--p-accent)" }}>
                    Open <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          {/* Deadline watch */}
          <section className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
                <CalendarClock className="w-4 h-4" style={{ color: "var(--p-accent)" }} /> Deadline watch
              </h3>
              <Link href="/portal/calendar" className="text-xs font-medium" style={{ color: "var(--p-accent)" }}>Calendar</Link>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
              {overdue.slice(0, 3).map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3" style={{ background: "#EF444408" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--p-text)" }}>{m.title}</div>
                    <div className="text-xs" style={{ color: "var(--p-muted)" }}>{m.owner_label}</div>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#EF4444" }}>{deadlineTiming(m.target_date, todayIso).label}</span>
                </div>
              ))}
              {next.map((m) => {
                const timing = deadlineTiming(m.target_date, todayIso);
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--p-text)" }}>{m.title}</div>
                      <div className="text-xs" style={{ color: "var(--p-muted)" }}>{m.target_date && format(parseISO(m.target_date), "MMM d")} · {m.owner_label}</div>
                    </div>
                    <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: timing.daysAway !== null && timing.daysAway <= 3 ? "#F59E0B" : "var(--p-muted)" }}>{timing.label}</span>
                  </div>
                );
              })}
              {overdue.length === 0 && next.length === 0 && <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--p-muted)" }}>No upcoming deadlines.</p>}
            </div>
          </section>

          {/* Open seats */}
          <section className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
                <Briefcase className="w-4 h-4" style={{ color: "var(--p-accent)" }} /> Open seats
              </h3>
              {canManageSeats && <Link href="/portal/positions" className="text-xs font-medium" style={{ color: "var(--p-accent)" }}>Manage</Link>}
            </div>
            <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
              {openSeats.length === 0 && <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--p-muted)" }}>Every seat is filled.</p>}
              {openSeats.slice(0, 8).map((r) => (
                <div key={r.positionId} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--p-text)" }}>{r.title}</div>
                    <div className="text-xs" style={{ color: "var(--p-muted)" }}>{TEAM_LABELS[r.team]} · starts {PHASE_LABELS[r.startPhase]}</div>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: r.openForApplications ? "var(--p-accent-green)" : "var(--p-muted)" }}>
                    {r.openForApplications ? "Accepting applications" : "Not open"}
                  </span>
                </div>
              ))}
              {openSeats.length > 8 && <p className="px-5 py-2 text-xs" style={{ color: "var(--p-muted)" }}>+{openSeats.length - 8} more</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
