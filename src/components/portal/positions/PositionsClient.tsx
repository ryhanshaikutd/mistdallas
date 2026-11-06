"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, X, Lock, Unlock } from "lucide-react";
import type { Position, Profile } from "@/lib/types";
import { TEAM_LABELS, TEAM_ORDER, ROLE_TIER_LABELS, PHASE_LABELS, phaseIdFromEnum } from "@/lib/constants";
import { assignSeat, unassignSeat, setMaxHolders, setPositionOpen } from "@/app/portal/positions/actions";

export type ProfileLite = Pick<Profile, "id" | "full_name" | "email" | "role" | "team" | "position_id" | "avatar_url">;

interface Props {
  positions: Position[];
  profiles: ProfileLite[];
}

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;
const input = { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" } as const;

export default function PositionsClient({ positions, profiles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [picker, setPicker] = useState<Record<string, string>>({});
  const [maxDraft, setMaxDraft] = useState<Record<string, string>>({});

  const holdersOf = (positionId: string) => profiles.filter((p) => p.position_id === positionId);
  const seatless = profiles.filter((p) => !p.position_id);

  function run(positionId: string, work: () => Promise<{ success: boolean; error?: string }>, okMessage: string) {
    setBusyId(positionId);
    startTransition(async () => {
      const result = await work();
      if (result.success) {
        toast.success(okMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
      setBusyId(null);
    });
  }

  const totals = {
    seats: positions.length,
    filled: positions.filter((p) => holdersOf(p.id).length > 0).length,
    open: positions.filter((p) => p.open_for_applications).length,
    people: profiles.filter((p) => p.position_id).length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Seats", value: totals.seats },
          { label: "Filled", value: totals.filled },
          { label: "Open for applications", value: totals.open },
          { label: "People seated", value: totals.people },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border p-4 text-center" style={card}>
            <div className="text-3xl font-bold" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-sm" style={{ color: "var(--p-muted)" }}>
        Assigning a seat sets the person&apos;s role and team. Only people without a seat appear in the picker; unassign someone first to move them.
      </p>

      {TEAM_ORDER.map((team) => {
        const rows = positions.filter((p) => p.team === team);
        if (rows.length === 0) return null;
        return (
          <section key={team} className="rounded-2xl border overflow-hidden" style={card}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--p-border)" }}>
              <h2 className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{TEAM_LABELS[team]}</h2>
              <span className="text-xs" style={{ color: "var(--p-muted)" }}>{rows.filter((p) => holdersOf(p.id).length > 0).length}/{rows.length} filled</span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
              {rows.map((pos) => {
                const holders = holdersOf(pos.id);
                const busy = pending && busyId === pos.id;
                const full = pos.max_holders !== null && holders.length >= pos.max_holders;
                return (
                  <div key={pos.id} className="px-5 py-4 grid gap-3 lg:grid-cols-[1.4fr_1.6fr_auto] lg:items-start">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "var(--p-text)" }}>{pos.title}</div>
                      <div className="text-xs mt-0.5 flex flex-wrap gap-x-2" style={{ color: "var(--p-muted)" }}>
                        <span>{ROLE_TIER_LABELS[pos.role_tier]}</span>
                        <span>· starts {PHASE_LABELS[phaseIdFromEnum(pos.phase)]}</span>
                        {pos.slug && <span>· {pos.slug}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {holders.map((h) => (
                        <span key={h.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium" style={{ background: "var(--p-card-hover)", color: "var(--p-text)" }}>
                          {h.full_name || h.email}
                          <button
                            onClick={() => run(pos.id, () => unassignSeat(h.id), `${h.full_name || h.email} unassigned.`)}
                            disabled={busy}
                            aria-label={`Unassign ${h.full_name || h.email}`}
                            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {holders.length === 0 && <span className="text-xs italic" style={{ color: "var(--p-muted)" }}>Open seat</span>}
                      {!full && pos.slug && (
                        <span className="inline-flex items-center gap-1">
                          <select
                            value={picker[pos.id] ?? ""}
                            onChange={(e) => setPicker((d) => ({ ...d, [pos.id]: e.target.value }))}
                            aria-label={`Assign someone to ${pos.title}`}
                            className="border rounded-lg px-2 py-1 text-xs focus:outline-none max-w-[180px]"
                            style={input}
                          >
                            <option value="">Assign…</option>
                            {seatless.map((p) => (
                              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const profileId = picker[pos.id];
                              if (!profileId) return;
                              run(pos.id, () => assignSeat(profileId, pos.slug!), "Seat assigned.");
                              setPicker((d) => ({ ...d, [pos.id]: "" }));
                            }}
                            disabled={busy || !picker[pos.id]}
                            aria-label={`Confirm assignment to ${pos.title}`}
                            className="p-1.5 rounded-lg text-white disabled:opacity-40"
                            style={{ background: "var(--p-accent)" }}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 lg:justify-end">
                      <label className="flex items-center gap-1 text-xs" style={{ color: "var(--p-muted)" }}>
                        Max
                        <input
                          type="number"
                          min={1}
                          placeholder="∞"
                          value={maxDraft[pos.id] ?? (pos.max_holders ?? "")}
                          onChange={(e) => setMaxDraft((d) => ({ ...d, [pos.id]: e.target.value }))}
                          onBlur={(e) => {
                            const raw = e.target.value.trim();
                            const next = raw === "" ? null : Number(raw);
                            if (next === pos.max_holders) return;
                            run(pos.id, () => setMaxHolders(pos.id, next), "Max holders updated.");
                          }}
                          aria-label={`Max holders for ${pos.title}`}
                          className="w-14 border rounded-lg px-2 py-1 text-xs focus:outline-none"
                          style={input}
                        />
                      </label>
                      <button
                        onClick={() => run(pos.id, () => setPositionOpen(pos.id, !pos.open_for_applications), pos.open_for_applications ? "Closed to applications." : "Open for applications.")}
                        disabled={busy}
                        aria-pressed={pos.open_for_applications}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-40"
                        style={pos.open_for_applications
                          ? { background: "#2EA87A20", borderColor: "#2EA87A", color: "#2EA87A" }
                          : { background: "transparent", borderColor: "var(--p-border)", color: "var(--p-muted)" }}
                      >
                        {pos.open_for_applications ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {pos.open_for_applications ? "Open" : "Closed"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
