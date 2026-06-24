import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import TicketDetailClient from './ticket-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // Fetch operators list if user is administrative or support staff
  let operators: { id: string; name: string; email: string; role: string }[] = [];
  if (user.role !== 'STANDARD') {
    operators = await db.user.findMany({
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
  }

  return (
    <TicketDetailClient
      user={user}
      ticketId={id}
      initialOperators={operators}
    />
  );
}
