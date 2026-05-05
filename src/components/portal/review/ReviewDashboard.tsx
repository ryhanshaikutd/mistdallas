"use client";

import { useState } from "react";
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

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  interview_scheduled: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  redirected_dream_team: "bg-orange-100 text-orange-700",
  offered_different_position: "bg-teal-100 text-teal-700",
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
          { label: "Total", value: counts.total, color: "text-[#2D2F3A]" },
          { label: "New", value: counts.submitted, color: "text-blue-600" },
          { label: "In Review", value: counts.under_review, color: "text-yellow-600" },
          { label: "Accepted", value: counts.accepted, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search applicants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2E7BC4]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E7BC4]"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2E7BC4]"
        >
          <option value="all">All applicants</option>
          <option value="internal">Internal only</option>
          <option value="external">External only</option>
        </select>
      </div>

      {/* Application list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
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
              <div key={app.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : app.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2E7BC4] to-[#2EA87A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {app.applicant_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#2D2F3A]">{app.applicant_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${app.is_internal ? "bg-[#EEF2F9] text-[#1B3464]" : "bg-gray-100 text-gray-500"}`}>
                        {app.is_internal ? "Internal" : "External"}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{app.gender}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {ranked.slice(0, 3).map((r) => (
                        <span key={r.rank} className="text-xs text-gray-500">
                          #{r.rank} {r.position?.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {app.reviewer_notes.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {app.reviewer_notes.length}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-6">
                    {/* Position rankings */}
                    <div>
                      <h4 className="text-sm font-bold text-[#2D2F3A] mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#2E7BC4]" /> Position Rankings
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
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-400 mb-1">Still in school</div>
                        <div className="font-medium text-[#2D2F3A]">{app.still_in_school ? "Yes" : "No"}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-400 mb-1">Time commitment</div>
                        <div className="font-medium text-[#2D2F3A]">{app.expected_time_commitment}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-400 mb-1">Submitted</div>
                        <div className="font-medium text-[#2D2F3A]">{new Date(app.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Essays */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Change they'd implement
                        </h5>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
                          {app.one_change_essay}
                        </p>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Where they fell short
                        </h5>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
                          {app.fell_short_essay}
                        </p>
                      </div>
                      {app.why_mist && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Why MIST
                          </h5>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
                            {app.why_mist}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reviewer notes */}
                    <div>
                      <h4 className="text-sm font-bold text-[#2D2F3A] mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#2EA87A]" /> Reviewer Notes
                      </h4>
                      {app.reviewer_notes.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {app.reviewer_notes.map((note) => (
                            <div key={note.id} className="bg-gray-50 rounded-xl p-4">
                              {note.knows_applicant && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                                  <span className="text-xs font-semibold text-yellow-600">
                                    Knows applicant personally
                                    {note.knows_applicant_context && `: ${note.knows_applicant_context}`}
                                  </span>
                                </div>
                              )}
                              <p className="text-sm text-gray-700">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add note */}
                      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this applicant…"
                          rows={2}
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
                            <span className="text-xs text-gray-600">I know this person personally</span>
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
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2E7BC4]"
                          />
                        )}
                      </div>
                    </div>

                    {/* Status actions */}
                    <div>
                      <h4 className="text-sm font-bold text-[#2D2F3A] mb-3">Update Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => updateStatus(app.id, opt.value)}
                              disabled={updatingStatus === app.id || app.status === opt.value}
                              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition-all disabled:opacity-40 ${
                                app.status === opt.value
                                  ? "border-[#1B3464] bg-[#EEF2F9] text-[#1B3464]"
                                  : "border-gray-200 hover:border-gray-300 text-gray-600"
                              }`}
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
