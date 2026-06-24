import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStartupEmail } from '@/lib/smtp';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { subId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato. Permessi insufficienti.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, responsibleId, status, progressNotes } = body;

    const existing = await db.startupSubactivity.findUnique({
      where: { id: subId },
      include: {
        startupActivity: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Sotto-attività non trovata.' },
        { status: 404 }
      );
    }

    // Determine completion date
    let completedAt: Date | null | undefined = undefined;
    if (status) {
      if (status === 'COMPLETATA' && existing.status !== 'COMPLETATA') {
        completedAt = new Date();
      } else if (status !== 'COMPLETATA' && existing.status === 'COMPLETATA') {
        completedAt = null;
      }
    }

    const updated = await db.startupSubactivity.update({
      where: { id: subId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        responsibleId: responsibleId !== undefined ? responsibleId : undefined,
        status: status !== undefined ? status : undefined,
        progressNotes: progressNotes !== undefined ? progressNotes : undefined,
        completedAt,
      },
      include: {
        responsible: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify PM if status changed
    if (status && existing.status !== status) {
      try {
        const emailSetting = await db.systemSetting.findUnique({
          where: { key: 'startup_report_email' },
        });
        const targetEmail = emailSetting?.value || 'pm@azienda.it';

        const statusLabels: Record<string, string> = {
          DA_FARE: 'Da Fare',
          IN_CORSO: 'In Corso',
          COMPLETATA: 'Completata',
        };

        const updater = await db.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        sendStartupEmail({
          to: targetEmail,
          subject: `[STARTUP-SUBACTIVITY] Avanzamento Sotto-attività: ${updated.title}`,
          bodyText: `La sotto-attività "${updated.title}" del progetto "${existing.startupActivity.title}" è stata aggiornata da ${updater?.name || 'Sistema'}.

DETTAGLI AVANZAMENTO:
------------------------------------------
Macro-attività: ${existing.startupActivity.title}
Cliente/Progetto: ${existing.startupActivity.clientProject || 'Non definito'}

Sotto-attività: ${updated.title}
Vecchio Stato: ${statusLabels[existing.status] || existing.status}
Nuovo Stato: ${statusLabels[updated.status] || updated.status}
Responsabile: ${updated.responsible?.name || 'Non assegnato'}
Note di avanzamento: ${progressNotes || 'Nessuna nota aggiuntiva'}
`,
          bodyHtml: `
            <p>La sotto-attività <strong>${updated.title}</strong> è stata aggiornata da <strong>${updater?.name || 'Sistema'}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 150px;"><strong>Macro-attività:</strong></td>
                <td style="padding: 4px 0;">${existing.startupActivity.title}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Cliente/Progetto:</strong></td>
                <td style="padding: 4px 0;">${existing.startupActivity.clientProject || 'Non definito'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Sotto-attività:</strong></td>
                <td style="padding: 4px 0;">${updated.title}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Stato Precedente:</strong></td>
                <td style="padding: 4px 0; text-decoration: line-through; color: #ef4444;">${statusLabels[existing.status] || existing.status}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #1e3a8a; font-weight: bold;"><strong>Nuovo Stato:</strong></td>
                <td style="padding: 4px 0; color: #22c55e; font-weight: bold;">${statusLabels[updated.status] || updated.status}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Responsabile:</strong></td>
                <td style="padding: 4px 0;">${updated.responsible?.name || 'Non assegnato'}</td>
              </tr>
            </table>
            <p style="margin-top: 16px;"><strong>Note di avanzamento:</strong><br />${progressNotes || 'Nessuna nota aggiuntiva'}</p>
          `
        }).catch((emailErr) => {
          console.error('[API Subactivities PUT] Error sending status email in background:', emailErr);
        });
      } catch (emailErr) {
        console.error('[API Subactivities PUT] Error preparing status email:', emailErr);
      }
    }

    return NextResponse.json({ subactivity: updated });
  } catch (error) {
    console.error('[API Subactivities PUT ID] Error updating subactivity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subId: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { subId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato. Permessi insufficienti.' }, { status: 403 });
  }

  try {
    const existing = await db.startupSubactivity.findUnique({
      where: { id: subId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Sotto-attività non trovata.' },
        { status: 404 }
      );
    }

    await db.startupSubactivity.delete({
      where: { id: subId },
    });

    return NextResponse.json({ success: true, message: 'Sotto-attività eliminata.' });
  } catch (error) {
    console.error('[API Subactivities DELETE ID] Error deleting subactivity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
