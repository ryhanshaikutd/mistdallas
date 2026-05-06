import { createAdminClient } from "@/lib/supabase/server";
import GalleryClient from "@/components/landing/GalleryClient";

export const revalidate = 0; // always fresh

const BUCKET = "gallery";

export default async function GalleryPage() {
  const admin = createAdminClient();

  const { data: files, error } = await admin.storage
    .from(BUCKET)
    .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) console.error("[gallery] storage list error:", error.message);

  const photos = (files ?? [])
    .filter(f => !f.name.startsWith(".") && f.name !== ".emptyFolderPlaceholder")
    .map(f => ({
      name: f.name,
      url: admin.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
    }));

  return <GalleryClient photos={photos} />;
}
