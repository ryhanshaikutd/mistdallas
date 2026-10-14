import { createAdminClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Metadata } from "next";
import GalleryClient from "@/components/landing/GalleryClient";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from MIST Dallas tournament weekends.",
  alternates: { canonical: "/gallery" },
};

// New uploads appear within a minute instead of listing Storage on every request.
export const revalidate = 60;

const BUCKET = "gallery";

export default async function GalleryPage() {
  if (!hasSupabaseEnv()) return <GalleryClient photos={[]} />;

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
