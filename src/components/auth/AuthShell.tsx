import Image from "next/image";
import { Star } from "lucide-react";

export const inputClass =
  "mt-1 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-[#2D2F3A] outline-none focus:border-[#2E7BC4]";
export const primaryButtonClass =
  "w-full rounded-xl bg-[#1B3464] px-6 py-3.5 font-semibold text-white transition-all hover:bg-[#0F2240] disabled:cursor-not-allowed disabled:opacity-60";

/** Two-panel frame shared by sign-in, forgot-password and reset-password. */
export default function AuthShell({ title, intro, children, footer }: {
  title: string;
  intro: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1B3464 0%, #0F2240 50%, #1A6B3C 100%)" }}
      >
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2E7BC4, transparent)" }} />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2EA87A, transparent)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MIST Dallas" width={48} height={50} className="object-contain brightness-0 invert" />
            <span className="font-bold text-xl">MIST Dallas</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#7ADBB8] text-sm px-3 py-1 rounded-full mb-6">
            <Star className="w-3 h-3 fill-current" />
            Board Portal
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Welcome back to
            <br />
            the team.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Sign in to manage applications, plan for the year, and keep the tournament running smoothly.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: "Applications", desc: "Review & manage" },
            { label: "Planning", desc: "Tasks & milestones" },
            { label: "Interviews", desc: "Schedule & track" },
            { label: "Insights", desc: "Data & analytics" },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="font-semibold text-white text-sm">{item.label}</div>
              <div className="text-white/40 text-xs mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-[#FAFAF8]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/logo.png" alt="MIST Dallas" width={64} height={67} className="object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-[#2D2F3A] mb-2">{title}</h1>
          <p className="text-gray-500 mb-8">{intro}</p>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
