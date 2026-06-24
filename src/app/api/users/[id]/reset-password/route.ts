import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/users/[id]/reset-password — ADMIN resets a user's password
export async function POST(request: Request, { params }: Params) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'La nuova password deve essere di almeno 8 caratteri.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Users Reset Password]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
