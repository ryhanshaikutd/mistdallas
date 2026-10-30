import { requireLeadership } from "@/lib/auth";
import type { Position } from "@/lib/types";
import PositionsClient, { type ProfileLite } from "@/components/portal/positions/PositionsClient";

export default async function PositionsPage() {
  const { supabase } = await requireLeadership();

  const [{ data: positions }, { data: profiles }] = await Promise.all([
    supabase.from("positions").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("profiles").select("id, full_name, email, role, team, position_id, avatar_url").order("full_name"),
  ]);

  return <PositionsClient positions={(positions ?? []) as Position[]} profiles={(profiles ?? []) as ProfileLite[]} />;
}
