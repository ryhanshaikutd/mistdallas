import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slotId, applicationId } = await req.json();
  if (!slotId || !applicationId) {
    return NextResponse.json({ error: "Missing slotId or applicationId" }, { status: 400 });
  }

  // Fetch slot details
  const { data: slot, error: slotErr } = await supabase
    .from("interview_slots")
    .select("*")
    .eq("id", slotId)
    .eq("is_booked", false)
    .single();

  if (slotErr || !slot) {
    return NextResponse.json({ error: "Slot not found or already booked" }, { status: 409 });
  }

  // Fetch applicant profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("applicant_id", user.id)
    .single();

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  let meetLink: string | null = null;
  let calendarEventId: string | null = null;

  // Create Google Meet + Calendar event
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: `MIST Dallas Interview — ${application.applicant_name}`,
        description: `Board interview for MIST Dallas ${new Date().getFullYear()} recruitment.\n\nApplicant: ${application.applicant_name}\nEmail: ${application.applicant_email}`,
        start: { dateTime: slot.starts_at, timeZone: "America/Chicago" },
        end: { dateTime: slot.ends_at, timeZone: "America/Chicago" },
        attendees: [{ email: application.applicant_email }],
        conferenceData: {
          createRequest: {
            requestId: `mist-interview-${applicationId}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      },
    });

    meetLink = event.data.hangoutLink ?? null;
    calendarEventId = event.data.id ?? null;
  } catch (err) {
    console.error("Google Calendar error:", err);
    // Continue without Meet link — don't block the booking
  }

  // Mark slot as booked and create booking record
  const [, { data: booking, error: bookingErr }] = await Promise.all([
    supabase.from("interview_slots").update({ is_booked: true }).eq("id", slotId),
    supabase
      .from("interview_bookings")
      .insert({ application_id: applicationId, slot_id: slotId, meet_link: meetLink, calendar_event_id: calendarEventId })
      .select()
      .single(),
  ]);

  if (bookingErr) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Update application status
  await supabase
    .from("applications")
    .update({ status: "interview_scheduled" })
    .eq("id", applicationId);

  return NextResponse.json({ booking, meetLink });
}
