import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function getGoogleAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }
  const key = JSON.parse(credentials);
  return new GoogleAuth({
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { calendarId, title, start, end, location, description } = body;


  if (!calendarId || !title || !start || !end) {
    return NextResponse.json(
      { error: "calendarId, title, start et end requis" },
      { status: 400 }
    );
  }

  try {
    const auth = getGoogleAuth();
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = typeof tokenRes === "string" ? tokenRes : tokenRes.token;

    const event = {
      summary: title,
      start: { dateTime: start, timeZone: "Europe/Paris" },
      end: { dateTime: end, timeZone: "Europe/Paris" },
      ...(location ? { location } : {}),
      ...(description ? { description } : {}),
    };

    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Google Calendar insert error: ${res.status}`, err);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'événement Google" },
        { status: res.status }
      );
    }

    const created = await res.json();
    return NextResponse.json({ eventId: created.id });
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}

function getCalendarIds(): string[] {
  const ids = process.env.GOOGLE_CALENDAR_IDS;
  if (!ids) return [];
  return ids.split(",").map((id) => id.trim());
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { title, start } = body;

  if (!title || !start) {
    return NextResponse.json({ error: "title et start requis" }, { status: 400 });
  }

  const calendarIds = getCalendarIds();
  if (calendarIds.length === 0) {
    return NextResponse.json({ deleted: false, reason: "no calendars" });
  }

  try {
    const auth = getGoogleAuth();
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = typeof tokenRes === "string" ? tokenRes : tokenRes.token;

    // Search and delete matching event in ALL calendars
    const results = [];
    for (const calId of calendarIds) {
      try {
        const startDate = new Date(start);
        const params = new URLSearchParams({
          timeMin: new Date(startDate.getTime() - 60000).toISOString(),
          timeMax: new Date(startDate.getTime() + 60000).toISOString(),
          singleEvents: "true",
          q: title,
          maxResults: "5",
        });
        const listRes = await fetch(
          `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!listRes.ok) continue;

        const data = await listRes.json();
        const match = (data.items || []).find(
          (ev: { summary?: string; start?: { dateTime?: string } }) =>
            ev.summary === title && ev.start?.dateTime && new Date(ev.start.dateTime).getTime() === startDate.getTime()
        );

        if (match) {
          await fetch(
            `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events/${match.id}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
          );
          results.push({ calendarId: calId, eventId: match.id });
        }
      } catch (err) {
        console.error(`Error deleting from ${calId}:`, err);
        continue;
      }
    }

    return NextResponse.json({ 
      deleted: results.length > 0, 
      count: results.length,
      details: results 
    });
  } catch (error) {
    console.error("Google Calendar delete error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
