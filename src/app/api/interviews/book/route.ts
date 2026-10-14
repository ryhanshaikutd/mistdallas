import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { google, type calendar_v3 } from "googleapis";

/**
 * POST /api/interviews/book  { slotId, applicationId }
 *
 * Books an interview slot for the caller's own application. Ownership is
 * checked with the caller's session; the writes use the service role because
 * applicants are (correctly) not allowed to update slots or applications
 * under RLS.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { slotId?: unknown; applicationId?: unknown } | null;
  const slotId = body?.slotId;
  const applicationId = body?.applicationId;
  if (typeof slotId !== "string" || typeof applicationId !== "string") {
    return NextResponse.json({ error: "Missing slotId or applicationId" }, { status: 400 });
  }

  // Ownership check under the caller's RLS context
  const { data: application } = await supabase
    .from("applications")
    .select("id, applicant_name, applicant_email")
    .eq("id", applicationId)
    .eq("applicant_id", user.id)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("interview_bookings")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "This application already has an interview booked" }, { status: 409 });

  // Claim the slot atomically: only succeeds if it is still free.
  const { data: slot } = await admin
    .from("interview_slots")
    .update({ is_booked: true })
    .eq("id", slotId)
    .eq("is_booked", false)
    .select("id, starts_at, ends_at")
    .maybeSingle();
  if (!slot) return NextResponse.json({ error: "Slot not found or already booked" }, { status: 409 });

  const releaseSlot = () => admin.from("interview_slots").update({ is_booked: false }).eq("id", slotId);

  // Google Meet + Calendar event (best effort; booking still succeeds without it)
  let meetLink: string | null = null;
  let calendarEventId: string | null = null;
  let calendar: calendar_v3.Calendar | null = null;
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "primary";

  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });
      calendar = google.calendar({ version: "v3", auth });

      const event = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          summary: `MIST Dallas Interview — ${application.applicant_name}`,
          description: `Board interview for MIST Dallas ${new Date().getFullYear()} recruitment.\n\nApplicant: ${application.applicant_name}\nEmail: ${application.applicant_email}`,
          start: { dateTime: slot.starts_at, timeZone: "America/Chicago" },
          end: { dateTime: slot.ends_at, timeZone: "America/Chicago" },
          attendees: [{ email: application.applicant_email }],
          conferenceData: {
            createRequest: { requestId: `mist-interview-${applicationId}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
          },
          reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 30 }] },
        },
      });
      meetLink = event.data.hangoutLink ?? null;
      calendarEventId = event.data.id ?? null;
    } catch (err) {
      console.error("Google Calendar error:", err);
    }
  }

  const { data: booking, error: bookingErr } = await admin
    .from("interview_bookings")
    .insert({ application_id: applicationId, slot_id: slotId, meet_link: meetLink, calendar_event_id: calendarEventId })
    .select()
    .single();

  if (bookingErr || !booking) {
    console.error("Booking insert error:", bookingErr?.message);
    await releaseSlot();
    if (calendar && calendarEventId) {
      try { await calendar.events.delete({ calendarId, eventId: calendarEventId }); } catch { /* best effort */ }
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  const { error: statusErr } = await admin
    .from("applications")
    .update({ status: "interview_scheduled" })
    .eq("id", applicationId);
  if (statusErr) console.error("Application status update error:", statusErr.message);

  return NextResponse.json({ booking, meetLink });
}
