import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runReportSchedule } from '@/lib/startup-scheduler';

// POST /api/admin/schedules/[id]/test — Trigger immediate test run (ADMIN only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRole = request.headers.get('x-user-role');
  const { id } = await params;

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const existing = await db.reportSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedulazione non trovata.' }, { status: 404 });
    }

    // Run schedule execution immediately in test mode (isTest = true)
    const success = await runReportSchedule(id, true);

    if (success) {
      return NextResponse.json({ success: true, message: 'Report di test inviato con successo.' });
    } else {
      return NextResponse.json({ error: "Errore durante l'invio del report di test. Controlla lo storico dei log." }, { status: 500 });
    }
  } catch (error) {
    console.error('[API Schedules Test POST]', error);
    return NextResponse.json({ error: "Errore interno del server durante il test dell'invio." }, { status: 500 });
  }
}
