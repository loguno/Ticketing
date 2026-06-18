import { db } from './db';

/**
 * Generates the next sequential ticket number in the format TKT-YYYY-XXXXX
 * (e.g. TKT-2026-00001) by looking up the latest ticket in the current calendar year.
 */
export async function generateTicketNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `TKT-${currentYear}-`;

  // Search for the latest ticket created this year
  const latestTicket = await db.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      ticketNumber: 'desc',
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestTicket) {
    // Extract the sequence number
    const sequencePart = latestTicket.ticketNumber.replace(yearPrefix, '');
    const currentSequence = parseInt(sequencePart, 10);
    if (!isNaN(currentSequence)) {
      nextSequence = currentSequence + 1;
    }
  }

  // Format as TKT-YYYY-XXXXX (padded to 5 digits)
  const paddedSequence = String(nextSequence).padStart(5, '0');
  return `${yearPrefix}${paddedSequence}`;
}
