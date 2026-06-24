import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users — lista tutti gli utenti (ADMIN only)
export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error('[API Users GET]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}

// POST /api/users — crea nuovo utente (ADMIN only)
export async function POST(request: Request) {
  const userRole = request.headers.get('x-user-role');

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Tutti i campi sono obbligatori.' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email già registrata.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('[API Users POST]', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
