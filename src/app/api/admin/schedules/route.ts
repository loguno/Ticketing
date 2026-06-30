import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateNextRun } from '@/lib/startup-scheduler';

// GET /api/admin/schedules — Get all schedules & logs (ADMIN only)
export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const schedules = await db.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { logs: true },
        },
      },
    });

    const logs = await db.reportLog.findMany({
      take: 50,
      orderBy: { sentAt: 'desc' },
      include: {
        schedule: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ schedules, logs });
  } catch (error) {
    console.error('[API Schedules GET]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}

// POST /api/admin/schedules — Create new report schedule (ADMIN only)
export async function POST(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, emails, startDate, frequency, freqDetails, boardTypes, clientProject } = body;

    if (!name || !emails || !startDate || !frequency || !boardTypes || !clientProject) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti.' }, { status: 400 });
    }

    const startDateTime = new Date(startDate);
    const nextRun = calculateNextRun(startDateTime, frequency, freqDetails ? JSON.stringify(freqDetails) : null, new Date());

    const schedule = await db.reportSchedule.create({
      data: {
        name,
        emails,
        startDate: startDateTime,
        frequency,
        freqDetails: freqDetails ? JSON.stringify(freqDetails) : null,
        boardTypes,
        clientProject,
        nextRun,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('[API Schedules POST]', error);
    return NextResponse.json({ error: 'Errore durante la creazione della schedulazione.' }, { status: 500 });
  }
}
