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
}

export async function sendTicketEmail({
  to,
  ticketNumber,
  subject,
  bodyText,
  bodyHtml,
}: SendEmailParams) {
  // Ensure the ticket number is always included in the subject line for tracking replies
  const formattedSubject = subject.includes(`[${ticketNumber}]`)
    ? subject
    : `[${ticketNumber}] ${subject}`;

  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e3a8a; font-size: 1.5rem;">Portale Gestione Ticket IT</h2>
        <span style="font-size: 0.875rem; color: #64748b;">Riferimento Ticket: <strong>${ticketNumber}</strong></span>
      </div>
      <div style="line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem;">
        ${bodyHtml || bodyText.replace(/\n/g, '<br>')}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 0.75rem; color: #64748b; text-align: center;">
        Questa è una notifica automatica inviata dal Portale Ticket. <br>
        <strong>IMPORTANTE:</strong> Se rispondi a questa email, non rimuovere o modificare il numero di ticket [${ticketNumber}] nell'oggetto.
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
