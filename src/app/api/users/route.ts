import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (!userRole || !['ADMIN', 'HELPDESK'].includes(userRole)) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const operators = await db.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'HELPDESK'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ operators });
  } catch (error) {
    console.error('[API Users] Error fetching operators:', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
