import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendRdvEmail } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { clientEmail, clientName, title, start, end, location, description, isUpdate } = body;

  if (!clientEmail || !title || !start || !end) {
    return NextResponse.json({ error: "clientEmail, title, start et end requis" }, { status: 400 });
  }

  try {
    await sendRdvEmail({
      clientEmail,
      title,
      start,
      end,
      location,
      description,
      isUpdate,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
