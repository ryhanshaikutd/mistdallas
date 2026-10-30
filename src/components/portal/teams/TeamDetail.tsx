import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Lock, Unlock } from "lucide-react";
import { TEAM_LABELS, PHASE_LABELS, ROLE_TIER_LABELS } from "@/lib/constants";
import { deadlineTiming } from "@/lib/deadlines";
import { workbookFor } from "@/lib/workbook/content";
import type { RosterRow } from "@/lib/roster";
import type { Milestone, Position, Team } from "@/lib/types";

interface Props {
  team: Team;
  rows: RosterRow[];
  allPositions: Position[];
  deadlines: Milestone[];
  today: string;
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;

export default function TeamDetail({ team, rows, allPositions, deadlines, today }: Props) {
  const filled = rows.filter((r) => r.holder).length;
  const progress = rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0;
  const titleBySlug = new Map(allPositions.filter((p) => p.slug).map((p) => [p.slug as string, p.title]));
  const openSeats = rows.filter((r) => !r.holder);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal/teams" className="inline-flex items-center gap-1 text-xs font-medium mb-2" style={{ color: "var(--p-accent)" }}>
            <ArrowLeft className="w-3 h-3" /> All teams
          </Link>
          <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{TEAM_LABELS[team]}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--p-muted)" }}>{filled} of {rows.length} seats filled · {progress}% average workbook progress</p>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={card}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--p-border)" }}>
          <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Seats</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
          {rows.map((row) => {
            const role = workbookFor(row.slug);
            const preview = role?.phases[row.startPhase]?.responsibilities.slice(0, 3) ?? [];
            const initial = (row.holder?.fullName || row.holder?.email || "?").charAt(0).toUpperCase();
            return (
              <div key={`${row.positionId}-${row.holder?.id ?? "open"}`} className="px-5 py-4 grid gap-4 md:grid-cols-[1.2fr_1fr_1.3fr]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: row.holder ? "linear-gradient(135deg, #2E7BC4, #2EA87A)" : "var(--p-border)" }}>
                    {row.holder ? initial : "·"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm" style={{ color: "var(--p-text)" }}>{row.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>
                      {ROLE_TIER_LABELS[row.tier]} · starts {PHASE_LABELS[row.startPhase]}
                      {row.reportsToSlug && titleBySlug.get(row.reportsToSlug) && <> · reports to {titleBySlug.get(row.reportsToSlug)}</>}
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  {row.holder ? (
                    <>
                      <div className="text-sm font-medium truncate" style={{ color: "var(--p-text)" }}>{row.holder.fullName || row.holder.email}</div>
                      <a href={`mailto:${row.holder.email}`} className="text-xs truncate block hover:underline" style={{ color: "var(--p-accent)" }}>{row.holder.email}</a>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${row.progress}%`, background: "var(--p-accent-green)" }} />
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{row.progress}% workbook progress</div>
                    </>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={row.openForApplications ? { background: "#2EA87A20", color: "#2EA87A" } : { background: "var(--p-card-hover)", color: "var(--p-muted)" }}>
                      {row.openForApplications ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {row.openForApplications ? "Open seat · accepting applications" : "Open seat"}
                    </div>
                  )}
                </div>
                <ul className="text-xs space-y-1" style={{ color: "var(--p-text-secondary)" }}>
                  {preview.map((item) => <li key={item} className="truncate">• {item}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
              <Calendar className="w-4 h-4" style={{ color: "var(--p-accent)" }} /> Upcoming deadlines
            </h3>
            <Link href="/portal/calendar" className="text-xs font-medium" style={{ color: "var(--p-accent)" }}>Calendar</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {deadlines.length === 0 && <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--p-muted)" }}>Nothing upcoming for this team.</p>}
            {deadlines.map((m) => {
              const timing = deadlineTiming(m.target_date, today);
              return (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--p-text)" }}>{m.title}</div>
                    <div className="text-xs" style={{ color: "var(--p-muted)" }}>{m.target_date && format(parseISO(m.target_date), "MMM d, yyyy")} · {m.owner_label}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--p-card-hover)", color: timing.daysAway !== null && timing.daysAway <= 3 ? "#F59E0B" : "var(--p-muted)" }}>{timing.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--p-border)" }}>
            <h3 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Open seats</h3>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {openSeats.length === 0 && <p className="px-5 py-6 text-sm text-center" style={{ color: "var(--p-muted)" }}>Every seat on this team is filled.</p>}
            {openSeats.map((row) => (
              <div key={row.positionId} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--p-text)" }}>{row.title}</div>
                  <div className="text-xs" style={{ color: "var(--p-muted)" }}>Starts {PHASE_LABELS[row.startPhase]}</div>
                </div>
                <span className="text-xs" style={{ color: row.openForApplications ? "#2EA87A" : "var(--p-muted)" }}>
                  {row.openForApplications ? "Accepting applications" : "Not yet open"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
