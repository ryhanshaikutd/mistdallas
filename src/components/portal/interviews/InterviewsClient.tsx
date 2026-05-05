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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {!cycle ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No active recruitment cycle.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Slots", value: slots.length, color: "text-[#2D2F3A]" },
              { label: "Available", value: available.length, color: "text-green-600" },
              { label: "Booked", value: booked.length, color: "text-purple-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add slot */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-[#2D2F3A] mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2E7BC4]" />
              Add Interview Slot
            </h3>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E7BC4]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start time</label>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E7BC4]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End time</label>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E7BC4]"
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
            <p className="text-xs text-gray-400 mt-3">
              When an applicant books a slot, a Google Meet link is automatically generated and a calendar invite is sent to all parties.
            </p>
          </div>

          {/* Booked interviews */}
          {bookings.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-50">
                <h3 className="font-bold text-[#2D2F3A] flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600" />
                  Scheduled Interviews
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-[#2D2F3A] text-sm">{b.application?.applicant_name}</div>
                        <div className="text-xs text-gray-400">{b.application?.applicant_email}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-[#2D2F3A]">
                        {b.slot ? format(parseISO(b.slot.starts_at), "MMM d, yyyy") : "—"}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 justify-center">
                        <Clock className="w-3 h-3" />
                        {b.slot ? `${format(parseISO(b.slot.starts_at), "h:mm a")} – ${format(parseISO(b.slot.ends_at), "h:mm a")}` : "—"}
                      </div>
                    </div>
                    {b.meet_link ? (
                      <a
                        href={b.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-green-100 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Meet
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No link yet</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available slots */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-50">
              <h3 className="font-bold text-[#2D2F3A] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2E7BC4]" />
                Available Slots ({available.length})
              </h3>
            </div>
            {available.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No open slots. Add one above.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {available.map((slot) => (
                  <div key={slot.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-300" />
                      <div>
                        <div className="text-sm font-medium text-[#2D2F3A]">
                          {format(parseISO(slot.starts_at), "EEEE, MMMM d, yyyy")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(parseISO(slot.starts_at), "h:mm a")} – {format(parseISO(slot.ends_at), "h:mm a")}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSlot(slot.id)}
                      disabled={deleting === slot.id}
                      className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
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
