import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export interface ParsedTicketFields {
  titolo: string;
  descrizione: string;
  richiedente: string;
  priorita: TicketPriority;
  scadenza: string | null;
  stato: TicketStatus;
  categoria: TicketCategory;
}

export interface TelegramAuthorInfo {
  first_name?: string;
  last_name?: string;
  username?: string;
  id?: number | string;
}

/**
 * Analizza ed estrae campi strutturati da un testo trascritto (o messaggio scritto) in lingua italiana.
 */
export function parseTicketFromText(
  rawText: string,
  author?: TelegramAuthorInfo
): ParsedTicketFields {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // 1. Estrazione Richiedente
  let richiedente = '';
  // Cerca pattern tipo: "sono Mario Rossi", "mi chiamo Mario Rossi", "qui parla Mario Rossi"
  const selfIntroMatch = text.match(/(?:sono|mi chiamo|qui parla|parla|da parte di)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (selfIntroMatch && selfIntroMatch[1]) {
    richiedente = selfIntroMatch[1].trim();
  } else if (author) {
    const fullName = [author.first_name, author.last_name].filter(Boolean).join(' ').trim();
    if (fullName) {
      richiedente = author.username ? `${fullName} (@${author.username})` : fullName;
    } else if (author.username) {
      richiedente = `@${author.username}`;
    }
  }

  if (!richiedente) {
    richiedente = 'Operatore Telegram';
  }

  // 2. Estrazione Priorità
  let priorita: TicketPriority = TicketPriority.BASSA;
  if (
    lower.includes('critico') ||
    lower.includes('critica') ||
    lower.includes('bloccante') ||
    lower.includes('fermo impianto') ||
    lower.includes('emergenza') ||
    lower.includes('gravissimo')
  ) {
    priorita = TicketPriority.CRITICA;
  } else if (
    lower.includes('urgente') ||
    lower.includes('urgenza') ||
    lower.includes('alta') ||
    lower.includes('subito') ||
    lower.includes('tempestivo') ||
    lower.includes('presto')
  ) {
    priorita = TicketPriority.ALTA;
  } else if (lower.includes('media') || lower.includes('moderata') || lower.includes('standard')) {
    priorita = TicketPriority.MEDIA;
  }

  // 3. Estrazione Categoria
  let categoria: TicketCategory = TicketCategory.ALTRO;
  if (
    lower.includes('wms') ||
    lower.includes('magazzino') ||
    lower.includes('pallet') ||
    lower.includes('corsia') ||
    lower.includes('scaffale') ||
    lower.includes('rulliera') ||
    lower.includes('carrello') ||
    lower.includes('ubicazione')
  ) {
    categoria = TicketCategory.WMS;
  } else if (
    lower.includes('tms') ||
    lower.includes('trasport') ||
    lower.includes('viaggio') ||
    lower.includes('autista') ||
    lower.includes('camion') ||
    lower.includes('bilico') ||
    lower.includes('spedizione') ||
    lower.includes('ddt')
  ) {
    categoria = TicketCategory.TMS;
  } else if (
    lower.includes('amministrativ') ||
    lower.includes('fattur') ||
    lower.includes('contabil') ||
    lower.includes('pagament')
  ) {
    categoria = TicketCategory.AMMINISTRATIVO;
  }

  // 4. Estrazione Scadenza Presunta (targetCloseDate)
  let scadenza: string | null = null;
  const now = new Date();

  if (lower.includes('entro oggi') || lower.includes('entro stasera') || lower.includes('per oggi')) {
    const todayTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
    scadenza = todayTarget.toISOString();
  } else if (lower.includes('entro domani') || lower.includes('per domani') || lower.includes('domani')) {
    const tomorrowTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0, 0);
    scadenza = tomorrowTarget.toISOString();
  } else if (lower.includes('entro fine settimana') || lower.includes('entro venerdì') || lower.includes('entro venerdi')) {
    // Calcola il prossimo venerdì
    const dayOfWeek = now.getDay(); // 0 is Sun, 5 is Fri
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const fridayTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday, 18, 0, 0);
    scadenza = fridayTarget.toISOString();
  } else {
    // Cerca orario specifico es. "entro le 17" o "entro le 17:30" o "entro le ore 18"
    const hourMatch = text.match(/entro\s+(?:le\s+)?(?:ore\s+)?(\d{1,2})(?::(\d{2}))?/i);
    if (hourMatch && hourMatch[1]) {
      const hour = parseInt(hourMatch[1], 10);
      const minute = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
      if (hour >= 0 && hour <= 23) {
        const targetHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        // Se l'orario è già passato oggi, intendiamo domani
        if (targetHour.getTime() < now.getTime()) {
          targetHour.setDate(targetHour.getDate() + 1);
        }
        scadenza = targetHour.toISOString();
      }
    }
  }

  // 5. Sintesi Titolo (Conciso, chiaro, informativo)
  // 5. Sintesi Titolo (Conciso, chiaro, informativo)
  let titolo = '';
  const sentences = text
    .split(/[.\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let candidateSentence = '';
  for (const s of sentences) {
    // Salta frasi che contengono solo saluti o autopresentazioni (es. "Buongiorno, sono Paolo Verdi")
    const isPureGreeting = /^(?:ciao|buongiorno|buonasera|salve|saluti)?\s*,?\s*(?:sono|mi chiamo|qui parla|parla)?\s*[a-zA-Z\s]*$/i.test(s);
    if (!isPureGreeting && s.length > 5) {
      candidateSentence = s;
      break;
    }
  }

  if (!candidateSentence) {
    candidateSentence = sentences[0] || text;
  }

  // Rimuovi prefissi verbali comuni ("segnalo che", "segnalo un", "segnalazione vocale:", ecc.)
  const cleanTitle = candidateSentence
    .replace(/^(?:segnalazione vocale:?\s*|segnalo che\s+|segnalo un\s+|segnalo una\s+|segnalo\s+|vorrei segnalare\s+|richiesta di intervento per\s+|si richiede\s+|c'è un problema di\s+|riscontrato\s+|riscontrata\s+)/i, '')
    .trim();

  if (cleanTitle.length > 5 && cleanTitle.length <= 70) {
    titolo = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  } else if (cleanTitle.length > 70) {
    titolo = cleanTitle.slice(0, 67).trim() + '...';
  } else {
    titolo = `Segnalazione ${categoria !== 'ALTRO' ? categoria : 'Ticket'} da Telegram`;
  }

  return {
    titolo,
    descrizione: text,
    richiedente,
    priorita,
    scadenza,
    stato: TicketStatus.NUOVO,
    categoria,
  };
}
