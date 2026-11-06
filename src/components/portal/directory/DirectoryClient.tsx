"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { TEAM_LABELS, ROLE_TIER_LABELS, PHASE_LABELS } from "@/lib/constants";
import type { RosterRow } from "@/lib/roster";

interface Props { rows: RosterRow[] }

export default function DirectoryClient({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [onlyFilled, setOnlyFilled] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (onlyFilled && !r.holder) return false;
    if (!q) return true;
    const hay = [r.holder?.fullName, r.holder?.email, r.title, TEAM_LABELS[r.team], r.slug].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--p-muted)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, seats, teams…"
            aria-label="Search the directory"
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none"
            style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--p-text-secondary)" }}>
          <input type="checkbox" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} className="accent-[#2E7BC4]" />
          People only
        </label>
        <span className="text-xs" style={{ color: "var(--p-muted)" }}>{filtered.length} of {rows.length}</span>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--p-muted)" }}>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Seat</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Team</th>
              <th className="px-5 py-3 font-semibold hidden lg:table-cell">Email</th>
              <th className="px-5 py-3 font-semibold">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--p-border)" }}>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center" style={{ color: "var(--p-muted)" }}>No matches.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={`${r.positionId}-${r.holder?.id ?? "open"}`}>
                <td className="px-5 py-3">
                  {r.holder ? (
                    <span className="font-medium" style={{ color: "var(--p-text)" }}>{r.holder.fullName || r.holder.email}</span>
                  ) : (
                    <span className="italic" style={{ color: "var(--p-muted)" }}>Open seat</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div style={{ color: "var(--p-text)" }}>{r.title}</div>
                  <div className="text-xs" style={{ color: "var(--p-muted)" }}>{ROLE_TIER_LABELS[r.tier]} · {PHASE_LABELS[r.startPhase]}</div>
                </td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <Link href={`/portal/teams/${r.team}`} className="hover:underline" style={{ color: "var(--p-accent)" }}>{TEAM_LABELS[r.team]}</Link>
                </td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  {r.holder && <a href={`mailto:${r.holder.email}`} className="hover:underline" style={{ color: "var(--p-text-secondary)" }}>{r.holder.email}</a>}
                </td>
                <td className="px-5 py-3">
                  {r.holder ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${r.progress}%`, background: "var(--p-accent-green)" }} />
                      </div>
                      <span className="text-xs" style={{ color: "var(--p-muted)" }}>{r.progress}%</span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--p-muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
