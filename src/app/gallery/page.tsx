import { createClient } from "@/lib/supabase/server";
import GalleryClient from "@/components/landing/GalleryClient";

export const revalidate = 3600; // revalidate every hour

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data: files } = await supabase.storage
    .from("gallery")
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  const photos = (files ?? [])
    .filter(f => f.name !== ".emptyFolderPlaceholder")
    .map(f => ({
      name: f.name,
      url: supabase.storage.from("gallery").getPublicUrl(f.name).data.publicUrl,
    }));

  return <GalleryClient photos={photos} />;
}
