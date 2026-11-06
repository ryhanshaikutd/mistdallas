import { format, parseISO } from "date-fns";
import { daysUntil } from "@/lib/season";
import { deadlineTiming } from "@/lib/deadlines";
import type { Milestone, SeasonSettings } from "@/lib/types";

interface Props {
  milestones: Milestone[];
  season: SeasonSettings | null;
  todayIso: string;
}

const TYPE_COLORS: Record<string, string> = {
  "Hard Deadline": "#EF4444",
  Registration: "#2EA87A",
  "Check-in": "#F59E0B",
  "Event Week": "#7C3AED",
  "Post-Event": "#64748B",
};
const typeColor = (type: string) => TYPE_COLORS[type] ?? "var(--p-accent)";

export default function TimelineView({ milestones, season, todayIso }: Props) {
  const next = milestones.find((m) => m.target_date && m.target_date >= todayIso);
  const byMonth = new Map<string, Milestone[]>();
  for (const m of milestones) {
    const key = format(parseISO(m.target_date!), "MMMM yyyy");
    byMonth.set(key, [...(byMonth.get(key) ?? []), m]);
  }
  const days = season ? daysUntil(season.tournament_start, todayIso) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border p-6 flex flex-wrap items-end justify-between gap-4" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" }}>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>Master timeline</h2>
          <p className="text-sm mt-1" style={{ color: "var(--p-muted)" }}>
            {season
              ? `MIST Dallas ${season.year} · Tournament ${format(parseISO(season.tournament_start), "MMM d")}–${format(parseISO(season.tournament_end), "d, yyyy")}`
              : "Every dated milestone this season"}
          </p>
        </div>
        {days !== null && (
          <div className="text-right">
            <div className="text-4xl font-extrabold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-accent)" }}>{Math.abs(days)}</div>
            <div className="text-xs" style={{ color: "var(--p-muted)" }}>{days >= 0 ? "days to tournament" : "days since tournament"}</div>
          </div>
        )}
      </div>

      {next && (
        <div className="rounded-2xl border px-5 py-4 flex items-center justify-between gap-4" style={{ background: "var(--p-accent)" + "12", borderColor: "var(--p-accent)" + "40" }}>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--p-accent)" }}>Up next</div>
            <div className="font-semibold" style={{ color: "var(--p-text)" }}>{next.title}</div>
            <div className="text-xs" style={{ color: "var(--p-muted)" }}>{format(parseISO(next.target_date!), "EEEE, MMMM d")} · {next.owner_label}</div>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--p-accent)" }}>{deadlineTiming(next.target_date, todayIso).label}</span>
        </div>
      )}

      <ol className="relative border-l-2 ml-3 space-y-8" style={{ borderColor: "var(--p-border)" }}>
        {[...byMonth.entries()].map(([month, items]) => (
          <li key={month} className="ml-6">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-muted)" }}>{month}</h3>
            <div className="space-y-2">
              {items.map((m) => {
                const past = m.target_date! < todayIso;
                const isNext = next?.id === m.id;
                const color = typeColor(m.deadline_type);
                return (
                  <div key={m.id} className="relative rounded-xl border px-4 py-3" style={{
                    background: "var(--p-card)", borderColor: isNext ? color : "var(--p-border)", opacity: past ? 0.6 : 1,
                  }}>
                    <span className="absolute -left-[31px] top-4 w-3 h-3 rounded-full border-2" style={{ background: past ? "var(--p-border)" : color, borderColor: "var(--p-card)" }} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold" style={{ color }}>{m.date_label ?? format(parseISO(m.target_date!), "MMM d")} · {m.deadline_type}</div>
                        <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--p-text)", textDecoration: past ? "line-through" : "none" }}>{m.title}</div>
                        {m.description && <p className="text-xs mt-1" style={{ color: "var(--p-text-secondary)" }}>{m.description}</p>}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--p-muted)" }}>{m.owner_label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
