import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { db } from '../lib/db';
import { generateTicketNumber } from '../lib/ticket-utils';

const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR || './attachments';

// Ensure attachments directory exists
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

interface MailAttachment {
  content: Buffer;
  contentType: string;
  filename?: string;
  size: number;
}

async function parseAndSaveAttachments(attachments: MailAttachment[], ticketId: string, messageId?: string) {
  const attachmentRecords = [];

  for (const att of attachments) {
    // Max size check (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (att.size > MAX_SIZE) {
      console.log(`[IMAP Worker] Attachment ${att.filename || 'unnamed'} skipped because it exceeds 10MB limit.`);
      continue;
    }

    // Supported extensions: JPG, PDF
    const ext = path.extname(att.filename || '').toLowerCase();
    if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
      console.log(`[IMAP Worker] Attachment ${att.filename || 'unnamed'} skipped: unsupported format (${ext}).`);
      continue;
    }

    const uniqueFilename = `${Date.now()}-${att.filename || 'attachment'}`;
    const filePath = path.join(ATTACHMENTS_DIR, uniqueFilename);

    // Save the file buffer to disk
    fs.writeFileSync(filePath, att.content);

    // Save attachment record in database
    const record = await db.attachment.create({
      data: {
        filename: att.filename || 'unnamed_file',
        filePath: filePath,
        fileType: att.contentType || 'application/octet-stream',
        fileSize: att.size,
        ticketId: ticketId,
        messageId: messageId || null,
      },
    });
    attachmentRecords.push(record);
  }

  return attachmentRecords;
}

async function processEmail(source: Buffer, uid: number) {
  try {
    const parsed = await simpleParser(source);

    // Extract sender information
    const sender = parsed.from?.value?.[0];
    const senderEmail = sender?.address || 'sconosciuto@azienda.it';

    // Extract subject and clean body text
    const subject = parsed.subject || 'Senza Oggetto';
    const htmlCleaned = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]*>/g, '') : '';
    const textBody = parsed.text || htmlCleaned || 'Nessun testo nel corpo mail';

    console.log(`[IMAP Worker] Processing email UID: ${uid} from: ${senderEmail} - Subject: "${subject}"`);

    // Check if the subject line references an existing ticket, e.g. [TKT-2026-00001]
    const ticketMatch = subject.match(/\[(TKT-\d{4}-\d{5})\]/i);

    if (ticketMatch) {
      const ticketNumber = ticketMatch[1].toUpperCase();
      console.log(`[IMAP Worker] Found ticket reference: ${ticketNumber}`);

      // Search database for this ticket
      const existingTicket = await db.ticket.findUnique({
        where: { ticketNumber },
      });

      if (existingTicket) {
        // Create a new user communication message under this ticket
        const message = await db.message.create({
          data: {
            ticketId: existingTicket.id,
            senderEmail: senderEmail,
            body: textBody,
            type: 'USER_COMMUNICATION',
          },
        });

        console.log(`[IMAP Worker] Added reply message to ticket ${ticketNumber}`);

        // Process attachments for the reply message
        if (parsed.attachments && parsed.attachments.length > 0) {
          await parseAndSaveAttachments(parsed.attachments, existingTicket.id, message.id);
          console.log(`[IMAP Worker] Saved ${parsed.attachments.length} attachments for ticket reply.`);
        }

        return;
      } else {
        console.log(`[IMAP Worker] Ticket ${ticketNumber} referenced in subject was not found in DB. Creating a new ticket instead.`);
      }
    }

    // Create a new ticket if no reference found
    const ticketNumber = await generateTicketNumber();

    const newTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title: subject,
        description: textBody,
        contact: senderEmail,
        status: 'NUOVO',
        origin: 'EMAIL',
      },
    });

    console.log(`[IMAP Worker] Created new ticket ${ticketNumber} for ${senderEmail}`);

    // Process attachments for the new ticket
    if (parsed.attachments && parsed.attachments.length > 0) {
      await parseAndSaveAttachments(parsed.attachments, newTicket.id);
      console.log(`[IMAP Worker] Saved ${parsed.attachments.length} attachments for new ticket.`);
    }

  } catch (error) {
    console.error(`[IMAP Worker] Error processing email UID ${uid}:`, error);
  }
}

async function pollIMAP() {
  if (!process.env.IMAP_USER || !process.env.IMAP_PASS) {
    console.log('[IMAP Worker] Skipping poll: IMAP_USER or IMAP_PASS is not configured in environment.');
    return;
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.azienda.it',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS,
    },
    logger: false,
  });

  try {
    await client.connect();
    console.log('[IMAP Worker] Connected to IMAP server.');

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Find unread (UNSEEN) emails
      const uids = await client.search({ seen: false });
      if (uids && uids.length > 0) {
        console.log(`[IMAP Worker] Found ${uids.length} unread email(s).`);

        for (const uid of uids) {
          const message = await client.fetchOne(String(uid), { source: true });
          if (message && message.source) {
            await processEmail(message.source, uid);
            // Mark email as read
            await client.messageFlagsAdd(String(uid), ['\\Seen']);
          }
        }
      } else {
        console.log('[IMAP Worker] Found 0 unread email(s).');
      }
    } finally {
      lock.release();
    }

    await client.logout();
    console.log('[IMAP Worker] Connection closed.');
  } catch (error) {
    console.error('[IMAP Worker] IMAP polling error:', error);
  }
}

// Start polling immediately, then every 2 minutes
const POLL_INTERVAL = 2 * 60 * 1000;

console.log('Starting IMAP Polling Worker (Interval: 2 minutes)...');
pollIMAP();
setInterval(pollIMAP, POLL_INTERVAL);
