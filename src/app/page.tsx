import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  const admin = createAdminClient();

  const [{ data: qualifiers }, { data: galleryFiles }] = await Promise.all([
    supabase
      .from("qualifiers")
      .select("*")
      .eq("qualified_for_nationals", true)
      .order("year", { ascending: false })
      .order("category")
      .order("placement"),
    admin.storage
      .from("gallery")
      .list("", { limit: 20, sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const galleryPhotos = (galleryFiles ?? [])
    .filter(f => !f.name.startsWith("."))
    .map(f => admin.storage.from("gallery").getPublicUrl(f.name).data.publicUrl);

  return <LandingPage qualifiers={qualifiers ?? []} galleryPhotos={galleryPhotos} />;
}
