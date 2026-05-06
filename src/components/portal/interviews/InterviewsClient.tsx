"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Calendar, Clock, Plus, Trash2, Video, User, Check } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
}

interface Booking {
  id: string;
  meet_link: string | null;
  application: { applicant_name: string; applicant_email: string; status: string } | null;
  slot: { starts_at: string; ends_at: string } | null;
}

interface Props {
  profile: Profile | null;
  cycle: { id: string; year: number; type: string } | null;
  slots: Slot[];
  bookings: Booking[];
}

export default function InterviewsClient({ profile, cycle, slots: initialSlots, bookings: initialBookings }: Props) {
  const supabase = createClient();
  const [slots, setSlots] = useState(initialSlots);
  const [bookings] = useState(initialBookings);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function addSlot() {
    if (!newDate || !newStart || !newEnd || !cycle) return;
    setAdding(true);
    const starts_at = new Date(`${newDate}T${newStart}`).toISOString();
    const ends_at = new Date(`${newDate}T${newEnd}`).toISOString();

    const { data, error } = await supabase
      .from("interview_slots")
      .insert({ cycle_id: cycle.id, starts_at, ends_at })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add slot.");
    } else {
      setSlots((prev) => [...prev, data].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setNewDate(""); setNewStart(""); setNewEnd("");
      toast.success("Slot added. Applicants can now book this time.");
    }
    setAdding(false);
  }

  async function deleteSlot(id: string) {
    setDeleting(id);
    const { error } = await supabase.from("interview_slots").delete().eq("id", id);
    if (error) {
      toast.error("Can't delete — slot may already be booked.");
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Slot removed.");
    }
    setDeleting(null);
  }

  const available = slots.filter((s) => !s.is_booked);
  const booked = slots.filter((s) => s.is_booked);

  const inputStyle = {
    background: "var(--p-card)",
    borderColor: "var(--p-border)",
    color: "var(--p-text)",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!cycle ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-muted)" }}>
          No active recruitment cycle.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Slots", value: slots.length, color: "var(--p-text)" },
              { label: "Available", value: available.length, color: "#2EA87A" },
              { label: "Booked", value: booked.length, color: "#8B5CF6" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border p-5 text-center" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
                <div className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-syne)" }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--p-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add slot */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
            <h3 className="font-bold mb-5 flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
              <Plus className="w-4 h-4" style={{ color: "#2E7BC4" }} />
              Add Interview Slot
            </h3>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--p-muted)" }}>Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--p-muted)" }}>Start time</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--p-muted)" }}>End time</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addSlot}
                  disabled={adding || !newDate || !newStart || !newEnd}
                  className="w-full bg-[#1B3464] text-white font-semibold py-2.5 rounded-xl hover:bg-[#2E7BC4] transition-colors disabled:opacity-40 text-sm"
                >
                  {adding ? "Adding…" : "Add Slot"}
                </button>
              </div>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--p-muted)" }}>
              When an applicant books a slot, a Google Meet link is automatically generated and a calendar invite is sent to all parties.
            </p>
          </div>

          {/* Booked interviews */}
          {bookings.length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
              <div className="p-5 border-b" style={{ borderColor: "var(--p-border)" }}>
                <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
                  <Check className="w-4 h-4 text-purple-500" />
                  Scheduled Interviews
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
                {bookings.map((b) => (
                  <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#8B5CF620" }}>
                        <User className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: "var(--p-text)" }}>{b.application?.applicant_name}</div>
                        <div className="text-xs" style={{ color: "var(--p-muted)" }}>{b.application?.applicant_email}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold" style={{ color: "var(--p-text)" }}>
                        {b.slot ? format(parseISO(b.slot.starts_at), "MMM d, yyyy") : "—"}
                      </div>
                      <div className="text-xs flex items-center gap-1 justify-center" style={{ color: "var(--p-muted)" }}>
                        <Clock className="w-3 h-3" />
                        {b.slot ? `${format(parseISO(b.slot.starts_at), "h:mm a")} – ${format(parseISO(b.slot.ends_at), "h:mm a")}` : "—"}
                      </div>
                    </div>
                    {b.meet_link ? (
                      <a
                        href={b.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                        style={{ background: "#2EA87A20", border: "1px solid #2EA87A50", color: "#2EA87A" }}
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Meet
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--p-muted)" }}>No link yet</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available slots */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--p-card)", borderColor: "var(--p-border)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--p-border)" }}>
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--p-text)", fontFamily: "var(--font-syne)" }}>
                <Calendar className="w-4 h-4" style={{ color: "#2E7BC4" }} />
                Available Slots ({available.length})
              </h3>
            </div>
            {available.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "var(--p-muted)" }}>
                No open slots. Add one above.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--p-border)" }}>
                {available.map((slot) => (
                  <div key={slot.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4" style={{ color: "var(--p-muted)" }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--p-text)" }}>
                          {format(parseISO(slot.starts_at), "EEEE, MMMM d, yyyy")}
                        </div>
                        <div className="text-xs" style={{ color: "var(--p-muted)" }}>
                          {format(parseISO(slot.starts_at), "h:mm a")} – {format(parseISO(slot.ends_at), "h:mm a")}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSlot(slot.id)}
                      disabled={deleting === slot.id}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: "var(--p-muted)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; (e.currentTarget as HTMLElement).style.background = "#EF444410"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--p-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
