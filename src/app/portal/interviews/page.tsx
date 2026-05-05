import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import InterviewsClient from "@/components/portal/interviews/InterviewsClient";

export default async function InterviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const allowed = ["regional_director", "internal_ad", "external_ad"];
  if (!allowed.includes(profile?.role ?? "")) redirect("/portal");

  const { data: cycle } = await supabase
    .from("recruitment_cycles")
    .select("*")
    .neq("type", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: slots }, { data: bookings }] = await Promise.all([
    cycle
      ? supabase.from("interview_slots").select("*").eq("cycle_id", cycle.id).order("starts_at")
      : { data: [] },
    cycle
      ? supabase.from("interview_bookings").select("*, application:applications(applicant_name, applicant_email, status), slot:interview_slots(starts_at, ends_at)").order("created_at")
      : { data: [] },
  ]);

  return (
    <InterviewsClient
      profile={profile}
      cycle={cycle}
      slots={slots ?? []}
      bookings={bookings ?? []}
    />
  );
}
