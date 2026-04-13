import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
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

function formatCalendarDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function getGoogleCalendarUrl({ title, start, end, location, description }: { title: string, start: string, end: string, location: string | null, description: string | null }) {
  const base = "https://www.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams({
    text: title,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    location: location || "",
  });
  return `${base}&${params.toString()}`;
}

export interface EmailParams {
  clientEmail: string;
  clientFirstName?: string;
  assignedName?: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  description?: string | null;
  isUpdate?: boolean;
  isReminder?: boolean;
}

export function buildHtml({
  title,
  date,
  startTime,
  endTime,
  location,
  description,
  isUpdate,
  isReminder,
  clientFirstName = "Client",
  assignedName = "notre équipe",
  rawStart,
  rawEnd,
}: {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  isUpdate?: boolean;
  isReminder?: boolean;
  clientFirstName?: string;
  assignedName?: string;
  rawStart: string;
  rawEnd: string;
}) {
  const locationIsLink = location && isValidUrl(location);
  const locationHtml = location
    ? locationIsLink
      ? `<a href="${location}" style="color:#14b8a6;text-decoration:none;font-weight:500;">Rejoindre la visio ↗</a>`
      : location
    : "À définir";

  const greeting = clientFirstName && clientFirstName !== "Client" ? `Bonjour ${clientFirstName},` : "Bonjour,";

  let headerTitle = "Confirmation de rendez-vous";
  let introText = `${greeting}<br><br>Nous avons le plaisir de vous confirmer votre rendez-vous :`;

  if (isReminder) {
    headerTitle = "Rappel : Votre rendez-vous demain";
    introText = `${greeting}<br><br>Petit rappel pour votre rendez-vous visio de demain avec ${assignedName} de l'Agence Sweet.`;
  } else if (isUpdate) {
    headerTitle = "Rendez-vous modifié";
    introText = `${greeting}<br><br>Nous vous informons que votre rendez-vous a été modifié. Voici les nouvelles informations :`;
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d9488,#06b6d4);padding:32px 28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${headerTitle}</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Agence Sweet</p>
    </div>

    <!-- Content -->
    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
        ${introText}
      </p>

      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:100px;font-weight:500;">Objet</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${title}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:500;">📅 Date</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-transform:capitalize;">${date} à ${startTime}</td>
          </tr>
          ${locationHtml ? `
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:500;">🔗 Lien de connexion</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${locationHtml}</td>
          </tr>` : ""}
        </table>
      </div>

      ${isReminder ? `
      <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">
        Pour rejoindre la réunion, il vous suffit de cliquer sur le lien ci-dessus - pas besoin de télécharger quoi que ce soit.
      </p>
      <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.6;background:#f0fdfa;padding:16px;border-radius:8px;border-left:4px solid #14b8a6;">
        Pendant ce rendez-vous de 30 minutes, <strong>${assignedName}</strong> vous présentera gratuitement l'esquisse de votre futur site internet, réalisée spécialement pour votre entreprise. N'hésitez pas à prendre de quoi écrire pour prendre des notes et si vous le pouvez, accéder au lien via un ordinateur, le rendu sera plus agréable pour vous.
      </p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;text-align:center;">
        Nous avons hâte de vous rencontrer !
      </p>
      ` : `
      <div style="margin: 24px 0; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 12px; color: #64748b; font-size: 13px; font-weight: 500;">📅 Ajouter à mon agenda</p>
        <div style="text-align: center;">
          <a href="${getGoogleCalendarUrl({ title, start: rawStart, end: rawEnd, location, description })}" 
             style="display: inline-flex; align-items: center; padding: 10px 18px; background-color: #ffffff; color: #3c4043; border: 1px solid #dadce0; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; margin: 4px;"
             target="_blank">
             <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png" width="18" height="18" style="margin-right: 8px; display: inline-block; vertical-align: middle;" alt="">
             Google Calendar
          </a>
        </div>
      </div>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
        ${isUpdate
          ? "Si cette modification ne fait pas suite à votre demande ou si ce nouveau créneau ne vous convient pas, n'hésitez pas à nous contacter en répondant à cet email."
          : "En cas d'empêchement, merci de nous prévenir le plus tôt possible en répondant à cet email."}
      </p>
      `}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 28px;text-align:center;">
      <p style="margin:0;color:#0f172a;font-size:13px;font-weight:600;">
        L'Agence Sweet
      </p>
      <p style="margin:4px 0 0;color:#64748b;font-size:11px;">
        Maël : 06 84 46 62 32 · Attilio : 06 83 94 96 90
      </p>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">
        contact@agence-sweet.com
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendRdvEmail({
  clientEmail,
  clientFirstName,
  assignedName,
  title,
  start,
  end,
  location,
  description,
  isUpdate,
  isReminder,
}: EmailParams) {
  const fromName = process.env.SMTP_FROM_NAME || "Agence Sweet";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  let subject = `Confirmation de rendez-vous - ${title}`;
  if (isReminder) {
    subject = `Rappel : Votre rendez-vous de demain - ${title}`;
  } else if (isUpdate) {
    subject = `Modification de rendez-vous - ${title}`;
  }

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: clientEmail,
    subject,
    html: buildHtml({
      title,
      date: formatDate(start),
      startTime: formatTime(start),
      endTime: formatTime(end),
      location: location || null,
      description: description || null,
      isUpdate,
      isReminder,
      clientFirstName,
      assignedName,
      rawStart: start,
      rawEnd: end,
    }),
  });
}
