import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTicketNumber } from '@/lib/ticket-utils';
import { validateApiAuth } from '@/lib/api-auth';
import { TicketCategory, TicketStatus, TicketPriority, TicketOrigin } from '@prisma/client';

interface CreateTicketPayload {
  title?: string;
  titolo?: string;
  description?: string;
  descrizione?: string;
  applicant?: string;
  richiedente?: string;
  contact?: string;
  priority?: string;
  priorita?: string;
  deadline?: string;
  scadenza?: string;
  targetCloseDate?: string;
  status?: string;
  stato?: string;
  category?: string;
  categoria?: string;
  origin?: string;
  origine?: string;
}

export async function POST(request: Request) {
  const auth = validateApiAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    let body: CreateTicketPayload;
    try {
      body = (await request.json()) as CreateTicketPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato richiesta non valido: inviare un payload JSON valido.',
        },
        { status: 400 }
      );
    }

    // Support both Italian and English parameter names
    const title = (body.title || body.titolo || '').trim();
    const description = (body.description || body.descrizione || '').trim();
    const applicant = (body.applicant || body.richiedente || body.contact || '').trim();
    const rawPriority = body.priority || body.priorita;
    const rawDeadline = body.deadline || body.scadenza || body.targetCloseDate;
    const rawStatus = body.status || body.stato;
    const rawCategory = body.category || body.categoria;
    const rawOrigin = body.origin || body.origine;

    // Validation of mandatory fields
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Campo obbligatorio mancante: Titolo del ticket.' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Campo obbligatorio mancante: Descrizione del ticket.' },
        { status: 400 }
      );
    }

    if (!applicant) {
      return NextResponse.json(
        { success: false, error: 'Campo obbligatorio mancante: Richiedente del ticket.' },
        { status: 400 }
      );
    }

    // Normalize Priority
    let priority: TicketPriority = TicketPriority.BASSA;
    if (rawPriority) {
      const pUpper = String(rawPriority).toUpperCase().trim();
      if (pUpper === 'BASSA' || pUpper === 'LOW') priority = TicketPriority.BASSA;
      else if (pUpper === 'MEDIA' || pUpper === 'MEDIUM') priority = TicketPriority.MEDIA;
      else if (pUpper === 'ALTA' || pUpper === 'HIGH' || pUpper === 'URGENTE') priority = TicketPriority.ALTA;
      else if (pUpper === 'CRITICA' || pUpper === 'CRITICAL') priority = TicketPriority.CRITICA;
      else {
        return NextResponse.json(
          {
            success: false,
            error: `Priorità non valida: "${rawPriority}". Valori ammessi: BASSA, MEDIA, ALTA, CRITICA.`,
          },
          { status: 400 }
        );
      }
    }

    // Normalize Status
    let status: TicketStatus = TicketStatus.NUOVO;
    if (rawStatus) {
      const sUpper = String(rawStatus).toUpperCase().trim();
      if (Object.values(TicketStatus).includes(sUpper as TicketStatus)) {
        status = sUpper as TicketStatus;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Stato non valido: "${rawStatus}". Valori ammessi: ${Object.values(TicketStatus).join(', ')}.`,
          },
          { status: 400 }
        );
      }
    }

    // Normalize Category
    let category: TicketCategory = TicketCategory.ALTRO;
    if (rawCategory) {
      const cUpper = String(rawCategory).toUpperCase().trim();
      if (Object.values(TicketCategory).includes(cUpper as TicketCategory)) {
        category = cUpper as TicketCategory;
      }
    }

    // Normalize Origin
    let origin: TicketOrigin = TicketOrigin.PORTALE;
    if (rawOrigin) {
      const oUpper = String(rawOrigin).toUpperCase().trim();
      if (Object.values(TicketOrigin).includes(oUpper as TicketOrigin)) {
        origin = oUpper as TicketOrigin;
      }
    }

    // Parse Deadline Date (if provided)
    let targetCloseDate: Date | null = null;
    if (rawDeadline) {
      const parsedDate = new Date(rawDeadline);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: `Data di scadenza non valida: "${rawDeadline}". Utilizzare formato ISO (es. YYYY-MM-DD o ISO string).`,
          },
          { status: 400 }
        );
      }
      targetCloseDate = parsedDate;
    }

    // Attempt to match applicant with registered user
    let creatorId: string | null = null;
    let contactEmail = applicant;

    const matchedUser = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: applicant } },
          { name: { equals: applicant } },
        ],
      },
      select: { id: true, email: true },
    });

    if (matchedUser) {
      creatorId = matchedUser.id;
      contactEmail = matchedUser.email;
    } else if (auth.userId && auth.userId !== 'api-service') {
      creatorId = auth.userId;
    }

    // Generate unique serial ticket number
    const ticketNumber = await generateTicketNumber();

    // Create ticket in database
    const createdTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        status,
        priority,
        category,
        origin,
        contact: contactEmail,
        targetCloseDate,
        creatorId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Ticket creato con successo.',
        ticket: createdTicket,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/tickets/create POST] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Errore interno del server durante la creazione del ticket: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
