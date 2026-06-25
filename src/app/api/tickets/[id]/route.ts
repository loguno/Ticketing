import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendTicketEmail } from '@/lib/smtp';
import { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

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
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        operator: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato.' }, { status: 404 });
    }

    // Access control: STANDARD users can only view their own tickets
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

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('[API Ticket GET] Error fetching ticket:', error);
    return NextResponse.json({ error: 'Errore durante il recupero del ticket.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  // Only HELPDESK and ADMIN can update ticket parameters (triage, status, operator)
  if (!userRole || !['ADMIN', 'HELPDESK'].includes(userRole)) {
    return NextResponse.json({ error: 'Accesso negato. Permessi insufficienti.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { status, priority, category, operatorId, targetCloseDate, isSuggestion, sendNotification } = body;

    const oldTicket = await db.ticket.findUnique({
      where: { id },
      include: { operator: true },
    });

    if (!oldTicket) {
      return NextResponse.json({ error: 'Ticket non trovato.' }, { status: 404 });
    }

    // Build update payload
    const updateData: import('@prisma/client').Prisma.TicketUpdateInput = {};
    if (status) updateData.status = status as TicketStatus;
    if (priority) updateData.priority = priority as TicketPriority;
    if (category) updateData.category = category as TicketCategory;
    if (isSuggestion !== undefined) updateData.isSuggestion = isSuggestion;
    if (operatorId !== undefined) {
      updateData.operator = operatorId ? { connect: { id: operatorId } } : { disconnect: true };
    }
    if (targetCloseDate !== undefined) updateData.targetCloseDate = targetCloseDate ? new Date(targetCloseDate) : null;

    const updatedTicket = await db.ticket.update({
      where: { id },
      data: updateData,
      include: {
        operator: {
          select: { name: true, email: true },
        },
      },
    });

    // Create automatic audit trail note (INTERNAL_NOTE)
    const updater = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    let activityText = '';
    if (status && status !== oldTicket.status) {
      activityText += `Stato modificato da ${oldTicket.status} a ${status}. `;
    }
    if (priority && priority !== oldTicket.priority) {
      activityText += `Priorità modificata da ${oldTicket.priority} a ${priority}. `;
    }
    if (category && category !== oldTicket.category) {
      activityText += `Categoria modificata da ${oldTicket.category} a ${category}. `;
    }
    if (isSuggestion !== undefined && isSuggestion !== oldTicket.isSuggestion) {
      activityText += isSuggestion 
        ? "Segnalato come Suggerimento/Nuova Idea. "
        : "Rimosso flag Suggerimento/Nuova Idea. ";
    }
    if (operatorId !== undefined && operatorId !== oldTicket.operatorId) {
      const newOpName = updatedTicket.operator ? updatedTicket.operator.name : 'Nessuno';
      activityText += `Operatore assegnato: ${newOpName}. `;
    }

    if (activityText) {
      await db.message.create({
        data: {
          ticketId: id,
          senderId: userId,
          senderEmail: updater?.email || 'system@azienda.it',
          body: `[ATTIVITÀ AUTOMATICA] ${activityText} (Eseguito da: ${updater?.name})`,
          type: 'INTERNAL_NOTE',
        },
      });
    }

    // Optional: Send email notification via SMTP on status change
    if (sendNotification && status && status !== oldTicket.status && oldTicket.contact) {
      const statusLabelMap: Record<TicketStatus, string> = {
        NUOVO: 'Da valutare (Nuovo)',
        IN_VALUTAZIONE: 'In Valutazione',
        RISOLTO: 'Risolto',
        CHIUSO: 'Chiuso',
        NON_RISOLVIBILE: 'Non Risolvibile',
        ANNULLATO: 'Annullato',
        SOSPESO: 'Sospeso',
      };

      const statusLabel = statusLabelMap[status as TicketStatus] || status;

      sendTicketEmail({
        to: oldTicket.contact,
        ticketNumber: oldTicket.ticketNumber,
        subject: `Aggiornamento Stato Ticket [${oldTicket.ticketNumber}]`,
        bodyText: `Gentile utente,\n\nlo stato del suo ticket ${oldTicket.ticketNumber} ("${oldTicket.title}") è stato modificato in: ${statusLabel}.\n\nSi prega di NON rispondere a questa e-mail. Acceda al portale per visualizzare i dettagli.\n\nCordiali saluti,\nSupporto IT Logistica Uno`,
        bodyHtml: `
          <p>Gentile utente,</p>
          <p>lo stato del suo ticket <strong>${oldTicket.ticketNumber}</strong> ("<em>${oldTicket.title}</em>") è stato modificato in: <strong>${statusLabel}</strong>.</p>
          <p>Si prega di <strong>non rispondere direttamente a questa e-mail</strong>. Per visualizzare i dettagli del ticket o inviare una risposta, acceda alla sua dashboard cliccando sul pulsante sottostante.</p>
          <br>
          <p>Cordiali saluti,<br>Supporto IT Logistica Uno</p>
        `,
        ticketId: oldTicket.id,
      }).catch((emailError) => {
        console.error('[API Ticket PATCH] Failed to send status change notification email in background:', emailError);
      });
    }

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('[API Ticket PATCH] Error updating ticket:', error);
    return NextResponse.json({ error: 'Errore durante la modifica del ticket.' }, { status: 500 });
  }
}
