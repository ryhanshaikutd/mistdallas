import { requireLeadership } from "@/lib/auth";
import type { Announcement } from "@/lib/types";
import AnnouncementsClient from "@/components/portal/announcements/AnnouncementsClient";

export default async function AnnouncementsPage() {
  const { supabase } = await requireLeadership();
  const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  return <AnnouncementsClient announcements={(data ?? []) as Announcement[]} />;
}
