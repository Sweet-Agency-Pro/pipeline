import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

export const dynamic = "force-dynamic";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function GET() {
  const calendarIds = (process.env.GOOGLE_CALENDAR_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_KEY not set" });
  }

  const key = JSON.parse(credentials);
  const auth = new GoogleAuth({
    credentials: { client_email: key.client_email, private_key: key.private_key },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = typeof tokenRes === "string" ? tokenRes : tokenRes.token;

  const results: Record<string, unknown> = { calendarIds };

  for (const calId of calendarIds) {
    try {
      const now = new Date();
      const params = new URLSearchParams({
        timeMin: new Date(now.getTime() - 7 * 86400000).toISOString(),
        timeMax: new Date(now.getTime() + 7 * 86400000).toISOString(),
        singleEvents: "true",
        maxResults: "5",
      });
      const res = await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) {
        const errBody = await res.text();
        results[calId] = { status: res.status, statusText: res.statusText, error: errBody };
      } else {
        const data = await res.json();
        results[calId] = {
          status: 200,
          eventCount: (data.items || []).length,
          calendarName: data.summary,
          events: (data.items || []).slice(0, 3).map((e: { summary?: string; start?: { dateTime?: string } }) => ({
            title: e.summary,
            start: e.start?.dateTime,
          })),
        };
      }
    } catch (err) {
      results[calId] = { error: String(err) };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
