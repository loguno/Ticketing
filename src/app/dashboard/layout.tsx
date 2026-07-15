import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ResizableLayout from '@/components/resizable-layout';
import { initStartupScheduler } from '@/lib/startup-scheduler';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start background periodic report scheduler only in development mode
  if (process.env.NODE_ENV === 'development') {
    initStartupScheduler();
  }

  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <ResizableLayout user={user}>
      {children}
    </ResizableLayout>
  );
}

