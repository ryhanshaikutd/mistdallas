import { requireLeadership } from "@/lib/auth";
import type { FeedbackTheme } from "@/lib/types";
import FeedbackClient from "@/components/portal/feedback/FeedbackClient";

export default async function FeedbackPage() {
  const { supabase } = await requireLeadership();
  const { data } = await supabase.from("feedback_themes").select("*").order("sort_order").order("created_at");
  return <FeedbackClient themes={(data ?? []) as FeedbackTheme[]} />;
}
