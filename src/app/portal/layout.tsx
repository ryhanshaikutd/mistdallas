import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import PortalSidebar from "@/components/portal/PortalSidebar";
import PortalTopNav from "@/components/portal/PortalTopNav";
import PortalHeader from "@/components/portal/PortalHeader";

export const metadata: Metadata = {
  title: "Board Portal",
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  if (!profile.onboarded) redirect("/onboarding");

  const theme = profile.theme ?? "dark";
  const navStyle = profile.nav_style ?? "sidebar";

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
