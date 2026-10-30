import { requireBoard } from "@/lib/auth";
import { localDateIso } from "@/lib/deadlines";
import type { Decision, MeetingNote } from "@/lib/types";
import MeetingsClient from "@/components/portal/meetings/MeetingsClient";

export default async function MeetingsPage() {
  const { profile, supabase } = await requireBoard();
  const [{ data: notes }, { data: decisions }] = await Promise.all([
    supabase
      .from("meeting_notes")
      .select("*, author:profiles!meeting_notes_created_by_fkey(id, full_name)")
      .order("meeting_date", { ascending: false })
      .limit(200),
    supabase
      .from("decisions")
      .select("*, author:profiles!decisions_created_by_fkey(id, full_name)")
      .order("decided_on", { ascending: false })
      .limit(200),
  ]);

  return (
    <MeetingsClient
      notes={(notes ?? []) as MeetingNote[]}
      decisions={(decisions ?? []) as Decision[]}
      viewer={{ role: profile.role, team: profile.team }}
      todayIso={localDateIso(new Date())}
    />
  );
}
