import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStartupEmail } from '@/lib/smtp';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  try {
    const startup = await db.startupActivity.findUnique({
      where: { id },
      include: {
        subactivities: {
          include: {
            responsible: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!startup) {
      return NextResponse.json(
        { error: 'Attività di startup non trovata.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ startup });
  } catch (error) {
    console.error('[API Startup GET ID] Error loading startup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, clientProject, startDate, targetCompleteDate, status, pendingResponse } = body;

    const existing = await db.startupActivity.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Attività di startup non trovata.' },
        { status: 404 }
      );
    }

    const updated = await db.startupActivity.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        clientProject: clientProject !== undefined ? clientProject : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        targetCompleteDate: targetCompleteDate !== undefined ? (targetCompleteDate ? new Date(targetCompleteDate) : null) : undefined,
        status: status !== undefined ? status : undefined,
        pendingResponse: pendingResponse !== undefined ? pendingResponse : undefined,
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
          NUOVO: 'Nuovo',
          IN_LAVORAZIONE: 'In Lavorazione',
          CONCLUSO: 'Concluso',
          SOSPESO: 'Sospeso',
          ANNULLATO: 'Annullato',
        };

        const boardLabel = updated.boardType || 'STARTUP';

        sendStartupEmail({
          to: targetEmail,
          subject: `[${boardLabel}-UPDATE] Avanzamento Stato: ${updated.title}`,
          bodyText: `L'attività di ${boardLabel} "${updated.title}" ha cambiato stato.

DETTAGLI:
------------------------------------------
Attività: ${updated.title}
Cliente/Progetto: ${updated.clientProject || 'Non definito'}
Vecchio Stato: ${statusLabels[existing.status] || existing.status}
Nuovo Stato: ${statusLabels[updated.status] || updated.status}
`,
          bodyHtml: `
            <p>L'attività di <strong>${boardLabel}</strong> <strong>${updated.title}</strong> ha cambiato stato.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 150px;"><strong>Attività:</strong></td>
                <td style="padding: 4px 0;">${updated.title}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Cliente/Progetto:</strong></td>
                <td style="padding: 4px 0;">${updated.clientProject || 'Non definito'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b; font-weight: bold;"><strong>Stato Precedente:</strong></td>
                <td style="padding: 4px 0; text-decoration: line-through; color: #ef4444;">${statusLabels[existing.status] || existing.status}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #1e3a8a; font-weight: bold;"><strong>Nuovo Stato:</strong></td>
                <td style="padding: 4px 0; color: #22c55e; font-weight: bold;">${statusLabels[updated.status] || updated.status}</td>
              </tr>
            </table>
          `
        }).then(() => {
          console.log(`[API Startup PUT] Status email successfully sent in background.`);
        }).catch((emailErr) => {
          console.error('[API Startup PUT] Error sending status email in background:', emailErr);
        });
      } catch (emailErr) {
        console.error('[API Startup PUT] Error preparing status email:', emailErr);
      }
    }

    return NextResponse.json({ startup: updated });
  } catch (error) {
    console.error('[API Startup PUT ID] Error updating startup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { id } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  try {
    const existing = await db.startupActivity.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Attività di startup non trovata.' },
        { status: 404 }
      );
    }

    await db.startupActivity.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Attività di startup eliminata.' });
  } catch (error) {
    console.error('[API Startup DELETE ID] Error deleting startup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
