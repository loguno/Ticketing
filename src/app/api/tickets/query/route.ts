import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiAuth } from '@/lib/api-auth';
import { TicketPriority, TicketStatus, Prisma } from '@prisma/client';

const ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.NUOVO,
  TicketStatus.IN_VALUTAZIONE,
  TicketStatus.IN_CARICO,
  TicketStatus.RISPOSTO,
  TicketStatus.SOSPESO,
];

const CLOSED_STATUSES: TicketStatus[] = [
  TicketStatus.RISOLTO,
  TicketStatus.CHIUSO,
  TicketStatus.NON_RISOLVIBILE,
  TicketStatus.ANNULLATO,
];

interface TicketQueryFilters {
  status?: unknown;
  stato?: unknown;
  priority?: unknown;
  priorita?: unknown;
  urgenza?: unknown;
  assignee?: unknown;
  assegnatario?: unknown;
  operatorId?: unknown;
  operatore?: unknown;
  pendingResponse?: unknown;
  riscontro_pendente?: unknown;
  riscontro?: unknown;
  overdue?: unknown;
  scaduti?: unknown;
  dueToday?: unknown;
  scadenza_oggi?: unknown;
  deadlineBefore?: unknown;
  scadenza_entro?: unknown;
  deadlineAfter?: unknown;
  scadenza_dopo?: unknown;
  date?: unknown;
  data_scadenza?: unknown;
  applicant?: unknown;
  richiedente?: unknown;
  contatto?: unknown;
  search?: unknown;
  q?: unknown;
  ricerca?: unknown;
  limit?: unknown;
  offset?: unknown;
  orderBy?: unknown;
  orderDirection?: unknown;
  [key: string]: unknown;
}

export async function GET(request: Request) {
  const auth = validateApiAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const params: TicketQueryFilters = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return executeTicketQuery(params, auth);
}

export async function POST(request: Request) {
  const auth = validateApiAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as TicketQueryFilters;
    return executeTicketQuery(body, auth);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Payload non valido: ${errorMsg}` },
      { status: 400 }
    );
  }
}

async function executeTicketQuery(
  filters: TicketQueryFilters,
  auth: { userId?: string; userRole?: string; isService?: boolean }
) {
  try {
    const andConditions: Prisma.TicketWhereInput[] = [];

    // RBAC: Standard user restriction
    if (auth.userRole === 'STANDARD' && auth.userId && !auth.isService) {
      const user = await db.user.findUnique({
        where: { id: auth.userId },
        select: { email: true },
      });

      andConditions.push({
        OR: [
          { creatorId: auth.userId },
          { contact: user?.email || '' },
        ],
      });
    }

    // 1. Status Filter
    const rawStatus = filters.status || filters.stato;
    if (rawStatus) {
      if (Array.isArray(rawStatus)) {
        andConditions.push({ status: { in: rawStatus as TicketStatus[] } });
      } else {
        const s = String(rawStatus).toUpperCase().trim();
        if (s === 'APERTI' || s === 'OPEN') {
          andConditions.push({ status: { in: ACTIVE_STATUSES } });
        } else if (s === 'CHIUSI' || s === 'CLOSED') {
          andConditions.push({ status: { in: CLOSED_STATUSES } });
        } else if (s.includes(',')) {
          const list = s.split(',').map((item) => item.trim() as TicketStatus);
          andConditions.push({ status: { in: list } });
        } else if (Object.values(TicketStatus).includes(s as TicketStatus)) {
          andConditions.push({ status: s as TicketStatus });
        }
      }
    }

    // 2. Priority Filter
    const rawPriority = filters.priority || filters.priorita || filters.urgenza;
    if (rawPriority) {
      if (Array.isArray(rawPriority)) {
        andConditions.push({ priority: { in: rawPriority as TicketPriority[] } });
      } else {
        const p = String(rawPriority).toUpperCase().trim();
        if (p === 'URGENTI' || p === 'URGENT' || p === 'CRITICI') {
          andConditions.push({ priority: { in: [TicketPriority.ALTA, TicketPriority.CRITICA] } });
        } else if (p.includes(',')) {
          const list = p.split(',').map((item) => item.trim() as TicketPriority);
          andConditions.push({ priority: { in: list } });
        } else if (Object.values(TicketPriority).includes(p as TicketPriority)) {
          andConditions.push({ priority: p as TicketPriority });
        }
      }
    }

    // 3. Assignee / Operator Filter
    const rawAssignee = filters.assignee || filters.assegnatario || filters.operatorId || filters.operatore;
    if (rawAssignee) {
      const a = String(rawAssignee).trim();
      const aUpper = a.toUpperCase();
      if (aUpper === 'UNASSIGNED' || aUpper === 'NON_ASSEGNATO' || aUpper === 'NESSUNO') {
        andConditions.push({ operatorId: null });
      } else if (aUpper === 'ASSIGNED' || aUpper === 'ASSEGNATO') {
        andConditions.push({ operatorId: { not: null } });
      } else {
        // Can be operatorId, email, or name
        andConditions.push({
          OR: [
            { operatorId: a },
            { operator: { email: { contains: a } } },
            { operator: { name: { contains: a } } },
          ],
        });
      }
    }

    // 4. Pending Response Filter
    const rawPending = filters.pendingResponse || filters.riscontro_pendente || filters.riscontro;
    if (rawPending) {
      const pr = String(rawPending).toUpperCase().trim();
      if (pr === '1' || pr === 'ME' || pr === 'SPETTA_A_ME' || pr === 'HELPDESK') {
        andConditions.push({
          status: { in: [TicketStatus.NUOVO, TicketStatus.IN_VALUTAZIONE, TicketStatus.IN_CARICO] },
        });
      } else if (pr === '2' || pr === 'THEM' || pr === 'ATTESA_UTENTE' || pr === 'ATTESA_RISPOSTA' || pr === 'USER') {
        andConditions.push({ status: TicketStatus.RISPOSTO });
      } else if (pr === '0' || pr === 'NONE' || pr === 'NESSUNO') {
        andConditions.push({
          status: { notIn: [TicketStatus.NUOVO, TicketStatus.IN_VALUTAZIONE, TicketStatus.IN_CARICO, TicketStatus.RISPOSTO] },
        });
      }
    }

    // 5. Deadline Filter
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isOverdue = filters.overdue === true || filters.overdue === 'true' || filters.scaduti === true || filters.scaduti === 'true';
    const isDueToday = filters.dueToday === true || filters.dueToday === 'true' || filters.scadenza_oggi === true || filters.scadenza_oggi === 'true';

    if (isOverdue) {
      andConditions.push({
        targetCloseDate: { lt: now },
        status: { in: ACTIVE_STATUSES },
      });
    }

    if (isDueToday) {
      andConditions.push({
        targetCloseDate: { gte: startOfToday, lte: endOfToday },
        status: { in: ACTIVE_STATUSES },
      });
    }

    const deadlineBefore = filters.deadlineBefore || filters.scadenza_entro;
    if (deadlineBefore) {
      const d = new Date(String(deadlineBefore));
      if (!isNaN(d.getTime())) {
        andConditions.push({ targetCloseDate: { lte: d } });
      }
    }

    const deadlineAfter = filters.deadlineAfter || filters.scadenza_dopo;
    if (deadlineAfter) {
      const d = new Date(String(deadlineAfter));
      if (!isNaN(d.getTime())) {
        andConditions.push({ targetCloseDate: { gte: d } });
      }
    }

    const exactDate = filters.date || filters.data_scadenza;
    if (exactDate) {
      const target = new Date(String(exactDate));
      if (!isNaN(target.getTime())) {
        const startDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0);
        const endDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
        andConditions.push({ targetCloseDate: { gte: startDay, lte: endDay } });
      }
    }

    // 6. Applicant Filter
    const rawApplicant = filters.applicant || filters.richiedente || filters.contatto;
    if (rawApplicant) {
      const app = String(rawApplicant).trim();
      andConditions.push({
        OR: [
          { contact: { contains: app } },
          { creator: { name: { contains: app } } },
          { creator: { email: { contains: app } } },
        ],
      });
    }

    // 7. General Free Text Search
    const rawSearch = filters.search || filters.q || filters.ricerca;
    if (rawSearch) {
      const query = String(rawSearch).trim();
      andConditions.push({
        OR: [
          { ticketNumber: { contains: query } },
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      });
    }

    const where: Prisma.TicketWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    // Pagination
    const limit = Math.min(Math.max(parseInt(String(filters.limit || '50'), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(filters.offset || '0'), 10) || 0, 0);

    // Sorting
    const orderByField = typeof filters.orderBy === 'string' ? filters.orderBy : 'createdAt';
    const orderDirection = String(filters.orderDirection || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const validOrderFields = ['createdAt', 'updatedAt', 'targetCloseDate', 'priority', 'status', 'ticketNumber'];
    const safeOrderField = validOrderFields.includes(orderByField) ? orderByField : 'createdAt';

    const [total, tickets] = await Promise.all([
      db.ticket.count({ where }),
      db.ticket.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [safeOrderField]: orderDirection },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          operator: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { messages: true, attachments: true },
          },
        },
      }),
    ]);

    // Format output with business intelligence indicators
    const formattedTickets = tickets.map((t) => {
      let riscontro = 'NESSUNO';
      const helpdeskPendingStatuses: TicketStatus[] = [
        TicketStatus.NUOVO,
        TicketStatus.IN_VALUTAZIONE,
        TicketStatus.IN_CARICO,
      ];
      if (helpdeskPendingStatuses.includes(t.status)) {
        riscontro = 'SPETTA_A_ME';
      } else if (t.status === TicketStatus.RISPOSTO) {
        riscontro = 'ATTESA_UTENTE';
      }

      const diffMs = now.getTime() - new Date(t.createdAt).getTime();
      const giorniAperto = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isScaduto = t.targetCloseDate ? new Date(t.targetCloseDate).getTime() < now.getTime() && ACTIVE_STATUSES.includes(t.status) : false;

      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        category: t.category,
        origin: t.origin,
        contact: t.contact,
        targetCloseDate: t.targetCloseDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        creator: t.creator,
        operator: t.operator,
        conteggioMessaggi: t._count.messages,
        conteggioAllegati: t._count.attachments,
        riscontroPendente: riscontro,
        giorniAperto,
        isScaduto,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedTickets.length,
      total,
      limit,
      offset,
      tickets: formattedTickets,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API /api/tickets/query] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Errore durante l'esecuzione della ricerca ticket: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
