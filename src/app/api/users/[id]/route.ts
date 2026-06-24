import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/users/[id] — modifica nome, email, ruolo
export async function PATCH(request: Request, { params }: Params) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { name, email, role } = await request.json();

    // Prevent removing the last ADMIN
    if (role && role !== 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
      const targetUser = await db.user.findUnique({ where: { id }, select: { role: true } });
      if (adminCount <= 1 && targetUser?.role === 'ADMIN') {
        return NextResponse.json({ error: 'Impossibile rimuovere l\'ultimo ADMIN.' }, { status: 400 });
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API Users PATCH]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — elimina utente
export async function DELETE(request: Request, { params }: Params) {
  const userRole = request.headers.get('x-user-role');
  const requestingUserId = request.headers.get('x-user-id');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === requestingUserId) {
    return NextResponse.json({ error: 'Non puoi eliminare il tuo stesso account.' }, { status: 400 });
  }

  try {
    // Prevent deleting last ADMIN
    const targetUser = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (targetUser?.role === 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Impossibile eliminare l\'ultimo ADMIN.' }, { status: 400 });
      }
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Users DELETE]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
