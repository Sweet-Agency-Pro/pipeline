import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function getCalendarIds(): string[] {
  const ids = process.env.GOOGLE_CALENDAR_IDS;
  if (!ids) return [];
  return ids.split(",").map((id) => id.trim());
}

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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Paramètres start et end requis" },
      { status: 400 }
    );
  }

  const calendarIds = getCalendarIds();
  if (calendarIds.length === 0) {
    return NextResponse.json({ events: {} });
  }

  try {
    const auth = getGoogleAuth();
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    const token = typeof tokenRes === "string" ? tokenRes : tokenRes.token;

    const events: Record<
      string,
      { id: string; title: string; start: string; end: string; location: string | null; allDay: boolean }[]
    > = {};

    await Promise.all(
      calendarIds.map(async (calId) => {
        try {
          const params = new URLSearchParams({
            timeMin: new Date(startDate).toISOString(),
            timeMax: new Date(endDate).toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "250",
          });
          const res = await fetch(
            `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) {
            console.warn(`Calendrier ${calId}: ${res.status} ${res.statusText}`);
            return;
          }
          const data = await res.json();
          events[calId] = (data.items || []).map(
            (event: { id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; location?: string }) => {
              const allDay = !event.start?.dateTime;
              return {
                id: event.id || "",
                title: event.summary || "(sans titre)",
                start: event.start?.dateTime || event.start?.date || "",
                end: event.end?.dateTime || event.end?.date || "",
                location: event.location || null,
                allDay,
              };
            }
          );
        } catch (err) {
          console.warn(`Calendrier ${calId} inaccessible, ignoré.`);
        }
      })
    );

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des événements" },
      { status: 500 }
    );
  }
}
