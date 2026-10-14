import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LEADERSHIP_ROLES } from "@/lib/constants";

const CYCLE_TYPES = ["internal", "external", "closed"] as const;
type CycleType = (typeof CYCLE_TYPES)[number];

/**
 * POST /api/cycle  { type: "internal" | "external" | "closed", year?: number }
 * Opens, switches, or closes the recruitment cycle for a year. One row per year.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!LEADERSHIP_ROLES.includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { type?: unknown; year?: unknown } | null;
  const type = body?.type;
  if (!CYCLE_TYPES.includes(type as CycleType)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const year = body?.year === undefined ? new Date().getFullYear() : body.year;
  if (!Number.isInteger(year) || (year as number) < 2000 || (year as number) > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("recruitment_cycles")
    .select("id, type")
    .eq("year", year)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const patch =
    type === "closed"
      ? { type, closed_at: now }
      : existing && existing.type !== "closed"
        ? { type, closed_at: null }                    // switching internal → external keeps opened_at
        : { type, opened_at: now, closed_at: null };   // (re)opening

  const query = existing
    ? supabase.from("recruitment_cycles").update(patch).eq("id", existing.id)
    : supabase.from("recruitment_cycles").insert({ year, ...patch });

  const { data, error } = await query.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cycle: data });
}
