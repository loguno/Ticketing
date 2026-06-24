import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import IdeasClient from './ideas-client';

export default async function IdeasPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) {
    redirect('/login');
  }

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

  if (user.role === 'STANDARD') {
    redirect('/dashboard/tickets');
  }

  const operators = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'HELPDESK'] },
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

  return <IdeasClient operators={operators} />;
}
