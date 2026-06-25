import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Exchange or on-premise servers might use self-signed certificates in local networks
    rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
  },
});

interface SendEmailParams {
  to: string;
  ticketNumber: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  ticketId?: string;
}

export async function sendTicketEmail({
  to,
  ticketNumber,
  subject,
  bodyText,
  bodyHtml,
  ticketId,
}: SendEmailParams) {
  // Ensure the ticket number is always included in the subject line for tracking replies
  const formattedSubject = subject.includes(`[${ticketNumber}]`)
    ? subject
    : `[${ticketNumber}] ${subject}`;

  const portalUrl = ticketId
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets/${ticketId}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tickets`;

  const buttonHtml = `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${portalUrl}" style="background-color: #004b97; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(0,75,151,0.2); font-family: Arial, sans-serif;">
        Visualizza e Rispondi sul Portale
      </a>
    </div>
  `;

  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e3a8a; font-size: 1.5rem;">Portale Gestione Ticket IT</h2>
        <span style="font-size: 0.875rem; color: #64748b;">Riferimento Ticket: <strong>${ticketNumber}</strong></span>
      </div>
      <div style="line-height: 1.6; margin-bottom: 20px; font-size: 0.95rem;">
        ${bodyHtml || bodyText.replace(/\n/g, '<br>')}
      </div>
      
      ${buttonHtml}
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 0.8rem; color: #dc2626; background-color: #fef2f2; border-radius: 6px; padding: 12px; text-align: center; font-weight: bold; margin-top: 20px; line-height: 1.4;">
        ⚠️ NOTA IMPORTANTE: Questa è una notifica automatica. Si prega di <strong>NON RISPONDERE</strong> direttamente a questa email. Le risposte inviate via email non saranno elaborate. Per comunicare con il supporto, utilizza esclusivamente il pulsante sopra per accedere al portale.
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: formattedSubject,
    text: bodyText,
    html: defaultHtml,
  };

  return transporter.sendMail(mailOptions);
}

interface SendStartupEmailParams {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export async function sendStartupEmail({
  to,
  subject,
  bodyText,
  bodyHtml,
}: SendStartupEmailParams) {
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #7c2d12; font-size: 1.5rem;">Portale Gestione Attività IT</h2>
        <span style="font-size: 0.875rem; color: #ea580c; font-weight: bold; text-transform: uppercase;">Notifica Attività Start Up</span>
      </div>
      <div style="line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem;">
        ${bodyHtml || bodyText.replace(/\n/g, '<br>')}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 0.75rem; color: #64748b; text-align: center;">
        Questa è una notifica automatica relativa alle attività di Startup. Si prega di non rispondere direttamente a questa email.
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text: bodyText,
    html: defaultHtml,
  };

  return transporter.sendMail(mailOptions);
}

