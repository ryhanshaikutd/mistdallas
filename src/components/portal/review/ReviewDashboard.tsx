"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Position } from "@/lib/types";
import { TEAM_LABELS } from "@/lib/constants";
import {
  Search, Filter, ChevronDown, ChevronUp, Star,
  MessageSquare, AlertTriangle, Check, X, UserPlus, RefreshCw,
} from "lucide-react";

type ApplicationRow = {
  id: string;
  applicant_name: string;
  applicant_email: string;
  gender: string;
  still_in_school: boolean;
  is_internal: boolean;
  expected_time_commitment: string;
  one_change_essay: string;
  fell_short_essay: string;
  why_mist: string | null;
  relevant_experience: string | null;
  status: string;
  reviewer_notes: { id: string; reviewer_id: string; note: string; knows_applicant: boolean; knows_applicant_context: string | null }[];
  application_rankings: { rank: number; position: { id: string; title: string; phase: string; team: string } | null }[];
  created_at: string;
};

interface Props {
  applications: ApplicationRow[];
  positions: Position[];
  profile: Profile | null;
}

const STATUS_OPTIONS = [
  { value: "under_review", label: "Mark Under Review", icon: RefreshCw, color: "text-yellow-600" },
  { value: "interview_scheduled", label: "Move to Interview", icon: Star, color: "text-purple-600" },
  { value: "accepted", label: "Accept", icon: Check, color: "text-green-600" },
  { value: "rejected", label: "Reject", icon: X, color: "text-red-600" },
  { value: "redirected_dream_team", label: "Redirect to Dream Team", icon: UserPlus, color: "text-orange-600" },
  { value: "offered_different_position", label: "Offer Different Position", icon: RefreshCw, color: "text-teal-600" },
];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  submitted: { background: "#3B82F620", color: "#3B82F6" },
  under_review: { background: "#F59E0B20", color: "#F59E0B" },
  interview_scheduled: { background: "#8B5CF620", color: "#8B5CF6" },
  accepted: { background: "#10B98120", color: "#10B981" },
  rejected: { background: "#EF444420", color: "#EF4444" },
  redirected_dream_team: { background: "#F9731620", color: "#F97316" },
  offered_different_position: { background: "#14B8A620", color: "#14B8A6" },
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  interview_scheduled: "Interview Scheduled",
  accepted: "Accepted",
  rejected: "Rejected",
  redirected_dream_team: "Dream Team",
  offered_different_position: "Alt. Position",
};

export default function ReviewDashboard({ applications: initial, positions, profile }: Props) {
  const supabase = createClient();
  const [apps, setApps] = useState(initial);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [knowsApplicant, setKnowsApplicant] = useState(false);
  const [knowsContext, setKnowsContext] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const filtered = apps.filter((a) => {
    const matchSearch =
      !search ||
      a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      a.applicant_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchType =
      filterType === "all" ||
      (filterType === "internal" ? a.is_internal : !a.is_internal);
    return matchSearch && matchStatus && matchType;
  });

  async function updateStatus(appId: string, status: string, altPositionId?: string) {
    setUpdatingStatus(appId);
    const { error } = await supabase
      .from("applications")
      .update({ status, ...(altPositionId ? { alternate_position_id: altPositionId } : {}) })
      .eq("id", appId);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
      toast.success("Status updated.");
    }
    setUpdatingStatus(null);
  }

  async function addNote(appId: string) {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const { data, error } = await supabase
      .from("reviewer_notes")
      .insert({
        application_id: appId,
        reviewer_id: profile?.id,
        note: noteText.trim(),
        knows_applicant: knowsApplicant,
        knows_applicant_context: knowsApplicant ? knowsContext : null,
      })
      .select()
      .single();
    if (error) {
      toast.error("Failed to add note.");
    } else {
      setApps((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, reviewer_notes: [...a.reviewer_notes, data] }
            : a
        )
      );
      setNoteText("");
      setKnowsApplicant(false);
      setKnowsContext("");
      toast.success("Note added.");
    }
    setAddingNote(false);
  }

  const counts = {
    total: apps.length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    under_review: apps.filter((a) => a.status === "under_review").length,
    interview_scheduled: apps.filter((a) => a.status === "interview_scheduled").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, color: "var(--p-text)" },
          { label: "New", value: counts.submitted, color: "#2563eb" },
          { label: "In Review", value: counts.under_review, color: "#ca8a04" },
          { label: "Accepted", value: counts.accepted, color: "var(--p-accent-green)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }} className="rounded-2xl border p-4 text-center">
            <div style={{ color: s.color }} className="text-3xl font-bold">{s.value}</div>
            <div style={{ color: "var(--p-muted)" }} className="text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search style={{ color: "var(--p-muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
          <input
            type="text"
            placeholder="Search applicants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" }}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" }}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          <option value="all">All applicants</option>
          <option value="internal">Internal only</option>
          <option value="external">External only</option>
        </select>
      </div>

      {/* Application list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-muted)" }} className="rounded-2xl border p-12 text-center">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No applications match your filters.
          </div>
        ) : (
          filtered.map((app) => {
            const isExpanded = expanded === app.id;
            const ranked = [...app.application_rankings]
              .filter((r) => r.position)
              .sort((a, b) => a.rank - b.rank);

            return (
              <div key={app.id} style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }} className="rounded-2xl border overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : app.id)}
                  style={{ color: "var(--p-text)" }}
                  className="w-full flex items-center gap-4 p-5 text-left hover:opacity-90 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {app.applicant_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }} className="font-semibold">{app.applicant_name}</span>
                      <span style={app.is_internal ? { background: "#EEF2F9", color: "#1B3464" } : { background: "var(--p-card-hover)", color: "var(--p-text-secondary)" }} className="text-xs px-2 py-0.5 rounded-full">
                        {app.is_internal ? "Internal" : "External"}
                      </span>
                      <span style={{ color: "var(--p-muted)" }} className="text-xs capitalize">{app.gender}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {ranked.slice(0, 3).map((r) => (
                        <span key={r.rank} style={{ color: "var(--p-text-secondary)" }} className="text-xs">
                          #{r.rank} {r.position?.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {app.reviewer_notes.length > 0 && (
                      <span style={{ color: "var(--p-muted)" }} className="flex items-center gap-1 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {app.reviewer_notes.length}
                      </span>
                    )}
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={STATUS_STYLE[app.status] ?? { background: "var(--p-card-hover)", color: "var(--p-muted)" }}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                    {isExpanded ? <ChevronUp style={{ color: "var(--p-muted)" }} className="w-4 h-4" /> : <ChevronDown style={{ color: "var(--p-muted)" }} className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderColor: "var(--p-border)" }} className="border-t p-5 space-y-6">
                    {/* Position rankings */}
                    <div>
                      <h4 style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }} className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Star style={{ color: "var(--p-accent)" }} className="w-4 h-4" /> Position Rankings
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {ranked.map((r) => (
                          <div key={r.rank} className="flex items-center gap-2 bg-[#EEF2F9] px-3 py-2 rounded-xl">
                            <span className="w-5 h-5 bg-[#1B3464] text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {r.rank}
                            </span>
                            <span className="text-sm font-medium text-[#1B3464]">{r.position?.title}</span>
                            <span className="text-xs text-[#2E7BC4]">({TEAM_LABELS[r.position?.team as keyof typeof TEAM_LABELS] ?? r.position?.team})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* About */}
                    <div className="grid sm:grid-cols-3 gap-4 text-sm">
                      <div style={{ background: "var(--p-card-hover)" }} className="rounded-xl p-3">
                        <div style={{ color: "var(--p-muted)" }} className="text-xs mb-1">Still in school</div>
                        <div style={{ color: "var(--p-text)" }} className="font-medium">{app.still_in_school ? "Yes" : "No"}</div>
                      </div>
                      <div style={{ background: "var(--p-card-hover)" }} className="rounded-xl p-3">
                        <div style={{ color: "var(--p-muted)" }} className="text-xs mb-1">Time commitment</div>
                        <div style={{ color: "var(--p-text)" }} className="font-medium">{app.expected_time_commitment}</div>
                      </div>
                      <div style={{ background: "var(--p-card-hover)" }} className="rounded-xl p-3">
                        <div style={{ color: "var(--p-muted)" }} className="text-xs mb-1">Submitted</div>
                        <div style={{ color: "var(--p-text)" }} className="font-medium">{new Date(app.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Essays */}
                    <div className="space-y-4">
                      <div>
                        <h5 style={{ color: "var(--p-text-secondary)" }} className="text-xs font-semibold uppercase tracking-wider mb-2">
                          Change they&apos;d implement
                        </h5>
                        <p style={{ color: "var(--p-text-secondary)", background: "var(--p-card-hover)" }} className="text-sm rounded-xl p-4 leading-relaxed">
                          {app.one_change_essay}
                        </p>
                      </div>
                      <div>
                        <h5 style={{ color: "var(--p-text-secondary)" }} className="text-xs font-semibold uppercase tracking-wider mb-2">
                          Where they fell short
                        </h5>
                        <p style={{ color: "var(--p-text-secondary)", background: "var(--p-card-hover)" }} className="text-sm rounded-xl p-4 leading-relaxed">
                          {app.fell_short_essay}
                        </p>
                      </div>
                      {app.why_mist && (
                        <div>
                          <h5 style={{ color: "var(--p-text-secondary)" }} className="text-xs font-semibold uppercase tracking-wider mb-2">
                            Why MIST
                          </h5>
                          <p style={{ color: "var(--p-text-secondary)", background: "var(--p-card-hover)" }} className="text-sm rounded-xl p-4 leading-relaxed">
                            {app.why_mist}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reviewer notes */}
                    <div>
                      <h4 style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }} className="text-sm font-bold mb-3 flex items-center gap-2">
                        <MessageSquare style={{ color: "var(--p-accent-green)" }} className="w-4 h-4" /> Reviewer Notes
                      </h4>
                      {app.reviewer_notes.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {app.reviewer_notes.map((note) => (
                            <div key={note.id} style={{ background: "var(--p-card-hover)" }} className="rounded-xl p-4">
                              {note.knows_applicant && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                                  <span className="text-xs font-semibold text-yellow-600">
                                    Knows applicant personally
                                    {note.knows_applicant_context && `: ${note.knows_applicant_context}`}
                                  </span>
                                </div>
                              )}
                              <p style={{ color: "var(--p-text-secondary)" }} className="text-sm">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add note */}
                      <div style={{ borderColor: "var(--p-border)" }} className="border rounded-xl p-4 space-y-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this applicant…"
                          rows={2}
                          style={{ color: "var(--p-text)" }}
                          className="w-full text-sm border-none outline-none resize-none bg-transparent placeholder:text-gray-400"
                        />
                        <div className="flex items-center justify-between gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={knowsApplicant}
                              onChange={(e) => setKnowsApplicant(e.target.checked)}
                              className="accent-[#1B3464]"
                            />
                            <span style={{ color: "var(--p-text-secondary)" }} className="text-xs">I know this person personally</span>
                          </label>
                          <button
                            onClick={() => addNote(app.id)}
                            disabled={addingNote || !noteText.trim()}
                            className="px-4 py-1.5 bg-[#1B3464] text-white text-xs font-semibold rounded-lg hover:bg-[#2E7BC4] transition-colors disabled:opacity-40"
                          >
                            {addingNote ? "Adding…" : "Add Note"}
                          </button>
                        </div>
                        {knowsApplicant && (
                          <input
                            type="text"
                            value={knowsContext}
                            onChange={(e) => setKnowsContext(e.target.value)}
                            placeholder="How do you know them? (optional)"
                            style={{ borderColor: "var(--p-border)", color: "var(--p-text)", background: "var(--p-card)" }}
                            className="w-full text-xs border rounded-lg px-3 py-2 focus:outline-none"
                          />
                        )}
                      </div>
                    </div>

                    {/* Status actions */}
                    <div>
                      <h4 style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }} className="text-sm font-bold mb-3">Update Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updateStatus(app.id, opt.value)}
                              disabled={updatingStatus === app.id || app.status === opt.value}
                              style={app.status === opt.value
                                ? { borderColor: "#1B3464", background: "#EEF2F9", color: "#1B3464" }
                                : { borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}
                              className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                            >
                              <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
