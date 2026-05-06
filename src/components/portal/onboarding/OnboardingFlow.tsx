"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { ArrowRight, Sun, Moon, PanelLeft, PanelTop, Sparkles, Check } from "lucide-react";
import { completeOnboarding } from "@/app/onboarding/actions";

interface Props { profile: Profile | null }

const STEPS = ["welcome", "name", "funfact", "theme", "nav", "done"] as const;
type Step = typeof STEPS[number];

export default function OnboardingFlow({ profile }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [preferredName, setPreferredName] = useState(profile?.full_name?.split(" ")[0] ?? "");
  const [funFact, setFunFact] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // default dark
  const [navStyle, setNavStyle] = useState<"sidebar" | "topnav">("sidebar");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  async function finish() {
    setSaving(true);
    setError(null);
    const result = await completeOnboarding({
      preferred_name: preferredName || profile?.full_name?.split(" ")[0] || "",
      fun_fact: funFact,
      theme,
      nav_style: navStyle,
    });
    if (result.success) {
      router.push("/portal");
    } else {
      setError(result.error);
      setSaving(false);
    }
  }

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };

  const displayName = preferredName || profile?.full_name?.split(" ")[0] || "friend";

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: theme === "dark"
        ? "linear-gradient(135deg, #060d16 0%, #0F1B2D 100%)"
        : "linear-gradient(135deg, #F0F4F8 0%, #ffffff 100%)"
    }}>
      {/* Progress bar */}
      <div className="h-1 bg-white/10 fixed top-0 left-0 right-0 z-50">
        <div className="h-full bg-[#2EA87A] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg">

          {/* STEP: Welcome */}
          {step === "welcome" && (
            <div className="text-center" style={{ animation: "fadeInUp 0.6s ease both" }}>
              {profile?.avatar_url && (
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-[#2E7BC4]/30">
                    <Image src={profile.avatar_url} alt="" width={80} height={80} className="object-cover" />
                  </div>
                </div>
              )}
              <div className="inline-flex items-center gap-2 bg-[#2EA87A]/15 text-[#2EA87A] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3 h-3" /> Welcome to the team
              </div>
              <h1 className="text-5xl font-extrabold mb-4" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                Hey, {profile?.full_name?.split(" ")[0]} 👋
              </h1>
              <p style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }} className="text-lg mb-10">
                Let&apos;s get you set up in under a minute.
              </p>
              <button onClick={next}
                className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300 text-base">
                Let&apos;s go <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP: Preferred name */}
          {step === "name" && (
            <div style={{ animation: "fadeInUp 0.6s ease both" }}>
              <p className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest mb-4">Step 1 of 4</p>
              <h2 className="text-4xl font-extrabold mb-2" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                What should we call you?
              </h2>
              <p className="mb-8" style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }}>
                This shows up across the portal for your teammates.
              </p>
              <input
                type="text"
                value={preferredName}
                onChange={e => setPreferredName(e.target.value)}
                placeholder="Your preferred name"
                className="w-full text-2xl font-semibold px-6 py-5 rounded-2xl border-2 outline-none transition-all duration-200 mb-8"
                style={{
                  background: theme === "dark" ? "#0F1B2D" : "#ffffff",
                  borderColor: preferredName ? "#2E7BC4" : theme === "dark" ? "#1e3a5f" : "#E5E7EB",
                  color: theme === "dark" ? "#F1F5F9" : "#111827",
                  fontFamily: "var(--font-syne)",
                }}
                onKeyDown={e => e.key === "Enter" && next()}
              />
              <button onClick={next} disabled={!preferredName.trim()}
                className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:scale-100">
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP: Fun fact */}
          {step === "funfact" && (
            <div style={{ animation: "fadeInUp 0.6s ease both" }}>
              <p className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest mb-4">Step 2 of 4</p>
              <h2 className="text-4xl font-extrabold mb-2" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                Something fun about you?
              </h2>
              <p className="mb-8" style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }}>
                Your teammates will see this on your profile. Make it good.
              </p>
              <textarea
                value={funFact}
                onChange={e => setFunFact(e.target.value)}
                placeholder="e.g. I've never lost at Uno in my life."
                rows={4}
                maxLength={160}
                className="w-full text-base px-5 py-4 rounded-2xl border-2 outline-none transition-all duration-200 mb-2 resize-none"
                style={{
                  background: theme === "dark" ? "#0F1B2D" : "#ffffff",
                  borderColor: funFact ? "#2E7BC4" : theme === "dark" ? "#1e3a5f" : "#E5E7EB",
                  color: theme === "dark" ? "#F1F5F9" : "#111827",
                }}
              />
              <p className="text-xs mb-8" style={{ color: theme === "dark" ? "#64748B" : "#9CA3AF" }}>
                {funFact.length}/160
              </p>
              <div className="flex gap-3">
                <button onClick={next}
                  className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300">
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={next} className="px-6 py-4 rounded-full font-medium transition-colors"
                  style={{ color: theme === "dark" ? "#64748B" : "#9CA3AF" }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* STEP: Theme */}
          {step === "theme" && (
            <div style={{ animation: "fadeInUp 0.6s ease both" }}>
              <p className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest mb-4">Step 3 of 4</p>
              <h2 className="text-4xl font-extrabold mb-2" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                Pick your vibe.
              </h2>
              <p className="mb-8" style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }}>
                How should the portal look?
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {([["light", Sun, "Light", "#F0F4F8", "#111827"], ["dark", Moon, "Dark", "#0F1B2D", "#F1F5F9"]] as const).map(([val, Icon, label, bg, text]) => (
                  <button key={val} onClick={() => setTheme(val)}
                    className="relative p-6 rounded-2xl border-2 transition-all duration-200 text-left"
                    style={{
                      background: bg,
                      borderColor: theme === val ? "#2E7BC4" : "transparent",
                      boxShadow: theme === val ? "0 0 0 1px #2E7BC4" : "none",
                    }}>
                    {theme === val && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-[#2E7BC4] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className="w-6 h-6 mb-3" style={{ color: text }} />
                    <div className="font-bold text-sm" style={{ color: text, fontFamily: "var(--font-syne)" }}>{label}</div>
                    <div className="mt-3 space-y-1.5">
                      {[40, 60, 50].map((w, i) => (
                        <div key={i} className="h-2 rounded-full opacity-20" style={{ width: `${w}%`, background: text }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={next}
                className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300">
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP: Nav style */}
          {step === "nav" && (
            <div style={{ animation: "fadeInUp 0.6s ease both" }}>
              <p className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest mb-4">Step 4 of 4</p>
              <h2 className="text-4xl font-extrabold mb-2" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                How do you navigate?
              </h2>
              <p className="mb-8" style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }}>
                You can always change this later in settings.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {([
                  ["sidebar", PanelLeft, "Sidebar", "Left rail navigation"],
                  ["topnav", PanelTop, "Top Bar", "Navigation across the top"],
                ] as const).map(([val, Icon, label, desc]) => (
                  <button key={val} onClick={() => setNavStyle(val)}
                    className="relative p-6 rounded-2xl border-2 transition-all duration-200 text-left"
                    style={{
                      background: theme === "dark" ? "#0F1B2D" : "#ffffff",
                      borderColor: navStyle === val ? "#2E7BC4" : theme === "dark" ? "#1e3a5f" : "#E5E7EB",
                    }}>
                    {navStyle === val && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-[#2E7BC4] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className="w-6 h-6 mb-3 text-[#2E7BC4]" />
                    <div className="font-bold text-sm mb-1" style={{ color: theme === "dark" ? "#F1F5F9" : "#111827", fontFamily: "var(--font-syne)" }}>{label}</div>
                    <div className="text-xs" style={{ color: theme === "dark" ? "#64748B" : "#9CA3AF" }}>{desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={next}
                className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300">
                Finish setup <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && (
            <div className="text-center" style={{ animation: "fadeInUp 0.6s ease both" }}>
              <div className="w-20 h-20 bg-[#2EA87A] rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ animation: "scaleIn 0.5s ease both" }}>
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-5xl font-extrabold mb-4" style={{
                fontFamily: "var(--font-syne)",
                color: theme === "dark" ? "#F1F5F9" : "#111827"
              }}>
                You&apos;re all set, {displayName}.
              </h2>
              <p className="text-lg mb-10" style={{ color: theme === "dark" ? "#64748B" : "#6B7280" }}>
                Welcome to MIST Dallas. Let&apos;s build something great.
              </p>
              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}
              <button onClick={finish} disabled={saving}
                className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300 disabled:opacity-60">
                {saving ? "Setting up…" : "Enter the portal →"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
