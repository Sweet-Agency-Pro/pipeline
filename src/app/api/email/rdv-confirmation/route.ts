import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function buildHtml({
  title,
  date,
  startTime,
  endTime,
  location,
  description,
  assignedName,
}: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  assignedName: string | null;
}) {
  const locationIsLink = location && isValidUrl(location);
  const locationHtml = location
    ? locationIsLink
      ? `<a href="${location}" style="color:#14b8a6;text-decoration:none;font-weight:500;">Rejoindre la visio ↗</a>`
      : location
    : "À définir";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d9488,#06b6d4);padding:32px 28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Rendez-vous confirmé</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Agence Sweet</p>
    </div>

    <!-- Content -->
    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.5;">
        Bonjour,<br><br>
        Nous avons le plaisir de vous confirmer votre rendez-vous :
      </p>

      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;width:100px;">Objet</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:500;">${title}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Date</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:500;text-transform:capitalize;">${date}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Horaire</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:500;">${startTime} – ${endTime}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Lieu</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:500;">${locationHtml}</td>
          </tr>
          ${assignedName ? `
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Avec</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:500;">${assignedName}</td>
          </tr>` : ""}
        </table>
      </div>

      ${description ? `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 4px;color:#64748b;font-size:13px;">Notes :</p>
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.5;">${description}</p>
      </div>` : ""}

      ${locationIsLink ? `
      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${location}" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#06b6d4);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Rejoindre la visio
        </a>
      </div>` : ""}

      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
        En cas d'empêchement, merci de nous prévenir le plus tôt possible en répondant à cet email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        Agence Sweet · contact@agence-sweet.com
      </p>
    </div>
  </div>
</body>
</html>`;
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
  const { clientEmail, clientName, title, start, end, location, description, assignedName } = body;

  if (!clientEmail || !title || !start || !end) {
    return NextResponse.json({ error: "clientEmail, title, start et end requis" }, { status: 400 });
  }

  const fromName = process.env.SMTP_FROM_NAME || "Agence Sweet";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: clientEmail,
      subject: `Confirmation de rendez-vous — ${title}`,
      html: buildHtml({
        title,
        date: formatDate(start),
        startTime: formatTime(start),
        endTime: formatTime(end),
        location: location || null,
        description: description || null,
        assignedName: assignedName || null,
      }),
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email" }, { status: 500 });
  }
}
