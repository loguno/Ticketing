import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiAuth } from '@/lib/api-auth';
import { TicketPriority, TicketStatus } from '@prisma/client';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

const ACTIVE_STATUSES: TicketStatus[] = [
  TicketStatus.NUOVO,
  TicketStatus.IN_VALUTAZIONE,
  TicketStatus.IN_CARICO,
  TicketStatus.RISPOSTO,
  TicketStatus.SOSPESO,
];

export async function POST(request: Request) {
  const auth = validateApiAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json()) as ChatRequestBody;
    const userMessage = (body.message || '').trim();

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: 'Messaggio vuoto o non specificato.' },
        { status: 400 }
      );
    }

    // Process query through the AI Intelligence Context Engine
    const assistantResponse = await processAssistantQuery(userMessage, auth);

    return NextResponse.json({
      success: true,
      reply: assistantResponse.text,
      suggestedPrompts: assistantResponse.suggestedPrompts,
      metadata: assistantResponse.metadata,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API Assistant Chat POST] Errore:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Errore durante l'elaborazione della richiesta dell'assistente: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}

interface AssistantQueryResult {
  text: string;
  suggestedPrompts?: string[];
  metadata?: Record<string, unknown>;
}

async function processAssistantQuery(
  userQuery: string,
  auth: { userId?: string; userRole?: string; isService?: boolean }
): Promise<AssistantQueryResult> {
  const qLower = userQuery.toLowerCase().trim();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // RBAC: Standard user sees only own tickets
  const andConditions: import('@prisma/client').Prisma.TicketWhereInput[] = [
    { status: { in: ACTIVE_STATUSES } },
  ];

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

  // Fetch active tickets with relations
  const activeTickets = await db.ticket.findMany({
    where: { AND: andConditions },
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
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, createdAt: true, senderEmail: true },
      },
    },
  });

  // INTENT 1: Daily Agenda & Briefing / To-Do di Oggi
  const isDailyBriefing =
    qLower.includes('agenda') ||
    qLower.includes('to-do') ||
    qLower.includes('todo') ||
    qLower.includes('priorità del giorno') ||
    qLower.includes('priorita del giorno') ||
    qLower.includes('priorità di oggi') ||
    qLower.includes('cosa devo fare oggi') ||
    qLower.includes('briefing') ||
    qLower.includes('buongiorno') ||
    qLower.includes('sommario di oggi');

  if (isDailyBriefing) {
    return generateDailyBriefingResponse(activeTickets, now, startOfToday, endOfToday);
  }

  // INTENT 2: Solleciti Pendenti / "A chi devo rispondere oggi?"
  const isSollecitiOrWhoToReply =
    qLower.includes('a chi devo rispondere') ||
    qLower.includes('chi deve rispondere') ||
    qLower.includes('solleciti') ||
    qLower.includes('sollecito') ||
    qLower.includes('ticket fermi') ||
    qLower.includes('in attesa di risposta') ||
    qLower.includes('riscontro');

  if (isSollecitiOrWhoToReply) {
    return generateSollecitiResponse(activeTickets, now);
  }

  // INTENT 3: Richiesta su una persona o operatore specifico (es. "ticket di Marco", "situazione di Mario", "richieste di Anna")
  const personMatch = userQuery.match(/(?:ticket|situazione|pratiche|richieste|segnalazioni)\s+(?:di|per|assegnati\s+a)\s+([a-zA-Z0-9._-]+)/i);
  if (personMatch && personMatch[1]) {
    const targetName = personMatch[1].trim();
    const targetLower = targetName.toLowerCase();
    if (!['oggi', 'ieri', 'adesso', 'tutti', 'urgenza', 'helpdesk'].includes(targetLower)) {
      return generatePersonSpecificResponse(activeTickets, targetName);
    }
  }

  // INTENT 4: Scadenze ed Emergenze / Criticità
  const isScadenzeOrCritici =
    qLower.includes('scadenz') ||
    qLower.includes('scadut') ||
    qLower.includes('urgenti') ||
    qLower.includes('critici') ||
    qLower.includes('emergenz');

  if (isScadenzeOrCritici) {
    return generateScadenzeResponse(activeTickets, now, startOfToday, endOfToday);
  }

  // INTENT 5: Stato generale / Conteggi / Panoramica
  const isOverview =
    qLower.includes('quanti ticket') ||
    qLower.includes('panoramica') ||
    qLower.includes('stato generale') ||
    qLower.includes('situazione complessiva') ||
    qLower.includes('statistiche');

  if (isOverview) {
    return generateOverviewResponse(activeTickets);
  }

  // INTENT 6: Ricerca libera per parola chiave (es. "TMS", "WMS", "stampante", "barcode", ecc.)
  return generateContextualSearchResponse(userQuery, activeTickets);
}

interface TicketWithRelations {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  contact: string;
  targetCloseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator: { id: string; name: string; email: string } | null;
  operator: { id: string; name: string; email: string } | null;
  messages: { body: string; createdAt: Date; senderEmail: string }[];
}

/**
 * Genera il Daily Agenda & Briefing strutturato secondo le specifiche dello Step 2:
 * 1. Ticket in Scadenza / Urgenti (priorità alta o scadenza imminente).
 * 2. In Attesa di Risposta (chi deve rispondere e giorni di fermo).
 * 3. In Corso (attività aperte da gestire).
 */
function generateDailyBriefingResponse(
  activeTickets: TicketWithRelations[],
  now: Date,
  startOfToday: Date,
  endOfToday: Date
): AssistantQueryResult {
  // 1. Ticket in Scadenza / Urgenti
  const urgentTickets = activeTickets.filter((t) => {
    const isUrgentPriority = t.priority === TicketPriority.CRITICA || t.priority === TicketPriority.ALTA;
    const isDueTodayOrOverdue = t.targetCloseDate && new Date(t.targetCloseDate) <= endOfToday;
    return isUrgentPriority || isDueTodayOrOverdue;
  });

  // 2. In Attesa di Risposta
  const waitingResponseTickets = activeTickets
    .filter((t) => {
      const diffMs = now.getTime() - new Date(t.updatedAt).getTime();
      const giorniFermo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return t.status === TicketStatus.RISPOSTO || (t.status === TicketStatus.NUOVO && giorniFermo >= 1) || giorniFermo >= 2;
    })
    .map((t) => {
      const diffMs = now.getTime() - new Date(t.updatedAt).getTime();
      const giorniFermo = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const chiRisponde = t.status === TicketStatus.RISPOSTO ? 'Utente / Richiedente' : 'Helpdesk';
      return { ...t, giorniFermo, chiRisponde };
    })
    .sort((a, b) => b.giorniFermo - a.giorniFermo);

  // 3. In Corso (attività aperte da gestire)
  const inProgressTickets = activeTickets.filter(
    (t) => t.status === TicketStatus.IN_CARICO || t.status === TicketStatus.IN_VALUTAZIONE
  );

  let reply = `### 📋 Daily Agenda & Briefing Operativo\n`;
  reply += `Ecco il quadro delle priorità per la giornata odierna (${now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):\n\n`;

  // Sezione 1
  reply += `#### 🚨 1. Ticket in Scadenza / Urgenti (${urgentTickets.length})\n`;
  if (urgentTickets.length === 0) {
    reply += `*Nessun ticket critico o in scadenza immediata. Situazione sotto controllo.*\n\n`;
  } else {
    urgentTickets.slice(0, 5).forEach((t) => {
      const scadenzaTxt = t.targetCloseDate
        ? new Date(t.targetCloseDate) < now
          ? `⚠️ **Scaduto il ${new Date(t.targetCloseDate).toLocaleDateString('it-IT')}**`
          : `📅 Scadenza: ${new Date(t.targetCloseDate).toLocaleDateString('it-IT')}`
        : 'Senza data scadenza prefissata';
      reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
      reply += `  • **Priorità:** \`${t.priority}\` | **Stato:** \`${t.status}\` | ${scadenzaTxt}\n`;
      reply += `  • **Richiedente:** ${t.contact} | **Operatore:** ${t.operator ? t.operator.name : 'Non assegnato'}\n`;
    });
    if (urgentTickets.length > 5) {
      reply += `  *...e altri ${urgentTickets.length - 5} ticket urgenti.*\n`;
    }
    reply += `\n`;
  }

  // Sezione 2
  reply += `#### ⏳ 2. In Attesa di Risposta (${waitingResponseTickets.length})\n`;
  if (waitingResponseTickets.length === 0) {
    reply += `*Nessun ticket bloccato in attesa di riscontro.*\n\n`;
  } else {
    waitingResponseTickets.slice(0, 5).forEach((t) => {
      reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
      reply += `  • **Chi deve rispondere:** **${t.chiRisponde}** (fermo da **${t.giorniFermo} giorni**)\n`;
      reply += `  • **Stato:** \`${t.status}\` | **Contatto:** ${t.contact}\n`;
    });
    if (waitingResponseTickets.length > 5) {
      reply += `  *...e altri ${waitingResponseTickets.length - 5} ticket pendenti.*\n`;
    }
    reply += `\n`;
  }

  // Sezione 3
  reply += `#### 🛠️ 3. In Corso / Da Lavorare (${inProgressTickets.length})\n`;
  if (inProgressTickets.length === 0) {
    reply += `*Nessuna attività attualmente in lavorazione attiva.*\n\n`;
  } else {
    inProgressTickets.slice(0, 5).forEach((t) => {
      reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
      reply += `  • **Assegnato a:** ${t.operator ? t.operator.name : 'Non Assegnato'} | **Categoria:** \`${t.category}\`\n`;
    });
    if (inProgressTickets.length > 5) {
      reply += `  *...e altri ${inProgressTickets.length - 5} ticket in corso.*\n`;
    }
    reply += `\n`;
  }

  reply += `💡 *Puoi chiedermi dettagli su qualunque ticket digitandone il codice (es. "[${activeTickets[0]?.ticketNumber || 'TKT-2026-00001'}]") o il nome del richiedente.*`;

  return {
    text: reply,
    suggestedPrompts: [
      'A chi devo rispondere oggi?',
      'Mostra i ticket più urgenti',
      'Quali ticket sono da assegnare?',
    ],
    metadata: {
      urgentCount: urgentTickets.length,
      waitingCount: waitingResponseTickets.length,
      inProgressCount: inProgressTickets.length,
    },
  };
}

/**
 * Risponde a "A chi devo rispondere oggi?" e gestisce i solleciti pendenti
 */
function generateSollecitiResponse(activeTickets: TicketWithRelations[], now: Date): AssistantQueryResult {
  const helpdeskPendingStatuses: TicketStatus[] = [
    TicketStatus.NUOVO,
    TicketStatus.IN_VALUTAZIONE,
    TicketStatus.IN_CARICO,
  ];

  const pendingHelpdesk = activeTickets
    .filter((t) => helpdeskPendingStatuses.includes(t.status))
    .map((t) => {
      const diffMs = now.getTime() - new Date(t.updatedAt).getTime();
      const giorniFermo = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return { ...t, giorniFermo };
    })
    .sort((a, b) => b.giorniFermo - a.giorniFermo);

  const pendingUser = activeTickets
    .filter((t) => t.status === TicketStatus.RISPOSTO)
    .map((t) => {
      const diffMs = now.getTime() - new Date(t.updatedAt).getTime();
      const giorniFermo = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return { ...t, giorniFermo };
    })
    .sort((a, b) => b.giorniFermo - a.giorniFermo);

  let reply = `### 🎯 Situazione Riscontri e Solleciti\n\n`;

  reply += `#### 🏢 1. Spetta a Te / Helpdesk (${pendingHelpdesk.length} ticket)\n`;
  reply += `Questi ticket richiedono un tuo intervento o una risposta all'utente:\n`;
  if (pendingHelpdesk.length === 0) {
    reply += `*Tutti i ticket dell'helpdesk sono aggiornati!*\n\n`;
  } else {
    pendingHelpdesk.slice(0, 5).forEach((t) => {
      reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
      reply += `  • Fermo da: **${t.giorniFermo} giorni** | Richiedente: ${t.contact} | Priorità: \`${t.priority}\`\n`;
    });
    reply += `\n`;
  }

  reply += `#### 👤 2. In Attesa di Risposta dall'Utente (${pendingUser.length} ticket)\n`;
  reply += `L'Helpdesk ha già risposto; stiamo attendendo un riscontro dal cliente/utente:\n`;
  if (pendingUser.length === 0) {
    reply += `*Nessun ticket in attesa di riscontro dall'utente.*\n\n`;
  } else {
    pendingUser.slice(0, 5).forEach((t) => {
      const sollecitoConsigliato = t.giorniFermo >= 3 ? '⚠️ **Sollecito consigliato**' : 'In attesa regolare';
      reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
      reply += `  • Utente: ${t.contact} | In attesa da: **${t.giorniFermo} giorni** (${sollecitoConsigliato})\n`;
    });
    reply += `\n`;
  }

  return {
    text: reply,
    suggestedPrompts: [
      'Genera To-Do di Oggi',
      'Mostra solo ticket critici',
      'Quali ticket sono scaduti?',
    ],
  };
}

/**
 * Risponde a domande su una persona/utente specifica (es. "Situazione di Marco")
 */
function generatePersonSpecificResponse(
  activeTickets: TicketWithRelations[],
  targetName: string
): AssistantQueryResult {
  const matchingTickets = activeTickets.filter((t) => {
    const contactMatch = t.contact.toLowerCase().includes(targetName.toLowerCase());
    const creatorNameMatch = t.creator?.name?.toLowerCase().includes(targetName.toLowerCase());
    const creatorEmailMatch = t.creator?.email?.toLowerCase().includes(targetName.toLowerCase());
    const operatorNameMatch = t.operator?.name?.toLowerCase().includes(targetName.toLowerCase());
    const operatorEmailMatch = t.operator?.email?.toLowerCase().includes(targetName.toLowerCase());
    return contactMatch || creatorNameMatch || creatorEmailMatch || operatorNameMatch || operatorEmailMatch;
  });

  let reply = `### 👤 Situazione Ticket per "${targetName}"\n`;

  if (matchingTickets.length === 0) {
    reply += `Non ho trovato ticket aperti direttamente associati a **"${targetName}"** tra i richiedenti o gli operatori assegnatari.\n\n`;
    reply += `*Suggerimento:* Puoi provare a specificare l'indirizzo email completo o il cognome.`;
    return {
      text: reply,
      suggestedPrompts: ['Genera To-Do di Oggi', 'Mostra tutti i ticket aperti'],
    };
  }

  reply += `Trovati **${matchingTickets.length} ticket attivi** collegati a questa ricerca:\n\n`;

  matchingTickets.forEach((t) => {
    const isOperator =
      t.operator?.name?.toLowerCase().includes(targetName.toLowerCase()) ||
      t.operator?.email?.toLowerCase().includes(targetName.toLowerCase());

    const ruolo = isOperator ? 'Operatore Assegnatario' : 'Richiedente / Contatto';
    const scadenzaTxt = t.targetCloseDate
      ? ` | Scadenza: ${new Date(t.targetCloseDate).toLocaleDateString('it-IT')}`
      : '';

    reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
    reply += `  • Ruolo trovato: *${ruolo}*\n`;
    reply += `  • Stato: \`${t.status}\` | Priorità: \`${t.priority}\`${scadenzaTxt}\n`;
    reply += `  • Contatto: ${t.contact} | Operatore: ${t.operator ? t.operator.name : 'Non assegnato'}\n\n`;
  });

  return {
    text: reply,
    suggestedPrompts: [
      'A chi devo rispondere oggi?',
      'Genera To-Do di Oggi',
      'Mostra solleciti pendenti',
    ],
  };
}

/**
 * Risponde a richieste su scadenze ed emergenze
 */
function generateScadenzeResponse(
  activeTickets: TicketWithRelations[],
  now: Date,
  startOfToday: Date,
  endOfToday: Date
): AssistantQueryResult {
  const scaduti = activeTickets.filter((t) => t.targetCloseDate && new Date(t.targetCloseDate) < startOfToday);
  const inScadenzaOggi = activeTickets.filter(
    (t) => t.targetCloseDate && new Date(t.targetCloseDate) >= startOfToday && new Date(t.targetCloseDate) <= endOfToday
  );
  const critici = activeTickets.filter((t) => t.priority === TicketPriority.CRITICA);
  const alti = activeTickets.filter((t) => t.priority === TicketPriority.ALTA);

  let reply = `### ⏰ Monitor Scadenze & Priorità Critiche\n\n`;

  if (scaduti.length > 0) {
    reply += `#### 🚨 Ticket Già Scaduti (${scaduti.length})\n`;
    scaduti.forEach((t) => {
      const giorniRitardo = Math.floor((now.getTime() - new Date(t.targetCloseDate!).getTime()) / (1000 * 60 * 60 * 24));
      reply += `- **[${t.ticketNumber}]** ${t.title} — Ritardo di **${giorniRitardo} giorni** (Scadenza: ${new Date(t.targetCloseDate!).toLocaleDateString('it-IT')})\n`;
    });
    reply += `\n`;
  }

  reply += `#### 📅 In Scadenza Oggi (${inScadenzaOggi.length})\n`;
  if (inScadenzaOggi.length === 0) {
    reply += `*Nessun ticket con scadenza fissata per la giornata odierna.*\n\n`;
  } else {
    inScadenzaOggi.forEach((t) => {
      reply += `- **[${t.ticketNumber}]** ${t.title} | Priorità: \`${t.priority}\` | Assegnato a: ${t.operator ? t.operator.name : 'Nessuno'}\n`;
    });
    reply += `\n`;
  }

  reply += `#### ⚡ Ticket con Priorità Critica/Alta (${critici.length + alti.length})\n`;
  const highPriority = [...critici, ...alti];
  if (highPriority.length === 0) {
    reply += `*Nessun ticket in stato di emergenza critica.*\n\n`;
  } else {
    highPriority.slice(0, 5).forEach((t) => {
      reply += `- **[${t.ticketNumber}]** (\`${t.priority}\`) ${t.title} [${t.status}]\n`;
    });
    reply += `\n`;
  }

  return {
    text: reply,
    suggestedPrompts: [
      'Genera To-Do di Oggi',
      'A chi devo rispondere oggi?',
      'Quali ticket sono da assegnare?',
    ],
  };
}

/**
 * Risponde con panoramica e statistiche complessive
 */
function generateOverviewResponse(activeTickets: TicketWithRelations[]): AssistantQueryResult {
  const nuovi = activeTickets.filter((t) => t.status === TicketStatus.NUOVO).length;
  const inCarico = activeTickets.filter((t) => t.status === TicketStatus.IN_CARICO).length;
  const risposto = activeTickets.filter((t) => t.status === TicketStatus.RISPOSTO).length;
  const critici = activeTickets.filter((t) => t.priority === TicketPriority.CRITICA).length;
  const alti = activeTickets.filter((t) => t.priority === TicketPriority.ALTA).length;

  let reply = `### 📊 Panoramica del Sistema Ticket\n\n`;
  reply += `Attualmente ci sono **${activeTickets.length} ticket aperti** nel sistema:\n\n`;
  reply += `- 📥 **Nuovi da valutare (Triage):** ${nuovi}\n`;
  reply += `- ⚙️ **In carico (Lavorazione attiva):** ${inCarico}\n`;
  reply += `- 💬 **In attesa risposta utente:** ${risposto}\n`;
  reply += `- 🔥 **Priorità Critica:** ${critici}\n`;
  reply += `- ⚠️ **Priorità Alta:** ${alti}\n\n`;
  reply += `Vuoi che prepari l'agenda operativa o filtri per un operatore specifico?`;

  return {
    text: reply,
    suggestedPrompts: [
      'Genera To-Do di Oggi',
      'Mostra Solleciti Pendenti',
      'Ticket in scadenza oggi',
    ],
  };
}

/**
 * Ricerca contestuale libera per parole chiave
 */
function generateContextualSearchResponse(
  query: string,
  activeTickets: TicketWithRelations[]
): AssistantQueryResult {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const matched = activeTickets.filter((t) => {
    const hay = `${t.ticketNumber} ${t.title} ${t.description} ${t.category} ${t.contact} ${t.operator?.name || ''}`.toLowerCase();
    return terms.some((term) => hay.includes(term));
  });

  if (matched.length === 0) {
    let reply = `Non ho trovato ticket specifici corrispondenti a: "*${query}*".\n\n`;
    reply += `Puoi chiedermi ad esempio:\n`;
    reply += `- *"Genera To-Do di Oggi"*\n`;
    reply += `- *"A chi devo rispondere oggi?"*\n`;
    reply += `- *"Dimmi la situazione dei ticket di [Nome]"*\n`;
    reply += `- *"Mostra i ticket con priorità alta"*\n`;

    return {
      text: reply,
      suggestedPrompts: [
        'Genera To-Do di Oggi',
        'A chi devo rispondere oggi?',
        'Panoramica ticket',
      ],
    };
  }

  let reply = `### 🔍 Risultati Ricerca ("${query}")\n`;
  reply += `Ho individuato **${matched.length} ticket** corrispondenti:\n\n`;

  matched.slice(0, 5).forEach((t) => {
    reply += `- **[${t.ticketNumber}]** ${t.title}\n`;
    reply += `  • **Stato:** \`${t.status}\` | **Priorità:** \`${t.priority}\` | **Categoria:** \`${t.category}\`\n`;
    reply += `  • **Contatto:** ${t.contact} | **Operatore:** ${t.operator ? t.operator.name : 'Non Assegnato'}\n\n`;
  });

  if (matched.length > 5) {
    reply += `*...altri ${matched.length - 5} ticket trovati.*\n`;
  }

  return {
    text: reply,
    suggestedPrompts: [
      'Genera To-Do di Oggi',
      'A chi devo rispondere oggi?',
    ],
  };
}
