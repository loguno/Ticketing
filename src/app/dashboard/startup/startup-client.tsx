'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StartupForm from '@/components/startup-form';
import SubactivityEditModal from '@/components/subactivity-edit-modal';
import MacroEditModal from '@/components/macro-edit-modal';

interface TriStateSwitchProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
}

export function TriStateSwitch({ value, onChange, readOnly = false }: TriStateSwitchProps) {
  const states = [
    { val: 0, label: 'Nessuno', short: 'Ø', color: 'bg-slate-400 text-white' },
    { val: 1, label: 'Spetta a me', short: 'Mio', color: 'bg-amber-500 text-white shadow-xs' },
    { val: 2, label: 'Attesa risposta', short: 'Loro', color: 'bg-sky-500 text-white shadow-xs' }
  ];

  return (
    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-black/[0.05] items-center h-[24px]">
      {states.map((opt) => {
        const isActive = value === opt.val;
        return (
          <button
            key={opt.val}
            type="button"
            onClick={() => !readOnly && onChange && onChange(opt.val)}
            className={`px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide rounded-md transition-all flex items-center justify-center h-full ${
              readOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              isActive
                ? `${opt.color} text-[8.5px] scale-[1.03]`
                : 'text-gray-400 hover:text-gray-650 bg-transparent'
            }`}
            title={opt.label}
            disabled={readOnly}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Subactivity {
  id: string;
  startupActivityId: string;
  title: string;
  description: string | null;
  status: 'DA_FARE' | 'IN_CORSO' | 'COMPLETATA';
  responsibleId: string | null;
  progressNotes: string | null;
  completedAt: string | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface StartupActivity {
  id: string;
  title: string;
  description: string | null;
  clientProject: string | null;
  startDate: string | null;
  targetCompleteDate: string | null;
  status: 'NUOVO' | 'IN_LAVORAZIONE' | 'CONCLUSO' | 'SOSPESO' | 'ANNULLATO';
  pendingResponse: number;
  createdAt: string;
  subactivities: Subactivity[];
}

interface StartupClientProps {
  user: UserInfo;
  allUsers: UserInfo[];
  boardType?: 'STARTUP' | 'TMS' | 'WMS' | 'CROSS_DOCKING';
  title?: string;
}

export default function StartupClient({ user, allUsers, boardType = 'STARTUP', title = 'Start Up IT' }: StartupClientProps) {
  const [startups, setStartups] = useState<StartupActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubactivity, setSelectedSubactivity] = useState<Subactivity | null>(null);
  const [editingMacro, setEditingMacro] = useState<StartupActivity | null>(null);
  
  // Modals for adding subactivity on the fly
  const [addingSubactivityToId, setAddingSubactivityToId] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubResp, setNewSubResp] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [responseFilter, setResponseFilter] = useState<string>('ALL');

  const fetchStartups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/startup?type=${boardType}`);
      if (!res.ok) throw new Error('Errore durante il caricamento dei dati.');
      const data = await res.json();
      setStartups(data.startups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [boardType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStartups();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStartups]);

  // Helper for progress ratio
  const getProgress = (startup: StartupActivity) => {
    const total = startup.subactivities.length;
    if (total === 0) return 0;
    const completed = startup.subactivities.filter((s) => s.status === 'COMPLETATA').length;
    return Math.round((completed / total) * 100);
  };

  // Handle status update of Macro activity
  const handleMacroStatusChange = async (id: string, newStatus: StartupActivity['status']) => {
    try {
      const res = await fetch(`/api/startup/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dello stato.");
      fetchStartups();
    } catch (err) {
      alert(err || 'Errore');
    }
  };

  // Handle pendingResponse update of Macro activity
  const handleMacroResponseChange = async (id: string, newResponse: number) => {
    try {
      const res = await fetch(`/api/startup/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingResponse: newResponse }),
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dello stato di risposta.");
      fetchStartups();
    } catch (err) {
      alert(err || 'Errore');
    }
  };

  // Handle full edit of Macro activity
  const handleMacroEditSubmit = async (
    id: string,
    updates: {
      title: string;
      clientProject: string | null;
      description: string | null;
      startDate: string | null;
      targetCompleteDate: string | null;
    }
  ) => {
    try {
      const res = await fetch(`/api/startup/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Errore durante il salvataggio delle modifiche.");
      setEditingMacro(null);
      fetchStartups();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  };

  // Add subactivity directly
  const handleAddSubactivitySubmit = async (e: React.FormEvent, activityId: string) => {
    e.preventDefault();
    if (!newSubTitle.trim()) return;

    try {
      const res = await fetch(`/api/startup/${activityId}/subactivities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubTitle.trim(),
          description: newSubDesc.trim() || null,
          responsibleId: newSubResp || null,
        }),
      });

      if (!res.ok) throw new Error('Errore nella creazione della sotto-attività.');
      
      setNewSubTitle('');
      setNewSubDesc('');
      setNewSubResp('');
      setAddingSubactivityToId(null);
      fetchStartups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore';
      alert(message);
    }
  };

  // Delete Macro activity
  const handleMacroDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa attività di Startup? Verranno eliminate anche tutte le sotto-attività.')) {
      return;
    }

    try {
      const res = await fetch(`/api/startup/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Errore durante l'eliminazione.");
      fetchStartups();
    } catch (err) {
      alert(err || 'Errore');
    }
  };

  // Get unique clients for filtering
  const uniqueClients = Array.from(
    new Set(startups.map((s) => s.clientProject).filter(Boolean))
  ) as string[];

  // Filtered List
  const filteredStartups = startups.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.clientProject && s.clientProject.toLowerCase().includes(search.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

    const matchesClient = !clientFilter || s.clientProject === clientFilter;

    const matchesResponse = responseFilter === 'ALL' || 
      (responseFilter === '0' && s.pendingResponse === 0) ||
      (responseFilter === '1' && s.pendingResponse === 1) ||
      (responseFilter === '2' && s.pendingResponse === 2);

    return matchesSearch && matchesClient && matchesResponse;
  });

  // Kanban Columns
  const columns: { id: StartupActivity['status']; title: string; color: string; bg: string; border: string }[] = [
    { id: 'NUOVO', title: 'Da Avviare', color: 'text-blue-700', bg: 'bg-blue-500/5', border: 'border-blue-500/20 bg-blue-50/40' },
    { id: 'IN_LAVORAZIONE', title: 'In Corso', color: 'text-[#C94E03]', bg: 'bg-[#E85D04]/5', border: 'border-[#E85D04]/20 bg-amber-50/40' },
    { id: 'SOSPESO', title: 'Sospeso', color: 'text-slate-650', bg: 'bg-slate-500/5', border: 'border-slate-400/30 bg-slate-100/40' },
    { id: 'CONCLUSO', title: 'Completato', color: 'text-emerald-700', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20 bg-emerald-50/40' },
    { id: 'ANNULLATO', title: 'Annullato', color: 'text-red-700', bg: 'bg-red-500/5', border: 'border-red-500/20 bg-red-50/40' },
  ];

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      {/* Container */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Operativo</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">Gestione e avanzamento attività per {title}</p>
          </div>
          {user.role !== 'STANDARD' && (
            <button
              id="btn-nuova-startup"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#004B97] hover:bg-[#003a75] text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              + Crea Attività
            </button>
          )}
        </div>

        {/* Mockup-style KPI metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 font-mono text-xs uppercase">
          
          {/* Card 1: TOTALE PROGETTI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#9ca3af' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">TOTALI</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{startups.length}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#9ca3af20', color: '#4b5563' }}>ATTIVITÀ</span>
            </div>
          </div>
  
          {/* Card 2: DA AVVIARE */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#3B82F6' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">DA AVVIARE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {startups.filter((s) => s.status === 'NUOVO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#3B82F620', color: '#1d4ed8' }}>NUOVI</span>
            </div>
          </div>
  
          {/* Card 3: IN CORSO */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#E85D04' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">IN CORSO</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {startups.filter((s) => s.status === 'IN_LAVORAZIONE').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#E85D0420', color: '#C94E03' }}>ATTIVI</span>
            </div>
          </div>

          {/* Card 4: SOSPESI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#64748b' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">SOSPESI</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {startups.filter((s) => s.status === 'SOSPESO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#64748b20', color: '#475569' }}>STOP</span>
            </div>
          </div>
  
          {/* Card 5: COMPLETATI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#10B981' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">COMPLETATI</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {startups.filter((s) => s.status === 'CONCLUSO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#10B98120', color: '#059669' }}>FINE</span>
            </div>
          </div>

        </div>

        {/* Filters and Views Bar */}
        <div className="bg-white/80 backdrop-blur-md border border-black/10 rounded-xl p-4 gap-4 flex flex-col md:flex-row md:flex-wrap items-stretch md:items-end text-xs font-mono text-black shadow-sm">
          {/* Search Input */}
          <div className="flex-grow min-w-[200px]">
            <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ CERCA ]</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca attività, cliente o descrizione..."
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
            />
          </div>

          {/* Client Filter Dropdown */}
          <div className="w-full md:w-[220px] shrink-0">
            <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ CLIENTE / PROGETTO ]</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
            >
              <option value="">Tutti</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Response Filter Dropdown */}
          <div className="w-full md:w-[180px] shrink-0">
            <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ COMPETENZA RISPOSTA ]</label>
            <select
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
            >
              <option value="ALL">Tutti</option>
              <option value="1">Spetta a me</option>
              <option value="2">Attesa risposta</option>
              <option value="0">Nessuno</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="w-full md:w-auto shrink-0 flex items-end">
            <button
              onClick={() => fetchStartups()}
              className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 border border-black/10 rounded-lg px-4 py-2 text-gray-600 hover:text-black transition-all cursor-pointer uppercase font-bold text-[10px] flex items-center justify-center gap-1.5"
              title="Aggiorna dati"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Aggiorna
            </button>
          </div>

        </div>

        {/* Main Board Area */}
        <div className="relative z-10 flex-grow">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-xs font-mono text-gray-450 uppercase">
              <span className="h-6 w-6 border-2 border-[#11BCEC] border-t-transparent rounded-full animate-spin"></span>
              <span>Caricamento attività...</span>
            </div>
          ) : filteredStartups.length === 0 ? (
            <div className="p-20 text-center border border-dashed border-black/10 rounded-xl text-xs font-mono text-gray-450 uppercase">
              [ NESSUNA ATTIVITÀ DI STARTUP CORRISPONDENTE ]
            </div>
          ) : (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {columns.map((col) => {
                const columnActivities = filteredStartups.filter((s) => s.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col bg-slate-50/50 border border-black/[0.03] rounded-2xl p-3 min-w-0 shadow-xs min-h-[500px]">
                    {/* Column Header */}
                    <div className="flex justify-between items-center py-2.5 px-3 bg-white border border-black/[0.05] rounded-xl font-sans text-xs shadow-xs mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          col.id === 'NUOVO' ? 'bg-blue-500' :
                          col.id === 'IN_LAVORAZIONE' ? 'bg-amber-500' :
                          col.id === 'SOSPESO' ? 'bg-slate-400' :
                          col.id === 'CONCLUSO' ? 'bg-emerald-500' :
                          'bg-red-500'
                        }`} />
                        <span className="font-extrabold text-gray-800 tracking-tight text-xs leading-tight">{col.title}</span>
                      </div>
                      <span className="bg-slate-100 font-mono font-bold px-2.5 py-0.5 rounded-lg text-slate-500 text-[10px] shrink-0">
                        {columnActivities.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1 flex-grow">
                      {columnActivities.map((startup) => {
                        const progress = getProgress(startup);
                        return (
                          <div
                            key={startup.id}
                            onClick={() => {
                              if (user.role !== 'STANDARD') {
                                setEditingMacro(startup);
                              }
                            }}
                            className={`bg-white border border-black/[0.06] hover:border-black/[0.1] hover:shadow-md p-5 rounded-2xl space-y-4 transition-all relative group shadow-xs flex flex-col justify-between ${
                              user.role !== 'STANDARD' ? 'cursor-pointer' : ''
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Header Card: Client Project & Delete */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap gap-1.5 items-center mb-1">
                                    {startup.clientProject && (
                                      <span className="inline-block bg-slate-100 text-slate-700 rounded-lg px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider truncate max-w-full">
                                        {startup.clientProject}
                                      </span>
                                    )}
                                    <TriStateSwitch
                                      value={startup.pendingResponse ?? 1}
                                      onChange={(val) => handleMacroResponseChange(startup.id, val)}
                                      readOnly={user.role === 'STANDARD'}
                                    />
                                  </div>
                                  <h3 className="text-sm font-extrabold text-gray-900 font-sans tracking-tight group-hover:text-[#004B97] transition-colors leading-snug break-words">
                                    {startup.title}
                                  </h3>
                                </div>
                                
                                {user.role !== 'STANDARD' && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingMacro(startup);
                                      }}
                                      className="text-gray-400 hover:text-blue-500 transition-colors p-1 cursor-pointer"
                                      title="Modifica attività"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMacroDelete(startup.id);
                                      }}
                                      className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                      title="Elimina startup"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Description */}
                              {startup.description && (
                                <p className="text-xs text-gray-500 leading-relaxed font-sans line-clamp-2 break-words">
                                  {startup.description}
                                </p>
                              )}

                              {/* Dates */}
                              <div className="flex items-center gap-2 text-[10px] font-sans text-gray-400 bg-slate-50 border border-black/[0.03] rounded-lg p-2.5 w-fit">
                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span className="font-semibold text-gray-600">
                                  {startup.startDate ? new Date(startup.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : 'N/D'}
                                </span>
                                <span>→</span>
                                <span className="font-semibold text-[#004B97]">
                                  {startup.targetCompleteDate ? new Date(startup.targetCompleteDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/D'}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1.5 font-sans text-[10px] bg-slate-50 border border-black/[0.03] rounded-lg p-2.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-500 tracking-wider">AVANZAMENTO</span>
                                  <span className="font-black text-[#004B97]">{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-gradient-to-r from-[#11BCEC] to-[#004B97] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>
                            </div>

                            {/* Subactivities Preview List */}
                            <div className="border-t border-black/[0.05] pt-3.5 space-y-2">
                              <div className="flex justify-between items-center font-sans text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                                <span>Sotto-attività ({startup.subactivities.length})</span>
                                {user.role !== 'STANDARD' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddingSubactivityToId(startup.id);
                                    }}
                                    className="text-[#11BCEC] hover:text-[#004B97] font-extrabold cursor-pointer text-[9px] uppercase tracking-widest"
                                  >
                                    + Aggiungi
                                  </button>
                                )}
                              </div>

                              {/* Subactivities items list */}
                              <div className="space-y-1.5 max-h-[200px] overflow-y-auto px-0.5 py-0.5">
                                {startup.subactivities.map((sub) => (
                                  <div
                                    key={sub.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSubactivity(sub);
                                    }}
                                    className="bg-white hover:bg-gray-50 border border-black/[0.05] rounded-lg px-3 py-2 flex items-start gap-2 cursor-pointer group/item transition-all hover:shadow-xs"
                                  >
                                    {/* Icona di stato */}
                                    <span className="shrink-0 mt-0.5">
                                      {sub.status === 'COMPLETATA' ? (
                                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      ) : sub.status === 'IN_CORSO' ? (
                                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <circle cx="12" cy="12" r="9" />
                                          <path d="M12 6v6l4 2" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <circle cx="12" cy="12" r="9" />
                                        </svg>
                                      )}
                                    </span>

                                    {/* Testo */}
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <p className="text-[11px] font-semibold text-gray-800 group-hover/item:text-[#004B97] leading-snug line-clamp-2 transition-colors">
                                        {sub.title}
                                      </p>
                                      {sub.responsible && (
                                        <p className="text-[9px] text-gray-400 font-mono mt-0.5 truncate uppercase">
                                          {sub.responsible.name}
                                        </p>
                                      )}
                                    </div>

                                    {/* Micro badge stato */}
                                    <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase ${
                                      sub.status === 'DA_FARE' ? 'bg-red-50 text-red-600' :
                                      sub.status === 'IN_CORSO' ? 'bg-amber-50 text-amber-700' :
                                      'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {sub.status === 'DA_FARE' ? '●' : sub.status === 'IN_CORSO' ? '●' : '●'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Quick Status Mover Dropdown */}
                            {user.role !== 'STANDARD' && (
                               <div className="border-t border-black/[0.05] pt-3 mt-3">
                                 <div className="flex justify-between items-center text-[10px] font-sans">
                                   <span className="text-gray-400 font-bold tracking-wider uppercase">Stato</span>
                                   <select
                                     value={startup.status}
                                     onClick={(e) => e.stopPropagation()}
                                     onChange={(e) => handleMacroStatusChange(startup.id, e.target.value as StartupActivity['status'])}
                                     className="bg-slate-50 hover:bg-slate-100 border border-black/10 rounded-lg px-2.5 py-1 text-black font-semibold focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/30 focus:border-[#11BCEC] transition-all cursor-pointer text-[10px]"
                                   >
                                     <option value="NUOVO">Nuovo</option>
                                     <option value="IN_LAVORAZIONE">In Corso</option>
                                     <option value="SOSPESO">Sospeso</option>
                                     <option value="CONCLUSO">Concluso</option>
                                     <option value="ANNULLATO">Annullato</option>
                                   </select>
                                 </div>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* QUICK ADD SUBACTIVITY OVERLAY PANEL */}
      {addingSubactivityToId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-black/10 rounded-xl overflow-hidden shadow-xl p-6 font-sans text-black animate-fadeIn">
            <h4 className="text-sm font-bold uppercase text-black font-mono tracking-wider border-b border-black/10 pb-3 mb-4">
              [ AGGIUNGI SOTTO-ATTIVITÀ ]
            </h4>
            <form onSubmit={(e) => handleAddSubactivitySubmit(e, addingSubactivityToId)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  required
                  value={newSubTitle}
                  onChange={(e) => setNewSubTitle(e.target.value)}
                  placeholder="es. Configurazione indirizzi IP"
                  className="w-full bg-white border border-black/10 rounded-lg px-4 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  placeholder="Dettagli aggiuntivi..."
                  className="w-full bg-white border border-black/10 rounded-lg px-4 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  Responsabile Assegnato
                </label>
                <select
                  value={newSubResp}
                  onChange={(e) => setNewSubResp(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                >
                  <option value="">Seleziona Operatore...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 font-mono text-xs pt-4 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setAddingSubactivityToId(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black px-4 py-2 rounded-lg cursor-pointer uppercase font-bold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-[#11BCEC] hover:bg-[#004B97] text-white px-4 py-2 rounded-lg cursor-pointer uppercase font-bold"
                >
                  Salva sotto-attività
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MACRO ACTIVITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-black/10 rounded-xl overflow-hidden shadow-xl">
            <StartupForm
              allUsers={allUsers}
              boardType={boardType}
              onSuccess={() => {
                setShowCreateModal(false);
                fetchStartups();
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* EDIT SUBACTIVITY MODAL */}
      {selectedSubactivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-black/10 rounded-xl overflow-hidden shadow-xl">
            <SubactivityEditModal
              subactivity={selectedSubactivity}
              allUsers={allUsers}
              onSuccess={() => {
                setSelectedSubactivity(null);
                fetchStartups();
              }}
              onCancel={() => setSelectedSubactivity(null)}
            />
          </div>
        </div>
      )}

      {/* EDIT MACRO ACTIVITY MODAL */}
      {editingMacro && (
        <MacroEditModal
          activity={editingMacro}
          onSave={handleMacroEditSubmit}
          onClose={() => setEditingMacro(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-black/10 pt-6 mt-12 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-400 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
