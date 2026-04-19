import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendRdvEmail } from "@/lib/email-service";
import { insertEmailLog, toErrorMessage } from "@/lib/email-logs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const {
    clientEmail,
    clientName,
    title,
    start,
    end,
    location,
    description,
    isUpdate,
    assignedName,
    rdvId,
  } = body;

  if (!clientEmail || !title || !start || !end) {
    return NextResponse.json({ error: "clientEmail, title, start et end requis" }, { status: 400 });
  }

  const emailType = isUpdate ? "update" : "confirmation";
  const subjectPrefix = isUpdate ? "Modification de rendez-vous" : "Confirmation de rendez-vous";
  const subject = `${subjectPrefix} - ${title}`;

  try {
    const delivery = await sendRdvEmail({
      clientEmail,
      clientFirstName: clientName,
      assignedName,
      title,
      start,
      end,
      location,
      description,
      isUpdate,
    });

    await insertEmailLog(supabase, {
      emailType,
      status: "sent",
      recipient: clientEmail,
      subject,
      rdvId,
      source: "manual",
      messageId: delivery.messageId,
      providerResponse: delivery.response,
      accepted: delivery.accepted,
      rejected: delivery.rejected,
      metadata: {
        start,
        end,
        location: location || null,
        title,
      },
      createdBy: user.id,
    });

    return NextResponse.json({
      sent: true,
      delivery,
    });
  } catch (error) {
    console.error("Email send error:", error);

    await insertEmailLog(supabase, {
      emailType,
      status: "failed",
      recipient: clientEmail,
      subject,
      rdvId,
      source: "manual",
      errorMessage: toErrorMessage(error),
      metadata: {
        start,
        end,
        location: location || null,
        title,
      },
      createdBy: user.id,
    });

    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
