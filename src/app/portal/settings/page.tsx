import { requireUser } from "@/lib/auth";
import SettingsClient from "@/components/portal/settings/SettingsClient";

export default async function SettingsPage() {
  const { profile } = await requireUser();
  return <SettingsClient profile={profile} />;
}
