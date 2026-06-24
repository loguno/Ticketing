import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { id: startupActivityId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  if (userRole === 'STANDARD') {
    return NextResponse.json({ error: 'Accesso negato. Permessi insufficienti.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, responsibleId } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Il titolo della sotto-attività è obbligatorio.' },
        { status: 400 }
      );
    }

    const activity = await db.startupActivity.findUnique({
      where: { id: startupActivityId },
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Attività di startup non trovata.' },
        { status: 404 }
      );
    }

    const subactivity = await db.startupSubactivity.create({
      data: {
        startupActivityId,
        title,
        description: description || null,
        responsibleId: responsibleId || null,
        status: 'DA_FARE',
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

    return NextResponse.json({ subactivity }, { status: 201 });
  } catch (error) {
    console.error('[API Subactivities POST] Error creating subactivity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server.' },
      { status: 500 }
    );
  }
}
