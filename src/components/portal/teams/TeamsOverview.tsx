import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { TEAM_LABELS, TEAM_ORDER, PHASE_LABELS } from "@/lib/constants";
import type { RosterRow, TeamReadiness } from "@/lib/roster";

interface Props {
  readiness: TeamReadiness[];
  rows: RosterRow[];
}

export default function TeamsOverview({ readiness, rows }: Props) {
  const byTeam = new Map(readiness.map((t) => [t.team, t]));
  const totals = {
    seats: rows.length,
    filled: rows.filter((r) => r.holder).length,
    open: rows.filter((r) => !r.holder).length,
    progress: rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Seats", value: totals.seats },
          { label: "Filled", value: totals.filled },
          { label: "Open", value: totals.open },
          { label: "Avg. progress", value: `${totals.progress}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4 text-center" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" }}>
            <div className="text-3xl font-bold" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM_ORDER.map((team) => {
          const t = byTeam.get(team);
          if (!t) return null;
          return (
            <Link key={team} href={`/portal/teams/${team}`}
              className="group rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg"
              style={{ background: "var(--p-card)", borderColor: t.open ? "#F59E0B60" : "var(--p-border)", boxShadow: "var(--p-shadow)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{TEAM_LABELS[team]}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--p-muted)" }}>
                    {t.filled} of {t.total} seats filled · starts {t.starts.map((p) => PHASE_LABELS[p]).join(", ")}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--p-accent)" + "18" }}>
                  <Users className="w-4 h-4" style={{ color: "var(--p-accent)" }} />
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
                <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: "var(--p-accent-green)" }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span style={{ color: "var(--p-muted)" }}>{t.progress}% workbook progress</span>
                <span className="font-medium" style={{ color: t.open ? "#F59E0B" : "var(--p-accent-green)" }}>
                  {t.open ? `${t.open} open seat${t.open === 1 ? "" : "s"}` : "Fully staffed"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--p-accent)" }}>
                Open team page <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
