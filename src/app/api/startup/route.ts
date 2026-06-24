import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendStartupEmail } from '@/lib/smtp';

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  try {
    const startups = await db.startupActivity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
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

    return NextResponse.json({ startups });
  } catch (error) {
    console.error('[API Startup GET] Error listing startups:', error);
    return NextResponse.json(
      { error: 'Errore durante il caricamento delle attività di startup.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  try {
    interface SubactivityInput {
      title: string;
      description?: string;
      responsibleId?: string;
    }

    const body = await request.json();
    const { title, description, clientProject, startDate, targetCompleteDate, subactivities } = body as {
      title: string;
      description?: string;
      clientProject?: string;
      startDate?: string;
      targetCompleteDate?: string;
      subactivities?: SubactivityInput[];
    };

    if (!title) {
      return NextResponse.json(
        { error: 'Il campo Titolo è obbligatorio.' },
        { status: 400 }
      );
    }

    // Create the startup activity and its subactivities in a transaction
    const startup = await db.startupActivity.create({
      data: {
        title,
        description: description || null,
        clientProject: clientProject || null,
        startDate: startDate ? new Date(startDate) : null,
        targetCompleteDate: targetCompleteDate ? new Date(targetCompleteDate) : null,
        status: 'NUOVO',
        subactivities: {
          create: subactivities?.map((sub: SubactivityInput) => ({
            title: sub.title,
            description: sub.description || null,
            responsibleId: sub.responsibleId || null,
            status: 'DA_FARE',
          })) || [],
        },
      },
      include: {
        subactivities: {
          include: {
            responsible: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Send instant email notification to PM
    try {
      const emailSetting = await db.systemSetting.findUnique({
        where: { key: 'startup_report_email' },
      });
      const targetEmail = emailSetting?.value || 'pm@azienda.it';

      const startDateStr = startDate ? new Date(startDate).toLocaleDateString('it-IT') : 'Non definita';
      const endDateStr = targetCompleteDate ? new Date(targetCompleteDate).toLocaleDateString('it-IT') : 'Non definita';
      const subactivitiesList = startup.subactivities.map(s => `- ${s.title} (Resp: ${s.responsible?.name || 'Non assegnato'})`).join('\n');

      sendStartupEmail({
        to: targetEmail,
        subject: `[STARTUP-NEW] Inserimento Attività: ${title}`,
        bodyText: `È stata registrata una nuova attività di Start Up nel sistema.

DETTAGLI:
------------------------------------------
Titolo: ${title}
Cliente/Progetto: ${clientProject || 'Non definito'}
Descrizione: ${description || 'Nessuna descrizione'}
Data Inizio: ${startDateStr}
Data Prevista Completamento: ${endDateStr}
Stato: Nuovo

SOTTO-ATTIVITÀ CONFIGURATE:
${subactivitiesList || 'Nessuna sotto-attività configurata'}
`,
        bodyHtml: `
          <p>È stata registrata una nuova attività di <strong>Start Up</strong> nel sistema.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 150px;"><strong>Titolo:</strong></td>
              <td style="padding: 4px 0;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Cliente/Progetto:</strong></td>
              <td style="padding: 4px 0;">${clientProject || 'Non definito'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Data Inizio:</strong></td>
              <td style="padding: 4px 0;">${startDateStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Scadenza Prevista:</strong></td>
              <td style="padding: 4px 0;">${endDateStr}</td>
            </tr>
          </table>
          <p style="margin-top: 16px;"><strong>Descrizione:</strong><br />${description || 'Nessuna descrizione'}</p>
          
          <h4 style="color: #7c2d12; margin-top: 20px; border-bottom: 1px solid #fed7aa; padding-bottom: 4px;">Sotto-attività configurate:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${startup.subactivities.map(s => `<li><strong>${s.title}</strong> &mdash; Referente: ${s.responsible?.name || '<em style="color: #ef4444;">Non assegnato</em>'}</li>`).join('')}
          </ul>
        `
      }).then(() => {
        console.log(`[API Startup POST] Notification email successfully sent in background to ${targetEmail}`);
      }).catch((emailErr) => {
        console.error('[API Startup POST] Error sending email notification in background:', emailErr);
      });
    } catch (emailErr) {
      console.error('[API Startup POST] Error preparing email notification:', emailErr);
    }

    return NextResponse.json({ startup }, { status: 201 });
  } catch (error) {
    console.error('[API Startup POST] Error creating startup:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante la creazione della startup.' },
      { status: 500 }
    );
  }
}
