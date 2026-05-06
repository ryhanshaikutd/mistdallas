import { createClient } from "@/lib/supabase/server";
import NationalsPage from "@/components/nationals/NationalsPage";

export const revalidate = 3600;

export const metadata = {
  title: "2026 Nationals Qualifiers — MIST Dallas",
  description: "Every school and qualifier that earned their spot to represent MIST Dallas at Nationals.",
};

export default async function Nationals() {
  const supabase = await createClient();

  const { data: qualifiers } = await supabase
    .from("qualifiers")
    .select("*")
    .eq("qualified_for_nationals", true)
    .order("year", { ascending: false })
    .order("category")
    .order("placement");

  return <NationalsPage qualifiers={qualifiers ?? []} />;
}
