"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";

interface Qualifier {
  id: string;
  year: number;
  name: string;
  school: string;
  category: string;
  placement: string | null;
  mist_ids: string | null;
}

const BROAD_CATEGORIES = [
  "Knowledge & Quran",
  "Arts",
  "Writing & Oratory",
  "Brackets",
  "Group Projects",
  "Sports",
] as const;
type BroadCat = (typeof BROAD_CATEGORIES)[number];

const EVENT_TO_BROAD: Record<string, BroadCat> = {
  "Knowledge Test 1": "Knowledge & Quran", "Knowledge Test 2": "Knowledge & Quran",
  "Knowledge Test 3": "Knowledge & Quran", "Knowledge Test 4": "Knowledge & Quran",
  "Quran Memorization — Lvl 1 (Male)": "Knowledge & Quran", "Quran Memorization — Lvl 1 (Female)": "Knowledge & Quran",
  "Quran Memorization — Lvl 2 (Male)": "Knowledge & Quran", "Quran Memorization — Lvl 2 (Female)": "Knowledge & Quran",
  "Quran Memorization — Lvl 3 (Male)": "Knowledge & Quran", "Quran Memorization — Lvl 3 (Female)": "Knowledge & Quran",
  "Quran Recitation (Male)": "Knowledge & Quran", "Quran Recitation (Female)": "Knowledge & Quran",
  "2D Art": "Arts", "3D Art": "Arts", "Fashion Design": "Arts", "Digital Art": "Arts", "Photography": "Arts",
  "Extemporaneous Essay": "Writing & Oratory", "Extemporaneous Speaking": "Writing & Oratory",
  "Original Oratory": "Writing & Oratory", "Poetry": "Writing & Oratory",
  "Prepared Essay": "Writing & Oratory", "Short Fiction": "Writing & Oratory", "Spoken Word": "Writing & Oratory",
  "Debate": "Brackets", "Math Olympics": "Brackets", "MIST Quiz Bowl": "Brackets",
  "Improv (Male)": "Brackets", "Improv (Female)": "Brackets",
  "Business Venture": "Group Projects", "Humanitarian Service": "Group Projects",
  "Nasheed & Rap (Male)": "Group Projects", "Nasheed & Rap (Female)": "Group Projects",
  "Science Fair": "Group Projects", "Short Film": "Group Projects", "Social Media": "Group Projects",
  "Basketball (Male)": "Sports", "Basketball (Female)": "Sports",
  "Volleyball (Male)": "Sports", "Volleyball (Female)": "Sports",
  "Soccer (Male)": "Sports", "Soccer (Female)": "Sports", "Flag Football": "Sports",
};

const PLACEMENT_STYLE: Record<string, { bg: string; color: string }> = {
  "1st": { bg: "rgba(255,200,0,0.15)", color: "#B8860B" },
  "2nd": { bg: "rgba(160,160,160,0.15)", color: "#6B7280" },
  "3rd": { bg: "rgba(180,100,30,0.15)", color: "#92400E" },
  "4th": { bg: "rgba(0,0,0,0.05)", color: "#9CA3AF" },
  "5th": { bg: "rgba(0,0,0,0.05)", color: "#9CA3AF" },
};

const PLACEMENT_ORDER = ["1st", "2nd", "3rd", "4th", "5th"];

export default function NationalsPage({ qualifiers }: { qualifiers: Qualifier[] }) {
  const [activeCat, setActiveCat] = useState<BroadCat>("Knowledge & Quran");
  const [expandedYears, setExpandedYears] = useState<number[]>([]);

  const years = Array.from(new Set(qualifiers.map(q => q.year))).sort((a, b) => b - a);
  const currentYear = years[0];
  const pastYears = years.slice(1);

  function YearBlock({ year }: { year: number }) {
    const yearQuals = qualifiers.filter(q => q.year === year);
    const totalSlots = yearQuals.length;
    const uniqueSchools = new Set(yearQuals.map(q => q.school)).size;
    const uniqueEvents = new Set(yearQuals.map(q => q.category)).size;

    const byCat: Record<string, Record<string, Qualifier[]>> = {};
    for (const q of yearQuals) {
      const broad = EVENT_TO_BROAD[q.category] ?? "Other";
      byCat[broad] = byCat[broad] ?? {};
      byCat[broad][q.category] = byCat[broad][q.category] ?? [];
      byCat[broad][q.category].push(q);
    }

    const availableCats = BROAD_CATEGORIES.filter(c => byCat[c]);
    const cat = availableCats.includes(activeCat) ? activeCat : availableCats[0];

    return (
      <div>
        {/* Stats */}
        <div className="flex flex-wrap gap-8 justify-center mb-12">
          {[
            { val: totalSlots, label: "Qualifying Slots" },
            { val: uniqueSchools, label: "Schools" },
            { val: uniqueEvents, label: "Events" },
            { val: year, label: "Season" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-4xl font-extrabold text-[#1B3464]" style={{ fontFamily: "var(--font-syne)" }}>{val}</div>
              <div className="text-xs text-gray-400 uppercase tracking-widest mt-1.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8" style={{ scrollbarWidth: "none" }}>
          {availableCats.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200"
              style={cat === c
                ? { background: "#1B3464", color: "#ffffff", borderColor: "#1B3464" }
                : { background: "transparent", color: "#9CA3AF", borderColor: "#E5E7EB" }
              }>
              {c}
            </button>
          ))}
        </div>

        {/* Event grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byCat[cat] ?? {}).map(([event, rows]) => {
            const sorted = [...rows].sort(
              (a, b) => PLACEMENT_ORDER.indexOf(a.placement ?? "") - PLACEMENT_ORDER.indexOf(b.placement ?? "")
            );
            return (
              <div key={event} className="rounded-2xl p-5 transition-all duration-300" style={{ background: "#1B3464" }}>
                <div className="text-[#7ADBB8] text-xs font-bold uppercase tracking-wide mb-4">{event}</div>
                <div className="space-y-3">
                  {sorted.map((q, idx) => {
                    const ps = PLACEMENT_STYLE[q.placement ?? "5th"] ?? PLACEMENT_STYLE["5th"];
                    const ids = q.mist_ids ? q.mist_ids.split(",") : [];
                    return (
                      <div key={`${q.id}-${idx}`} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 text-[11px] font-bold w-8 h-6 rounded flex items-center justify-center mt-0.5"
                          style={{ background: ps.bg, color: ps.color }}>
                          {q.placement}
                        </span>
                        <div className="min-w-0">
                          <div className="text-white text-sm leading-tight">{q.school}</div>
                          {ids.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {ids.map(mid => (
                                <span key={mid} className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }}>
                                  {mid}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

      {/* Nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 h-16 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="MIST Dallas" width={24} height={24} className="object-contain opacity-70" />
          <span className="font-bold text-sm text-gray-500" style={{ fontFamily: "var(--font-syne)" }}>MIST Dallas · Nationals</span>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-16">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">2026 Nationals</span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#1B3464] mt-4 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
            Dallas in the Limelight.
          </h1>
          <p className="text-gray-400 mt-4 text-lg max-w-lg mx-auto">
            Every school and qualifier that earned their spot on the national stage.
          </p>
        </div>

        {qualifiers.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center gap-3 bg-white border border-gray-100 shadow-sm rounded-2xl px-8 py-6">
              <Trophy className="w-6 h-6 text-[#2EA87A]" />
              <span className="text-gray-400 font-medium">Nationals qualifiers will be announced after MIST Weekend.</span>
            </div>
          </div>
        ) : (
          <>
            <YearBlock year={currentYear} />

            {/* Past years accordion */}
            {pastYears.length > 0 && (
              <div className="mt-20 border-t border-gray-100 pt-14">
                <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-widest mb-6 text-center">Past Years</h3>
                {pastYears.map(year => {
                  const isOpen = expandedYears.includes(year);
                  return (
                    <div key={year} className="mb-4">
                      <button
                        onClick={() => setExpandedYears(prev =>
                          isOpen ? prev.filter(y => y !== year) : [...prev, year]
                        )}
                        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <span className="text-gray-500 font-semibold" style={{ fontFamily: "var(--font-syne)" }}>{year} Season</span>
                        <span className="text-gray-300 text-sm">{isOpen ? "▲" : "▼"}</span>
                      </button>
                      {isOpen && <div className="mt-6"><YearBlock year={year} /></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
