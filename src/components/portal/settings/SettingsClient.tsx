"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, PanelLeft, PanelTop, Check, Save } from "lucide-react";
import type { Profile } from "@/lib/types";
import { saveSettings } from "@/app/portal/settings/actions";

interface Props { profile: Profile | null }

export default function SettingsClient({ profile }: Props) {
  const router = useRouter();
  const [preferredName, setPreferredName] = useState(profile?.preferred_name ?? "");
  const [funFact, setFunFact] = useState(profile?.fun_fact ?? "");
  const [theme, setTheme] = useState<"light" | "dark">(profile?.theme ?? "dark");
  const [navStyle, setNavStyle] = useState<"sidebar" | "topnav">(profile?.nav_style ?? "sidebar");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await saveSettings({ preferred_name: preferredName, fun_fact: funFact, theme, nav_style: navStyle });
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  const inputStyle = {
    background: "var(--p-card)",
    border: "1.5px solid var(--p-border)",
    color: "var(--p-text)",
    borderRadius: 12,
    padding: "10px 14px",
    width: "100%",
    outline: "none",
    fontSize: 14,
    fontFamily: "var(--font-dm-sans)",
  };

  const cardStyle = {
    background: "var(--p-card)",
    border: "1.5px solid var(--p-border)",
    borderRadius: 16,
    padding: "24px",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Profile */}
      <div style={cardStyle}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--p-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--p-text)" }}>Preferred name</label>
            <input
              type="text"
              value={preferredName}
              onChange={e => setPreferredName(e.target.value)}
              placeholder={profile?.full_name?.split(" ")[0] ?? "Your name"}
              style={inputStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--p-muted)" }}>How you appear across the portal.</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--p-text)" }}>Fun fact</label>
            <textarea
              value={funFact}
              onChange={e => setFunFact(e.target.value)}
              placeholder="Something your teammates don't know about you"
              rows={3}
              maxLength={160}
              style={{ ...inputStyle, resize: "none" }}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--p-muted)" }}>{funFact.length}/160 — visible on your profile.</p>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div style={cardStyle}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--p-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Appearance</h2>
        <p className="text-sm mb-4" style={{ color: "var(--p-muted)" }}>Changes take effect after saving. The page will reload.</p>
        <div className="grid grid-cols-2 gap-3">
          {([["light", Sun, "Light", "#F0F4F8", "#111827"], ["dark", Moon, "Dark", "#0F1B2D", "#F1F5F9"]] as const).map(([val, Icon, label, bg, text]) => (
            <button key={val} onClick={() => setTheme(val)}
              className="relative p-5 rounded-2xl text-left transition-all duration-200"
              style={{
                background: bg,
                border: `2px solid ${theme === val ? "#2E7BC4" : "transparent"}`,
                boxShadow: theme === val ? "0 0 0 1px #2E7BC4" : "none",
              }}>
              {theme === val && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-[#2E7BC4] rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <Icon className="w-5 h-5 mb-2" style={{ color: text }} />
              <div className="font-bold text-sm" style={{ color: text, fontFamily: "var(--font-syne)" }}>{label}</div>
              <div className="mt-2 space-y-1">
                {[40, 60, 50].map((w, i) => (
                  <div key={i} className="h-1.5 rounded-full opacity-20" style={{ width: `${w}%`, background: text }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nav style */}
      <div style={cardStyle}>
        <h2 className="text-sm font-bold mb-4" style={{ color: "var(--p-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Navigation</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["sidebar", PanelLeft, "Sidebar", "Left rail navigation"],
            ["topnav", PanelTop, "Top Bar", "Navigation across the top"],
          ] as const).map(([val, Icon, label, desc]) => (
            <button key={val} onClick={() => setNavStyle(val)}
              className="relative p-5 rounded-2xl text-left transition-all duration-200"
              style={{
                background: "var(--p-card-hover)",
                border: `2px solid ${navStyle === val ? "#2E7BC4" : "var(--p-border)"}`,
              }}>
              {navStyle === val && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-[#2E7BC4] rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <Icon className="w-5 h-5 mb-2 text-[#2E7BC4]" />
              <div className="font-bold text-sm mb-0.5" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>{label}</div>
              <div className="text-xs" style={{ color: "var(--p-muted)" }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all duration-200 disabled:opacity-60"
          style={{ background: "#2E7BC4", color: "#fff" }}>
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#2EA87A" }}>
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
