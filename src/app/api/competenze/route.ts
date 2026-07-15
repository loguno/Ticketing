import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TicketStatus, StartupStatus } from '@prisma/client';

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  // This view is reserved for ADMIN and HELPDESK users
  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  try {
    // 1. Fetch tickets with relevant statuses (active ones)
    const tickets = await db.ticket.findMany({
      where: {
        status: {
          in: ['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO', 'SOSPESO'] as TicketStatus[],
        },
        OR: [
          { operatorId: userId },
          { operatorId: null },
          { creatorId: userId },
        ],
      },
      include: {
        creator: {
          select: { name: true, email: true },
        },
        operator: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 2. Fetch startup activities with active statuses
    const activities = await db.startupActivity.findMany({
      where: {
        status: {
          in: ['NUOVO', 'IN_LAVORAZIONE', 'SOSPESO'] as StartupStatus[],
        },
      },
      include: {
        subactivities: {
          include: {
            responsible: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 3. Categorize Tickets
    const ticketsSpettaAMe: typeof tickets = [];
    const ticketsAttesaRisposta: typeof tickets = [];

    for (const ticket of tickets) {
      // Perspective as assigned Operator or Triage operator
      if (ticket.operatorId === userId || (ticket.operatorId === null && ticket.status === 'NUOVO')) {
        if (['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO'].includes(ticket.status)) {
          ticketsSpettaAMe.push(ticket);
        } else if (ticket.status === 'RISPOSTO') {
          ticketsAttesaRisposta.push(ticket);
        }
      } 
      // Perspective as Creator (but someone else is the operator)
      else if (ticket.creatorId === userId && ticket.operatorId !== userId) {
        if (ticket.status === 'RISPOSTO') {
          ticketsSpettaAMe.push(ticket);
        } else if (['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO'].includes(ticket.status)) {
          ticketsAttesaRisposta.push(ticket);
        }
      }
    }

    // 4. Categorize Startup Activities
    const activitiesSpettaAMe: typeof activities = [];
    const activitiesAttesaRisposta: typeof activities = [];

    for (const activity of activities) {
      // Check if user is personally responsible for any active subactivity
      const hasMyActiveSubactivity = activity.subactivities.some(
        (sub) => sub.responsibleId === userId && sub.status !== 'COMPLETATA'
      );

      // Spetta a me: macro pendingResponse is 1 ("Spetta a me") OR there is an active subactivity assigned to me
      if (activity.pendingResponse === 1 || hasMyActiveSubactivity) {
        activitiesSpettaAMe.push(activity);
      } 
      // Attesa risposta: macro pendingResponse is 2 ("Attesa risposta") AND not already in "Spetta a me"
      else if (activity.pendingResponse === 2) {
        activitiesAttesaRisposta.push(activity);
      }
    }

    return NextResponse.json({
      tickets: {
        spettaAMe: ticketsSpettaAMe,
        attesaRisposta: ticketsAttesaRisposta,
        totalSpettaAMe: ticketsSpettaAMe.length,
        totalAttesaRisposta: ticketsAttesaRisposta.length,
      },
      activities: {
        spettaAMe: activitiesSpettaAMe,
        attesaRisposta: activitiesAttesaRisposta,
        totalSpettaAMe: activitiesSpettaAMe.length,
        totalAttesaRisposta: activitiesAttesaRisposta.length,
      },
      counts: {
        spettaAMe: ticketsSpettaAMe.length + activitiesSpettaAMe.length,
        attesaRisposta: ticketsAttesaRisposta.length + activitiesAttesaRisposta.length,
      }
    });

  } catch (error) {
    console.error('[API Competenze GET] Error:', error);
    return NextResponse.json(
      { error: 'Errore durante il recupero delle attività di competenza.' },
      { status: 500 }
    );
  }
}
