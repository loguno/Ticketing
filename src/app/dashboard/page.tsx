import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// --- SVG Donut Chart helper ---
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] text-sm text-gray-400">
        Nessun dato
      </div>
    );
  }
  const cx = 80; const cy = 80; const r = 60; const strokeW = 22;
  const circumference = 2 * Math.PI * r;
  let currentAccumulator = 0;
  const segments = [];
  for (const d of data) {
    const percent = total > 0 ? d.value / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -currentAccumulator * circumference;
    currentAccumulator += percent;
    segments.push({ ...d, percent, strokeDasharray, strokeDashoffset });
  }

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={seg.strokeDasharray}
            strokeDashoffset={seg.strokeDashoffset}
            strokeLinecap="butt"
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="text-xl" style={{ fontWeight: 900, fontSize: 26, fill: '#111827' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>totale</text>
      </svg>
      <ul className="space-y-2 text-xs">
        {segments.map(seg => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="text-gray-600 font-medium">{seg.label}</span>
            <span className="ml-auto font-black text-gray-900 pl-3">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- SVG Horizontal Bar Chart ---
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nessun dato</p>
      ) : (
        data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium w-24 truncate shrink-0">{d.label}</span>
            <div className="flex-grow bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
              />
            </div>
            <span className="text-xs font-black text-gray-800 w-6 text-right shrink-0">{d.value}</span>
          </div>
        ))
      )}
    </div>
  );
}

// --- KPI Card ---
function KpiCard({ label, value, tag, color, tagColor, unit = "" }: {
  label: string; value: number; tag: string; color: string; tagColor: string; unit?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
      style={{ borderLeftColor: color }}>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">{label}</div>
      <div className="flex items-center justify-center gap-3 mt-3 w-full">
        <span className="text-4xl font-black text-gray-900 tracking-tight">{value}{unit}</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
          style={{ background: tagColor + '20', color: tagColor }}>{tag}</span>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const { tab = 'tickets' } = await searchParams;

  if (!userId) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) redirect('/login');
  if (user.role === 'STANDARD') redirect('/dashboard/tickets');

  const dateStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ==========================================
  // DATA QUERIES FOR SCHEDA 1: TICKETS IT
  // ==========================================
  
  // KPI values for Tickets
  const [totalOpen, triageCount, myTickets, resolved] = await Promise.all([
    db.ticket.count({ where: { status: { in: ['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO', 'SOSPESO'] } } }),
    db.ticket.count({ where: { status: 'NUOVO' } }),
    db.ticket.count({ where: { operatorId: userId, status: { in: ['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO', 'SOSPESO'] } } }),
    db.ticket.count({ where: { status: 'RISOLTO' } }),
  ]);

  // Donut: tickets per categoria
  const byCategory = await db.ticket.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { status: { in: ['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO', 'SOSPESO'] } },
  });
  const catColors: Record<string, string> = {
    TMS: '#11BCEC', WMS: '#004B97', AMMINISTRATIVO: '#10B981', ALTRO: '#F59E0B',
  };
  const categoryData = byCategory.map(c => ({
    label: c.category,
    value: c._count.id,
    color: catColors[c.category] ?? '#94a3b8',
  }));

  // Donut: tickets per stato
  const byStatus = await db.ticket.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  const statusColors: Record<string, string> = {
    NUOVO: '#3B82F6', IN_VALUTAZIONE: '#F59E0B', IN_CARICO: '#D97706', RISPOSTO: '#11BCEC',
    RISOLTO: '#10B981', CHIUSO: '#6B7280', NON_RISOLVIBILE: '#EF4444', ANNULLATO: '#9CA3AF',
    SOSPESO: '#64748B',
  };
  const statusData = byStatus.map(s => ({
    label: s.status.replace('_', ' '),
    value: s._count.id,
    color: statusColors[s.status] ?? '#94a3b8',
  }));

  // Bar chart: tickets per operatore
  const byOperator = await db.ticket.groupBy({
    by: ['operatorId'],
    _count: { id: true },
    where: { operatorId: { not: null }, status: { in: ['NUOVO', 'IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO', 'SOSPESO'] } },
    orderBy: { _count: { id: 'desc' } },
    take: 6,
  });
  const operatorIds = byOperator.map(o => o.operatorId!).filter(Boolean);
  const operators = await db.user.findMany({
    where: { id: { in: operatorIds } },
    select: { id: true, name: true },
  });
  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.name]));
  const operatorColors = ['#004B97', '#11BCEC', '#10B981', '#F59E0B', '#EF4444', '#0D9488'];
  const operatorData = byOperator.map((o, i) => ({
    label: operatorMap[o.operatorId!] ?? 'Sconosciuto',
    value: o._count.id,
    color: operatorColors[i % operatorColors.length],
  }));

  // ==========================================
  // DATA QUERIES FOR SCHEDA 2: ATTIVITÀ DI SVILUPPO
  // ==========================================
  
  // KPI values for Development Boards
  const [openStartups, openWms, openTms, openCrossdocking, allSubactivities] = await Promise.all([
    db.startupActivity.count({ where: { boardType: 'STARTUP', status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } } }),
    db.startupActivity.count({ where: { boardType: 'WMS', status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } } }),
    db.startupActivity.count({ where: { boardType: 'TMS', status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } } }),
    db.startupActivity.count({ where: { boardType: 'CROSS_DOCKING', status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } } }),
    db.startupSubactivity.findMany({ select: { status: true } }),
  ]);

  const totalSubs = allSubactivities.length;
  const completedSubs = allSubactivities.filter(s => s.status === 'COMPLETATA').length;
  const avgProgress = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

  // Donut: attività per Area/Kanban
  const byBoardType = await db.startupActivity.groupBy({
    by: ['boardType'],
    _count: { id: true },
    where: { status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } },
  });
  const boardTypeColors: Record<string, string> = {
    STARTUP: '#F59E0B', WMS: '#004B97', TMS: '#11BCEC', CROSS_DOCKING: '#0D9488',
  };
  const boardTypeLabels: Record<string, string> = {
    STARTUP: 'Start Up', WMS: 'WMS', TMS: 'TMS', CROSS_DOCKING: 'Cross Docking',
  };
  const devKanbanData = byBoardType.map(b => ({
    label: boardTypeLabels[b.boardType] || b.boardType,
    value: b._count.id,
    color: boardTypeColors[b.boardType] ?? '#94a3b8',
  }));

  // Donut: attività per Stato
  const byActivityStatus = await db.startupActivity.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  const activityStatusColors: Record<string, string> = {
    NUOVO: '#3B82F6', IN_LAVORAZIONE: '#F59E0B', CONCLUSO: '#10B981',
  };
  const activityStatusLabels: Record<string, string> = {
    NUOVO: 'Nuovo', IN_LAVORAZIONE: 'In Corso', CONCLUSO: 'Concluso',
  };
  const devStatusData = byActivityStatus.map(s => ({
    label: activityStatusLabels[s.status] || s.status,
    value: s._count.id,
    color: activityStatusColors[s.status] ?? '#94a3b8',
  }));

  // Bar chart: carico lavoro sotto-attività per operatore
  const byResponsible = await db.startupSubactivity.groupBy({
    by: ['responsibleId'],
    _count: { id: true },
    where: { responsibleId: { not: null }, status: { in: ['DA_FARE', 'IN_CORSO'] } },
    orderBy: { _count: { id: 'desc' } },
    take: 6,
  });
  const responsibleIds = byResponsible.map(r => r.responsibleId!).filter(Boolean);
  const responsibles = await db.user.findMany({
    where: { id: { in: responsibleIds } },
    select: { id: true, name: true },
  });
  const responsibleMap = Object.fromEntries(responsibles.map(r => [r.id, r.name]));
  const responsibleColors = ['#004B97', '#11BCEC', '#10B981', '#F59E0B', '#EF4444', '#0D9488'];
  const devResponsibleData = byResponsible.map((r, i) => ({
    label: responsibleMap[r.responsibleId!] ?? 'Sconosciuto',
    value: r._count.id,
    color: responsibleColors[i % responsibleColors.length],
  }));

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Dashboard</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Benvenuto, {user.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateStr}</p>
          </div>
        </div>

        {/* Dashboard Tabs Selector */}
        <div className="flex border-b border-black/[0.07] gap-6">
          <Link
            href="/dashboard?tab=tickets"
            className={`pb-3 font-mono text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-1 ${
              tab === 'tickets'
                ? 'border-[#004B97] text-[#004B97]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Segnalazioni Utenti (Ticket)
          </Link>
          <Link
            href="/dashboard?tab=development"
            className={`pb-3 font-mono text-xs font-bold uppercase tracking-wider transition-all border-b-2 px-1 ${
              tab === 'development'
                ? 'border-[#004B97] text-[#004B97]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Attività di Sviluppo
          </Link>
        </div>

        {/* CONTENT FOR TAB 1: TICKETS */}
        {tab === 'tickets' && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Ticket Aperti" value={totalOpen} tag="Attivi" color="#11BCEC" tagColor="#0369a1" />
              <KpiCard label="In Triage" value={triageCount} tag="Nuovi" color="#3B82F6" tagColor="#1d4ed8" />
              <KpiCard label="Miei Ticket" value={myTickets} tag="Assegnati" color="#10B981" tagColor="#059669" />
              <KpiCard label="Risolti" value={resolved} tag="Totale" color="#6B7280" tagColor="#374151" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut — per categoria */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Ticket per Categoria</h3>
                <DonutChart data={categoryData} />
              </div>

              {/* Donut — per stato */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Ticket per Stato</h3>
                <DonutChart data={statusData} />
              </div>

              {/* Bar chart — per operatore */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Ticket per Operatore</h3>
                <BarChart data={operatorData} />
              </div>
            </div>
          </div>
        )}

        {/* CONTENT FOR TAB 2: DEVELOPMENT */}
        {tab === 'development' && (
          <div className="space-y-8 animate-fadeIn">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard label="Start Up Attive" value={openStartups} tag="Attive" color="#F59E0B" tagColor="#b45309" />
              <KpiCard label="WMS Attivi" value={openWms} tag="Attivi" color="#004B97" tagColor="#1e3a8a" />
              <KpiCard label="TMS Attivi" value={openTms} tag="Attivi" color="#11BCEC" tagColor="#0369a1" />
              <KpiCard label="Cross Docking" value={openCrossdocking} tag="Attivi" color="#0D9488" tagColor="#0f766e" />
              <KpiCard label="Avanzamento Medio" value={avgProgress} unit="%" tag="Sotto-schede" color="#10B981" tagColor="#047857" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut — per Kanban/Board */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Attività per Area</h3>
                <DonutChart data={devKanbanData} />
              </div>

              {/* Donut — per stato */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Attività per Stato</h3>
                <DonutChart data={devStatusData} />
              </div>

              {/* Bar chart — per operatore */}
              <div className="bg-white rounded-2xl border border-black/[0.07] p-6 shadow-xs">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Carico Lavoro Responsabili (Sotto-attività)</h3>
                <BarChart data={devResponsibleData} />
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
