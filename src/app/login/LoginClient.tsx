"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";
import { Globe, Star } from "lucide-react";

export default function LoginClient() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1B3464 0%, #0F2240 50%, #1A6B3C 100%)",
        }}
      >
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2E7BC4, transparent)" }} />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2EA87A, transparent)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="MIST Dallas" width={48} height={48} className="object-contain" />
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

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-[#FAFAF8]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/logo.png" alt="MIST Dallas" width={64} height={64} className="object-contain" />
          </div>

          <h1 className="text-3xl font-bold text-[#2D2F3A] mb-2">Sign in</h1>
          <p className="text-gray-500 mb-8">
            Use your MIST or Google account to access the board portal.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-[#2D2F3A] font-semibold py-3.5 px-6 rounded-xl hover:border-[#2E7BC4] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#2E7BC4] rounded-full animate-spin" />
            ) : (
              <Globe className="w-5 h-5 text-[#4285F4]" />
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </button>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700 font-medium mb-1">Internal board members</p>
            <p className="text-xs text-blue-600">
              Sign in with your{" "}
              <span className="font-semibold">@{INTERNAL_EMAIL_DOMAIN}</span> account
              to be recognized as a current board member.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            This portal is for MIST Dallas board members only.
            <br />
            Interested in competing?{" "}
            <a href="https://mymist.org" className="text-[#2E7BC4] hover:underline" target="_blank" rel="noopener noreferrer">
              Visit MyMIST
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
