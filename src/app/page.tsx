import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/landing/LandingPage";

interface Props {
  searchParams: Promise<{ code?: string; next?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { code, next } = await searchParams;

  if (code) {
    const target = next ? `/auth/callback?code=${code}&next=${next}` : `/auth/callback?code=${code}`;
    redirect(target);
  }

  const supabase = await createClient();
  const { data: qualifiers } = await supabase
    .from("qualifiers")
    .select("*")
    .eq("qualified_for_nationals", true)
    .order("year", { ascending: false })
    .order("category");

  return <LandingPage qualifiers={qualifiers ?? []} />;
}
