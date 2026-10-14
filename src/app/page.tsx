import { createPublicClient, createAdminClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import LandingPage from "@/components/landing/LandingPage";

// Qualifier flag and gallery strip refresh every 5 minutes.
export const revalidate = 300;

export default async function Home() {
  // No Supabase keys locally — render the landing page with empty data.
  if (!hasSupabaseEnv()) return <LandingPage hasQualifiers={false} galleryPhotos={[]} />;

  const supabase = createPublicClient();
  const admin = createAdminClient();

  const [{ count: qualifierCount }, { data: galleryFiles }] = await Promise.all([
    supabase
      .from("qualifiers")
      .select("*", { count: "exact", head: true })
      .eq("qualified_for_nationals", true),
    admin.storage
      .from("gallery")
      .list("", { limit: 20, sortBy: { column: "created_at", order: "desc" } }),
  ]);

  const galleryPhotos = (galleryFiles ?? [])
    .filter(f => !f.name.startsWith("."))
    .map(f => admin.storage.from("gallery").getPublicUrl(f.name).data.publicUrl);

  return <LandingPage hasQualifiers={(qualifierCount ?? 0) > 0} galleryPhotos={galleryPhotos} />;
}
