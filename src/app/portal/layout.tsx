import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PortalSidebar from "@/components/portal/PortalSidebar";
import PortalTopNav from "@/components/portal/PortalTopNav";
import PortalHeader from "@/components/portal/PortalHeader";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (profile && !profile.onboarded) redirect("/portal/onboarding");

  const theme = profile?.theme ?? "dark";
  const navStyle = profile?.nav_style ?? "sidebar";

  return (
    <div data-theme={theme} className="h-screen overflow-hidden flex flex-col" style={{ background: "var(--p-bg)", color: "var(--p-text)", fontFamily: "var(--font-dm-sans)" }}>
      {navStyle === "topnav" ? (
        <>
          <PortalTopNav profile={profile} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <PortalSidebar profile={profile} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <PortalHeader profile={profile} />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
          </div>
        </div>
      )}
    </div>
  );
}
