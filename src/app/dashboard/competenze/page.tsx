import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import CompetenzeClient from './competenze-client';

export default async function CompetenzePage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) {
    redirect('/login');
  }

  // Retrieve authenticated user from SQLite DB
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  // Double safety: only ADMIN and HELPDESK can access this dashboard view
  if (user.role === 'STANDARD') {
    redirect('/dashboard/tickets');
  }

  return <CompetenzeClient user={user} />;
}
