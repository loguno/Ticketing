import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiAuth } from '@/lib/api-auth';
import { TicketPriority, TicketStatus } from '@prisma/client';

const ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.NUOVO,
  TicketStatus.IN_VALUTAZIONE,
  TicketStatus.IN_CARICO,
  TicketStatus.RISPOSTO,
  TicketStatus.SOSPESO,
];

export async function GET(request: Request) {
  const auth = validateApiAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const inactivityDaysParam = parseInt(searchParams.get('inactivityDays') || '3', 10);
    const thresholdDays = isNaN(inactivityDaysParam) || inactivityDaysParam < 1 ? 3 : inactivityDaysParam;

    // Reference Date calculation
    const now = dateParam ? new Date(dateParam) : new Date();
    const referenceDateStr = now.toISOString().split('T')[0];

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const inactivityCutoff = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

    // Fetch all active tickets with operator, creator and message counts
    const activeTickets = await db.ticket.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        operator: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // 1. Scadenze di Oggi
    const scadenzeOggi = activeTickets.filter((t) => {
      if (!t.targetCloseDate) return false;
      const d = new Date(t.targetCloseDate);
      return d >= startOfToday && d <= endOfToday;
    });

    // 2. Ticket già Scaduti (Overdue)
    const scaduti = activeTickets.filter((t) => {
      if (!t.targetCloseDate) return false;
      return new Date(t.targetCloseDate) < startOfToday;
    });

    // 3. Priorità Critiche e Alte
    const prioritaCritiche = activeTickets
      .filter((t) => t.priority === TicketPriority.CRITICA || t.priority === TicketPriority.ALTA)
      .sort((a, b) => {
        if (a.priority === TicketPriority.CRITICA && b.priority !== TicketPriority.CRITICA) return -1;
        if (a.priority !== TicketPriority.CRITICA && b.priority === TicketPriority.CRITICA) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    // 4. Solleciti Pendenti e Ticket Fermi
    const sollecitiPendenti = activeTickets
      .filter((t) => {
        const lastUpdated = new Date(t.updatedAt);
        return lastUpdated <= inactivityCutoff;
      })
      .map((t) => {
        const diffMs = now.getTime() - new Date(t.updatedAt).getTime();
        const giorniFermo = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        
        let chiDeveRispondere = 'HELPDESK';
        let motivo = `Ticket in lavorazione fermo da ${giorniFermo} giorni senza aggiornamenti.`;

        if (t.status === TicketStatus.RISPOSTO) {
          chiDeveRispondere = 'UTENTE / RICHIEDENTE';
          motivo = `In attesa di riscontro dall'utente da ${giorniFermo} giorni.`;
        } else if (t.status === TicketStatus.NUOVO) {
          chiDeveRispondere = 'HELPDESK (TRIAGE)';
          motivo = `Ticket nuovo non ancora preso in carico da ${giorniFermo} giorni.`;
        }

        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          status: t.status,
          priority: t.priority,
          contact: t.contact,
          operator: t.operator ? t.operator.name : 'Non Assegnato',
          updatedAt: t.updatedAt,
          giorniFermo,
          chiDeveRispondere,
          motivo,
        };
      })
      .sort((a, b) => b.giorniFermo - a.giorniFermo);

    // Summary Statistics
    const stats = {
      totaleAperti: activeTickets.length,
      nuoviDaValutare: activeTickets.filter((t) => t.status === TicketStatus.NUOVO).length,
      inCarico: activeTickets.filter((t) => t.status === TicketStatus.IN_CARICO).length,
      inAttesaRispostaUtente: activeTickets.filter((t) => t.status === TicketStatus.RISPOSTO).length,
      scadenzeOggiCount: scadenzeOggi.length,
      scadutiCount: scaduti.length,
      prioritaCriticaCount: activeTickets.filter((t) => t.priority === TicketPriority.CRITICA).length,
      prioritaAltaCount: activeTickets.filter((t) => t.priority === TicketPriority.ALTA).length,
      sollecitiPendentiCount: sollecitiPendenti.length,
    };

    return NextResponse.json({
      success: true,
      dataRiferimento: referenceDateStr,
      sogliaInattivitaGiorni: thresholdDays,
      statistiche: stats,
      scadenze_oggi: scadenzeOggi.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        targetCloseDate: t.targetCloseDate,
        contact: t.contact,
        operator: t.operator ? t.operator.name : 'Non Assegnato',
      })),
      scaduti: scaduti.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        targetCloseDate: t.targetCloseDate,
        contact: t.contact,
        operator: t.operator ? t.operator.name : 'Non Assegnato',
        giorniRitardo: Math.floor((now.getTime() - new Date(t.targetCloseDate!).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      priorita_critiche: prioritaCritiche.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        contact: t.contact,
        operator: t.operator ? t.operator.name : 'Non Assegnato',
        createdAt: t.createdAt,
      })),
      solleciti_pendenti: sollecitiPendenti,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/tickets/daily-summary GET] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Errore durante la generazione del daily summary: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
