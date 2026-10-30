import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireBoard } from "@/lib/auth";
import { PHASE_IDS } from "@/lib/constants";
import { workbookFor } from "@/lib/workbook/content";
import type { WorkbookPhaseData } from "@/lib/workbook/progress";
import type { PhaseId } from "@/lib/workbook/types";
import WorkbookClient from "@/components/portal/workbook/WorkbookClient";

export default async function WorkbookPage() {
  const { user, profile, supabase } = await requireBoard();

  const seat = profile.position_id
    ? (await supabase.from("positions").select("slug, title, team").eq("id", profile.position_id).maybeSingle()).data
    : null;
  const role = workbookFor(seat?.slug);

  if (!seat || !role) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border p-10 text-center" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" style={{ color: "var(--p-muted)" }} />
        <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>
          {seat ? `${seat.title} has no workbook` : "No seat assigned yet"}
        </h2>
        <p className="text-sm mt-2" style={{ color: "var(--p-muted)" }}>
          {seat
            ? "This seat does not carry a phase-by-phase workbook. Your team's deadlines are on the calendar."
            : "Leadership assigns seats from the Positions page. Once you have one, your role's workbook appears here."}
        </p>
        <Link href="/portal/teams" className="inline-block mt-5 text-sm font-semibold" style={{ color: "var(--p-accent)" }}>Browse teams →</Link>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("workbook_progress")
    .select("phase, data")
    .eq("user_id", user.id)
    .eq("position_slug", seat.slug);

  const byPhase: Partial<Record<PhaseId, WorkbookPhaseData>> = {};
  for (const row of rows ?? []) byPhase[row.phase as PhaseId] = row.data as WorkbookPhaseData;

  // Open the furthest phase that has any work in it, else the role's starting phase.
  const touched = PHASE_IDS.filter((p) => {
    const d = byPhase[p];
    return d && (Object.keys(d.checks ?? {}).length > 0 || (d.notes ?? "") !== "" || Object.keys(d.fields ?? {}).length > 0);
  });
  const initialPhase = touched.length ? touched[touched.length - 1] : role.startPhase;

  return (
    <WorkbookClient
      role={role}
      byPhase={byPhase}
      initialPhase={initialPhase}
      holderName={profile.preferred_name || profile.full_name || profile.email}
    />
  );
}
