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
function KpiCard({ label, value, tag, color, tagColor }: {
  label: string; value: number; tag: string; color: string; tagColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
      style={{ borderLeftColor: color }}>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">{label}</div>
      <div className="flex items-center justify-center gap-3 mt-3 w-full">
        <span className="text-4xl font-black text-gray-900 tracking-tight">{value}</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
          style={{ background: tagColor + '20', color: tagColor }}>{tag}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');

  if (!userId) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) redirect('/login');
  if (user.role === 'STANDARD') redirect('/dashboard/tickets');

  // --- KPI queries ---
  const [totalOpen, triageCount, myTickets, resolved, openStartups] = await Promise.all([
    db.ticket.count({ where: { status: { in: ['NUOVO', 'IN_VALUTAZIONE'] } } }),
    db.ticket.count({ where: { status: 'NUOVO' } }),
    db.ticket.count({ where: { operatorId: userId, status: { in: ['NUOVO', 'IN_VALUTAZIONE'] } } }),
    db.ticket.count({ where: { status: 'RISOLTO' } }),
    db.startupActivity.count({ where: { status: { in: ['NUOVO', 'IN_LAVORAZIONE'] } } }),
  ]);

  // --- Donut: tickets per categoria ---
  const byCategory = await db.ticket.groupBy({
    by: ['category'],
    _count: { id: true },
    where: { status: { in: ['NUOVO', 'IN_VALUTAZIONE'] } },
  });
  const catColors: Record<string, string> = {
    TMS: '#11BCEC', WMS: '#004B97', AMMINISTRATIVO: '#10B981', ALTRO: '#F59E0B',
  };
  const categoryData = byCategory.map(c => ({
    label: c.category,
    value: c._count.id,
    color: catColors[c.category] ?? '#94a3b8',
  }));

  // --- Donut: tickets per stato ---
  const byStatus = await db.ticket.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  const statusColors: Record<string, string> = {
    NUOVO: '#3B82F6', IN_VALUTAZIONE: '#F59E0B', RISOLTO: '#10B981',
    CHIUSO: '#6B7280', NON_RISOLVIBILE: '#EF4444', ANNULLATO: '#9CA3AF',
  };
  const statusData = byStatus.map(s => ({
    label: s.status.replace('_', ' '),
    value: s._count.id,
    color: statusColors[s.status] ?? '#94a3b8',
  }));

  // --- Bar chart: tickets per operatore ---
  const byOperator = await db.ticket.groupBy({
    by: ['operatorId'],
    _count: { id: true },
    where: { operatorId: { not: null }, status: { in: ['NUOVO', 'IN_VALUTAZIONE'] } },
    orderBy: { _count: { id: 'desc' } },
    take: 6,
  });
  const operatorIds = byOperator.map(o => o.operatorId!).filter(Boolean);
  const operators = await db.user.findMany({
    where: { id: { in: operatorIds } },
    select: { id: true, name: true },
  });
  const operatorMap = Object.fromEntries(operators.map(o => [o.id, o.name]));
  const operatorColors = ['#004B97', '#11BCEC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const operatorData = byOperator.map((o, i) => ({
    label: operatorMap[o.operatorId!] ?? 'Sconosciuto',
    value: o._count.id,
    color: operatorColors[i % operatorColors.length],
  }));

  const dateStr = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Dashboard</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Benvenuto, {user.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateStr}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/tickets" className="flex items-center gap-2 border border-black/10 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-xs">
              Vai ai Ticket →
            </Link>
            <Link href="/dashboard/startup" className="flex items-center gap-2 bg-[#004B97] hover:bg-[#003a75] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              Start Up →
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Ticket Aperti" value={totalOpen} tag="Attivi" color="#11BCEC" tagColor="#0369a1" />
          <KpiCard label="In Triage" value={triageCount} tag="Nuovi" color="#3B82F6" tagColor="#1d4ed8" />
          <KpiCard label="Miei Ticket" value={myTickets} tag="Assegnati" color="#10B981" tagColor="#059669" />
          <KpiCard label="Risolti" value={resolved} tag="Totale" color="#6B7280" tagColor="#374151" />
          <KpiCard label="Startup" value={openStartups} tag="In corso" color="#F59E0B" tagColor="#b45309" />
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
    </main>
  );
}
