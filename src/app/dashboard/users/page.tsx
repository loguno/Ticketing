import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import UsersClient from './users-client';

export default async function UsersPage() {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  const userId = headersList.get('x-user-id');

  if (userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

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

  return <UsersClient users={users} currentUserId={userId!} />;
}
