"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { TEAM_LABELS, TEAM_ORDER, PHASE_LABELS } from "@/lib/constants";
import type { RosterRow } from "@/lib/roster";
import type { Team } from "@/lib/types";

interface Props {
  rows: RosterRow[];
  lastUpdated: Record<string, string>;
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;

export default function ProgressBoard({ rows, lastUpdated }: Props) {
  const [team, setTeam] = useState<Team | "all">("all");
  const teams = TEAM_ORDER.filter((t) => rows.some((r) => r.team === t));
  const visible = team === "all" ? rows : rows.filter((r) => r.team === team);
  const filled = rows.filter((r) => r.holder);
  const average = filled.length ? Math.round(filled.reduce((s, r) => s + r.progress, 0) / filled.length) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Organizers", value: new Set(filled.map((r) => r.holder!.id)).size },
          { label: "Seats filled", value: `${filled.length}/${rows.length}` },
          { label: "Open seats", value: rows.length - filled.length },
          { label: "Average progress", value: `${average}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4 text-center" style={card}>
            <div className="text-3xl font-bold" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...teams] as const).map((t) => (
          <button key={t} onClick={() => setTeam(t)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all"
            style={team === t
              ? { background: "#1B3464", borderColor: "#1B3464", color: "#fff" }
              : { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}>
            {t === "all" ? "All teams" : TEAM_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--p-muted)" }}>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Seat</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Team</th>
              <th className="px-5 py-3 font-semibold hidden lg:table-cell">Starts</th>
              <th className="px-5 py-3 font-semibold">Progress</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {visible.map((r) => {
              const updated = r.holder ? lastUpdated[r.holder.id] : undefined;
              return (
                <tr key={`${r.positionId}-${r.holder?.id ?? "open"}`}>
                  <td className="px-5 py-3">
                    {r.holder
                      ? <span className="font-medium" style={{ color: "var(--p-text)" }}>{r.holder.fullName || r.holder.email}</span>
                      : <span className="italic" style={{ color: "var(--p-muted)" }}>Open seat</span>}
                  </td>
                  <td className="px-5 py-3" style={{ color: "var(--p-text)" }}>{r.title}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <Link href={`/portal/teams/${r.team}`} className="hover:underline" style={{ color: "var(--p-accent)" }}>{TEAM_LABELS[r.team]}</Link>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell" style={{ color: "var(--p-muted)" }}>{PHASE_LABELS[r.startPhase]}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${r.progress}%`, background: r.holder ? "var(--p-accent-green)" : "var(--p-border)" }} />
                      </div>
                      <span className="text-xs w-9" style={{ color: "var(--p-muted)" }}>{r.holder ? `${r.progress}%` : "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-xs" style={{ color: "var(--p-muted)" }}>
                    {updated ? format(parseISO(updated), "MMM d") : r.holder ? "Not started" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
