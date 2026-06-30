import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import SchedulesClient from './schedules-client';

export default async function SchedulesPage() {
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

  // Only ADMIN can access schedules
  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch unique client/project values from database
  const projectsGrouped = await db.startupActivity.groupBy({
    by: ['clientProject'],
    where: {
      clientProject: { not: null, notIn: [''] },
    },
  });
  const projectList = projectsGrouped
    .map((p) => p.clientProject!)
    .filter(Boolean)
    .sort();

  return <SchedulesClient projectList={projectList} />;
}
