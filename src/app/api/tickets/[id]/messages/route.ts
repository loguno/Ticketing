import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTicketEmail } from '@/lib/smtp';
import fs from 'fs';
import path from 'path';
import { MessageType } from '@prisma/client';

const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR || './attachments';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato.' }, { status: 404 });
    }

    // Access control: STANDARD users can only view messages for their own tickets
    if (userRole === 'STANDARD') {
      const userObj = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const isCreator = ticket.creatorId === userId;
      const isContact = userObj && ticket.contact.toLowerCase() === userObj.email.toLowerCase();

      if (!isCreator && !isContact) {
        return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
      }
    }

    // Retrieve messages (STANDARD users must NOT see internal notes)
    const messages = await db.message.findMany({
      where: {
        ticketId: id,
        ...(userRole === 'STANDARD' ? { type: MessageType.USER_COMMUNICATION } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: { name: true, role: true },
        },
        attachments: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[API Messages GET] Error listing messages:', error);
    return NextResponse.json({ error: 'Errore durante il caricamento dei messaggi.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  try {
    const ticket = await db.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato.' }, { status: 404 });
    }

    const userObj = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Access control: Verify user has permission to post to this ticket
    if (userRole === 'STANDARD') {
      const isCreator = ticket.creatorId === userId;
      const isContact = userObj && ticket.contact.toLowerCase() === userObj.email.toLowerCase();

      if (!isCreator && !isContact) {
        return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
      }

      // Check if ticket is closed or cancelled
      if (ticket.status === 'CHIUSO' || ticket.status === 'ANNULLATO') {
        return NextResponse.json({ error: 'Impossibile inviare messaggi a un ticket chiuso o annullato.' }, { status: 400 });
      }
    }

    const formData = await request.formData();
    const body = formData.get('body') as string;
    let type = formData.get('type') as string; // INTERNAL_NOTE or USER_COMMUNICATION
    const sendNotification = formData.get('sendNotification') === 'true';

    if (!body || body.trim() === '') {
      return NextResponse.json({ error: 'Il corpo del messaggio non può essere vuoto.' }, { status: 400 });
    }

    if (userRole === 'STANDARD') {
      type = 'USER_COMMUNICATION'; // Force standard users to post public communications
    }

    if (!fs.existsSync(ATTACHMENTS_DIR)) {
      fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    }

    // Process files and check size/format
    const files = formData.getAll('attachments') as File[];
    const processedFiles: { filename: string; filePath: string; fileType: string; fileSize: number }[] = [];

    for (const file of files) {
      if (!file || file.size === 0 || !file.name) continue;

      const ext = path.extname(file.name).toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
        return NextResponse.json({
          error: `Formato file non valido per "${file.name}". Sono supportati solo file JPG e PDF.`,
        }, { status: 400 });
      }

      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return NextResponse.json({
          error: `Il file "${file.name}" supera la dimensione massima consentita di 10MB.`,
        }, { status: 400 });
      }

      // Overwrite strategy: save with exact original filename
      const filename = file.name;
      const filePath = path.join(ATTACHMENTS_DIR, filename);
      const buffer = Buffer.from(await file.arrayBuffer());

      fs.writeFileSync(filePath, buffer);

      processedFiles.push({
        filename,
        filePath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
    }

    // Create message in database
    const message = await db.message.create({
      data: {
        ticketId: id,
        senderId: userId,
        senderEmail: userObj?.email || 'utente@azienda.it',
        body,
        type: type as MessageType,
        attachments: {
          create: processedFiles,
        },
      },
      include: {
        attachments: true,
        sender: {
          select: { name: true, role: true },
        },
      },
    });

    // Notify user if it's a public communication sent by staff
    if (type === 'USER_COMMUNICATION' && userRole !== 'STANDARD' && sendNotification && ticket.contact) {
      sendTicketEmail({
        to: ticket.contact,
        ticketNumber: ticket.ticketNumber,
        subject: `Nuova comunicazione sul Ticket [${ticket.ticketNumber}]`,
        bodyText: `Gentile utente,\n\nha ricevuto una nuova risposta da parte del supporto per il ticket ${ticket.ticketNumber} ("${ticket.title}"):\n\n---\n${body}\n---\n\nPuò rispondere direttamente a questa email o accedere al portale.\n\nCordiali saluti,\nSupporto IT Logistica Uno`,
        bodyHtml: `
          <p>Gentile utente,</p>
          <p>ha ricevuto una nuova risposta da parte del supporto per il ticket <strong>${ticket.ticketNumber}</strong> ("<em>${ticket.title}</em>"):</p>
          <blockquote style="border-left: 4px solid #004b97; padding-left: 16px; margin: 16px 0; color: #475569; font-style: italic;">
            ${body.replace(/\n/g, '<br>')}
          </blockquote>
          <p>Può rispondere a questa email (mantenendo il riferimento nell'oggetto) o accedere al portale per visualizzare lo storico.</p>
          <br>
          <p>Cordiali saluti,<br>Supporto IT Logistica Uno</p>
        `,
      }).catch((emailError) => {
        console.error('[API Messages POST] Failed to notify contact via email in background:', emailError);
      });
    }

    // Notify assigned operator if a standard user posts a reply
    if (userRole === 'STANDARD' && ticket.operatorId) {
      const operator = await db.user.findUnique({
        where: { id: ticket.operatorId },
        select: { email: true },
      });

      if (operator?.email) {
        sendTicketEmail({
          to: operator.email,
          ticketNumber: ticket.ticketNumber,
          subject: `Nuovo messaggio utente sul Ticket [${ticket.ticketNumber}]`,
          bodyText: `Nuovo messaggio dall'utente per il ticket ${ticket.ticketNumber} ("${ticket.title}"):\n\n---\n${body}\n---\n\nAccedere al portale per gestire la richiesta.`,
          bodyHtml: `
            <p>Nuovo messaggio dall'utente per il ticket <strong>${ticket.ticketNumber}</strong> ("<em>${ticket.title}</em>"):</p>
            <blockquote style="border-left: 4px solid #004b97; padding-left: 16px; margin: 16px 0; color: #475569;">
              ${body.replace(/\n/g, '<br>')}
            </blockquote>
            <p>Accedere al portale per gestire la richiesta.</p>
          `,
        }).catch((emailError) => {
          console.error('[API Messages POST] Failed to notify operator via email in background:', emailError);
        });
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[API Messages POST] Error creating message:', error);
    return NextResponse.json({ error: 'Errore interno del server durante l\'invio del messaggio.' }, { status: 500 });
  }
}
