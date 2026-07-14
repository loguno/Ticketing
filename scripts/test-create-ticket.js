/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found to associate with ticket');
      return;
    }
    console.log('Found user:', user.email);
    
    // Test generateTicketNumber logic
    const currentYear = new Date().getFullYear();
    const yearPrefix = `TKT-${currentYear}-`;
    const latestTicket = await prisma.ticket.findFirst({
      where: { ticketNumber: { startsWith: yearPrefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true }
    });
    console.log('Latest ticket:', latestTicket);
    
    let nextSequence = 1;
    if (latestTicket) {
      const sequencePart = latestTicket.ticketNumber.replace(yearPrefix, '');
      const currentSequence = parseInt(sequencePart, 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
    const ticketNumber = `${yearPrefix}${String(nextSequence).padStart(5, '0')}`;
    console.log('Generated ticket number:', ticketNumber);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: 'test ticket',
        description: 'test description',
        category: 'ALTRO',
        contact: user.email,
        creatorId: user.id
      }
    });
    console.log('Success! Created ticket:', ticket);
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
