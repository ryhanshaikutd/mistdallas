import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import NationalsPage from "@/components/nationals/NationalsPage";

// Cookie-free client below keeps this page static; it re-renders at most hourly.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Nationals Qualifiers",
  description: "Every school and qualifier that earned their spot to represent MIST Dallas at Nationals.",
  alternates: { canonical: "/nationals" },
};

export default async function Nationals() {
  if (!hasSupabaseEnv()) return <NationalsPage qualifiers={[]} />;

  const supabase = createPublicClient();

  const { data: qualifiers } = await supabase
    .from("qualifiers")
    .select("*")
    .eq("qualified_for_nationals", true)
    .order("year", { ascending: false })
    .order("category")
    .order("placement");

  return <NationalsPage qualifiers={qualifiers ?? []} />;
}
