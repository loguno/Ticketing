import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/logout-button';

export default async function DashboardPage() {
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
    // Session token exists but user no longer in DB
    redirect('/login');
  }

  return (
    <main className="min-h-screen p-8 md:p-16 flex flex-col justify-between">
      {/* Absolute Top Line */}
      <div className="fixed top-0 left-0 w-full h-2 bg-[#E85D04]"></div>

      {/* Top Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-black pb-6 gap-4">
        <div>
          <span className="font-mono text-xs text-[#E85D04] tracking-widest uppercase block">[ AREA RISERVATA // DASHBOARD ]</span>
          <h1 className="text-3xl font-black uppercase font-mono tracking-tight text-[#0D0D0D] mt-1">
            PORTALE SERVIZI IT
          </h1>
        </div>
        <div className="flex items-center gap-4 bg-white border-2 border-black p-3 font-mono text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="h-3 w-3 bg-[#E85D04] inline-block animate-pulse"></div>
          <div>
            <span className="text-gray-500">UTENTE:</span> <strong className="text-black">{user.name}</strong>
          </div>
          <div className="border-l border-gray-300 pl-3">
            <span className="text-gray-500">RUOLO:</span> <strong className="text-[#E85D04]">{user.role}</strong>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <section className="my-12 flex-grow flex flex-col justify-center max-w-4xl mx-auto w-full">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-xs font-mono text-[#E85D04] uppercase tracking-widest block mb-1">
            [ STATO INFRASTRUTTURA BASE ]
          </span>
          <h2 className="text-2xl font-black uppercase font-mono tracking-tight text-black mb-4">
            FASE 1 COMPLETATA CON SUCCESSO
          </h2>
          <p className="text-sm font-mono text-gray-700 leading-relaxed mb-6">
            L&apos;architettura di base è stata inizializzata ed è operativa. Autenticazione JWT tramite HttpOnly cookie, middleware di controllo degli accessi basato sui ruoli (RBAC), database locale SQLite per lo sviluppo, worker di ingestione e invio email (SMTP/IMAP) configurati.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs uppercase mb-6">
            <div className="border-2 border-black p-4 bg-[#F5F0EB]">
              <div className="text-gray-500 mb-1">DATABASE LOCAL (SQLITE)</div>
              <div className="font-bold text-emerald-600">ATTIVO & IN SYNC // dev.db</div>
            </div>
            <div className="border-2 border-black p-4 bg-[#F5F0EB]">
              <div className="text-gray-500 mb-1">SMTP MODULE</div>
              <div className="font-bold text-black">IN ATTESA</div>
            </div>
            <div className="border-2 border-black p-4 bg-[#F5F0EB]">
              <div className="text-gray-500 mb-1">IMAP WORKER</div>
              <div className="font-bold text-black">POLLING (2 MIN)</div>
            </div>
          </div>

          {/* Actions placeholder */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
            <LogoutButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-300 pt-6 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-500 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
