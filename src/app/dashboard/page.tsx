import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
    redirect('/login');
  }

  if (user.role === 'STANDARD') {
    redirect('/dashboard/tickets');
  }

  // Retrieve actual ticket metrics
  const totalOpenTickets = await db.ticket.count({
    where: {
      status: {
        in: ['NUOVO', 'IN_VALUTAZIONE'],
      },
    },
  });

  const triageCount = await db.ticket.count({
    where: {
      status: 'NUOVO',
    },
  });

  const myTicketsCount = await db.ticket.count({
    where: {
      operatorId: userId,
      status: { in: ['NUOVO', 'IN_VALUTAZIONE'] },
    },
  });

  // Retrieve actual startup metrics
  const totalOpenStartups = await db.startupActivity.count({
    where: {
      status: {
        in: ['NUOVO', 'IN_LAVORAZIONE'],
      },
    },
  });

  return (
    <main className="flex-grow p-6 md:p-12 flex flex-col justify-between font-sans bg-[#F5F0EB]">
      {/* Page Content */}
      <div className="max-w-5xl w-full mx-auto space-y-8">
        
        {/* Breadcrumb & Greetings */}
        <div className="flex justify-between items-center border-b border-black/10 pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
            <span>Dashboard</span>
            <span className="mx-2">&bull;</span>
            <span className="text-[#004B97] font-bold">Home</span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Welcome Section */}
        <div className="bg-white border border-black/10 p-8 rounded-2xl shadow-xs">
          <span className="text-xs font-mono text-[#004B97] uppercase tracking-widest block mb-2">
            [ PANNELLO DI CONTROLLO ]
          </span>
          <h2 className="text-2xl font-black uppercase text-black tracking-tight mb-4">
            Benvenuto, {user.name}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">
            Qui puoi monitorare lo stato di avanzamento dei ticket di assistenza IT logistica, inoltrare nuove segnalazioni tecniche o seguire lo stato di avanzamento delle attività di Start Up per i nuovi clienti dello stabilimento.
          </p>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs uppercase">
          
          {/* Card 1 */}
          <div className="bg-white border border-black/10 border-l-4 border-l-[#11BCEC] rounded-xl py-5 px-5 flex flex-col justify-between min-h-[110px] hover:border-black/20 hover:shadow-xs transition-all">
            <div className="text-gray-500 font-bold mb-1 tracking-wider">
              TUTTI I TICKET IN CORSO
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-black tracking-tight">{totalOpenTickets}</span>
              <span className="text-[9px] bg-[#11BCEC]/10 text-[#004B97] px-1.5 py-0.5 rounded font-bold">ATTIVI</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-black/10 border-l-4 border-l-[#3B82F6] rounded-xl py-5 px-5 flex flex-col justify-between min-h-[110px] hover:border-black/20 hover:shadow-xs transition-all">
            <div className="text-gray-500 font-bold mb-1 tracking-wider">
              TICKET IN TRIAGE (NUOVI)
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-3xl font-extrabold tracking-tight ${triageCount > 0 ? 'text-blue-600' : 'text-black'}`}>{triageCount}</span>
              <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">DA FARE</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-black/10 border-l-4 border-l-[#10B981] rounded-xl py-5 px-5 flex flex-col justify-between min-h-[110px] hover:border-black/20 hover:shadow-xs transition-all">
            <div className="text-gray-500 font-bold mb-1 tracking-wider">
              TICKET IN CARICO A ME
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-black tracking-tight">{myTicketsCount}</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">ASSEGNATI</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-black/10 border-l-4 border-l-amber-500 rounded-xl py-5 px-5 flex flex-col justify-between min-h-[110px] hover:border-black/20 hover:shadow-xs transition-all">
            <div className="text-gray-500 font-bold mb-1 tracking-wider">
              STARTUP IN CORSO
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-black tracking-tight">{totalOpenStartups}</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">START UP</span>
            </div>
          </div>

        </div>

        {/* Quick Actions Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-6 bg-white border border-black/10 rounded-xl gap-4 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-black uppercase">[ AZIONI RAPIDE DI NAVIGAZIONE ]</h4>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Seleziona una delle sezioni operative del portale per iniziare a lavorare.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/dashboard/tickets"
              className="bg-white hover:bg-gray-50 text-black font-mono text-xs font-bold uppercase px-5 py-3 border border-black/10 rounded-lg text-center transition-all shadow-xs"
            >
              VAI AI TICKET &rarr;
            </Link>
            <Link
              href="/dashboard/startup"
              className="bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase px-5 py-3 rounded-lg text-center transition-all shadow-xs"
            >
              VAI ALLE START UP &rarr;
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-black/10 pt-6 mt-12 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-400 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
