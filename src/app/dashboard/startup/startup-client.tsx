'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StartupForm from '@/components/startup-form';
import SubactivityEditModal from '@/components/subactivity-edit-modal';

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
  status: 'NUOVO' | 'IN_LAVORAZIONE' | 'CONCLUSO';
  createdAt: string;
  subactivities: Subactivity[];
}

interface StartupClientProps {
  user: UserInfo;
  allUsers: UserInfo[];
}

export default function StartupClient({ user, allUsers }: StartupClientProps) {
  const [startups, setStartups] = useState<StartupActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubactivity, setSelectedSubactivity] = useState<Subactivity | null>(null);
  
  // Modals for adding subactivity on the fly
  const [addingSubactivityToId, setAddingSubactivityToId] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubResp, setNewSubResp] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const fetchStartups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/startup');
      if (!res.ok) throw new Error('Errore durante il caricamento dei dati.');
      const data = await res.json();
      setStartups(data.startups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

    return matchesSearch && matchesClient;
  });

  // Kanban Columns
  const columns: { id: StartupActivity['status']; title: string; color: string; bg: string; border: string }[] = [
    { id: 'NUOVO', title: 'Da avviare (Nuovo)', color: 'text-blue-700', bg: 'bg-blue-500/5', border: 'border-blue-500/20 bg-blue-50/40' },
    { id: 'IN_LAVORAZIONE', title: 'In Corso (Lavorazione)', color: 'text-[#C94E03]', bg: 'bg-[#E85D04]/5', border: 'border-[#E85D04]/20 bg-amber-50/40' },
    { id: 'CONCLUSO', title: 'Completato (Concluso)', color: 'text-emerald-700', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20 bg-emerald-50/40' },
  ];

  return (
    <main className="flex-grow p-6 md:p-12 flex flex-col justify-between font-sans bg-[#F5F0EB]">
      {/* Container */}
      <div className="max-w-7xl w-full mx-auto space-y-8">
        
        {/* Breadcrumb Header */}
        <div className="flex justify-between items-center border-b border-black/10 pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <span>Dashboard</span>
            <span className="text-gray-400">&bull;</span>
            <span className="text-[#004B97] font-bold">Start Up IT</span>
          </div>

          {user.role !== 'STANDARD' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              + Crea Start Up
            </button>
          )}
        </div>

        {/* Mockup-style KPI metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs uppercase">
          
          <div className="bg-white border border-black/10 border-l-4 border-l-gray-400 rounded-xl p-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">TOTALE PROGETTI</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">{startups.length}</span>
              <span className="text-[9px] text-gray-400">TOTALI</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#3B82F6] rounded-xl p-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">DA AVVIARE</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">
                {startups.filter((s) => s.status === 'NUOVO').length}
              </span>
              <span className="text-[9px] text-blue-600 font-bold">NUOVI</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#11BCEC] rounded-xl p-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">IN CORSO</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">
                {startups.filter((s) => s.status === 'IN_LAVORAZIONE').length}
              </span>
              <span className="text-[9px] text-[#004B97] font-bold">ATTIVI</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#10B981] rounded-xl p-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">COMPLETATI</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">
                {startups.filter((s) => s.status === 'CONCLUSO').length}
              </span>
              <span className="text-[9px] text-emerald-600 font-bold">CONCLUSI</span>
            </div>
          </div>

        </div>

        {/* Filters and Views Bar */}
        <div className="my-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-grow">
            {/* Search Input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca attività, cliente o descrizione..."
              className="bg-white border border-black/10 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all min-w-[240px] flex-grow sm:flex-grow-0"
            />

            {/* Client Filter Dropdown */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
            >
              <option value="">Tutti i Clienti/Progetti</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex bg-white border border-black/10 p-1 rounded-lg self-end sm:self-auto uppercase tracking-wide">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#11BCEC] text-white font-bold' : 'text-gray-500 hover:text-black'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-[#11BCEC] text-white font-bold' : 'text-gray-500 hover:text-black'
              }`}
            >
              Tabella
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
          ) : viewMode === 'kanban' ? (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {columns.map((col) => {
                const columnActivities = filteredStartups.filter((s) => s.status === col.id);
                return (
                  <div key={col.id} className="flex flex-col space-y-4 min-w-0">
                    {/* Column Header */}
                    <div className={`p-4 rounded-xl border ${col.border} flex justify-between items-center font-mono text-xs uppercase shadow-xs`}>
                      <span className={`font-bold ${col.color}`}>{col.title}</span>
                      <span className="bg-black/5 border border-black/10 px-2 py-0.5 rounded text-gray-500">
                        {columnActivities.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                      {columnActivities.map((startup) => {
                        const progress = getProgress(startup);
                        return (
                          <div
                            key={startup.id}
                            className="bg-white border border-black/10 hover:border-black/15 p-5 rounded-xl space-y-4 transition-all relative group shadow-xs"
                          >
                            {/* Card Title & Delete */}
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                {startup.clientProject && (
                                  <span className="inline-block bg-black/5 border border-black/10 rounded px-2 py-0.5 text-[9px] font-mono text-gray-500 uppercase mb-1 truncate max-w-full">
                                    {startup.clientProject}
                                  </span>
                                )}
                                <h3 className="text-sm font-bold text-black font-sans tracking-tight group-hover:text-[#004B97] transition-colors leading-tight truncate">
                                  {startup.title}
                                </h3>
                              </div>
                              
                              {user.role !== 'STANDARD' && (
                                <button
                                  onClick={() => handleMacroDelete(startup.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                                  title="Elimina startup"
                                >
                                  <svg xmlns="http://www.w3.org/2500/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Description */}
                            {startup.description && (
                              <p className="text-xs text-gray-650 leading-relaxed font-sans line-clamp-2 break-words">
                                {startup.description}
                              </p>
                            )}

                            {/* Date Range */}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                              <span>DAL: {startup.startDate ? new Date(startup.startDate).toLocaleDateString('it-IT') : 'N/D'}</span>
                              <span>&bull;</span>
                              <span>AL: {startup.targetCompleteDate ? new Date(startup.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}</span>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1.5 font-mono text-[10px]">
                              <div className="flex justify-between items-center text-gray-400">
                                <span>PROGRESSO AVANZAMENTO</span>
                                <span className="font-bold text-[#11BCEC]">{progress}%</span>
                              </div>
                              <div className="w-full bg-black/5 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-[#11BCEC] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>

                            {/* Subactivities Preview List */}
                            <div className="border-t border-black/5 pt-3 space-y-2">
                              <div className="flex justify-between items-center font-mono text-[9px] text-gray-400 uppercase tracking-wide">
                                <span>Sotto-attività ({startup.subactivities.length})</span>
                                {user.role !== 'STANDARD' && (
                                  <button
                                    onClick={() => setAddingSubactivityToId(startup.id)}
                                    className="text-[#11BCEC] hover:text-[#004B97] font-bold cursor-pointer"
                                  >
                                    + AGGIUNGI
                                  </button>
                                )}
                              </div>

                              {/* Subactivities items list */}
                              <div className="space-y-1.5">
                                {startup.subactivities.map((sub) => {
                                  const subCol = {
                                    DA_FARE: 'bg-red-50 text-red-700 border-red-200/50',
                                    IN_CORSO: 'bg-blue-50 text-blue-700 border-blue-200/50',
                                    COMPLETATA: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
                                  }[sub.status];

                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() => setSelectedSubactivity(sub)}
                                      className="bg-gray-50/50 hover:bg-gray-100 border border-black/5 rounded px-2.5 py-1.5 flex justify-between items-center text-[10px] cursor-pointer group/item transition-colors min-w-0 gap-2"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <span className="text-gray-800 font-sans group-hover/item:text-[#004B97] transition-colors font-medium block truncate">
                                          {sub.title}
                                        </span>
                                        {sub.responsible && (
                                          <span className="block text-[8px] text-gray-400 font-mono truncate">
                                            RESP: {sub.responsible.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 border ${subCol}`}>
                                        {sub.status === 'DA_FARE' ? 'Da fare' : sub.status === 'IN_CORSO' ? 'In corso' : 'Completata'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Quick Status Mover Dropdown */}
                            {user.role !== 'STANDARD' && (
                              <div className="border-t border-black/5 pt-3 flex justify-between items-center font-mono text-[9px]">
                                <span className="text-gray-400 uppercase">CAMBIA STATO MACRO</span>
                                <select
                                  value={startup.status}
                                  onChange={(e) => handleMacroStatusChange(startup.id, e.target.value as StartupActivity['status'])}
                                  className="bg-white border border-black/10 rounded px-1.5 py-1 text-black focus:outline-none cursor-pointer"
                                >
                                  <option value="NUOVO">Nuovo</option>
                                  <option value="IN_LAVORAZIONE">In Corso</option>
                                  <option value="CONCLUSO">Concluso</option>
                                </select>
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
          ) : (
            /* TABELLARE / LIST VIEW GROUPED BY CLIENT */
            <div className="bg-white border border-black/10 rounded-xl overflow-hidden font-mono text-xs shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-black">
                  <thead>
                    <tr className="border-b border-black/15 text-gray-500 uppercase tracking-wider bg-gray-50/75">
                      <th className="p-4">[ PROGETTO / CLIENTE ]</th>
                      <th className="p-4">[ ATTIVITÀ ]</th>
                      <th className="p-4">[ STATO ]</th>
                      <th className="p-4">[ PROGRESSO ]</th>
                      <th className="p-4">[ DATA INIZIO ]</th>
                      <th className="p-4">[ SCADENZA ]</th>
                      <th className="p-4">[ SOTTO-ATTIVITÀ ]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-gray-800">
                    {filteredStartups.map((startup) => {
                      const progress = getProgress(startup);
                      return (
                        <tr key={startup.id} className="hover:bg-black/[0.015] transition-colors">
                          <td className="p-4 font-bold text-gray-650 uppercase">
                            {startup.clientProject || '[ Nessuno ]'}
                          </td>
                          <td className="p-4 text-black font-sans font-bold">
                            {startup.title}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase ${
                              startup.status === 'NUOVO' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                              startup.status === 'IN_LAVORAZIONE' ? 'border-orange-200 text-[#C94E03] bg-orange-50' :
                              'border-emerald-200 text-emerald-700 bg-emerald-50'
                            }`}>
                              {startup.status === 'NUOVO' ? 'Nuovo' : startup.status === 'IN_LAVORAZIONE' ? 'In corso' : 'Concluso'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#11BCEC]">{progress}%</span>
                              <div className="w-16 bg-black/5 rounded-full h-1.5 overflow-hidden shrink-0">
                                <div className="bg-[#11BCEC] h-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-500">
                            {startup.startDate ? new Date(startup.startDate).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="p-4 text-gray-500">
                            {startup.targetCompleteDate ? new Date(startup.targetCompleteDate).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="p-4 font-bold text-[#004B97]">
                            <span>{startup.subactivities.length} definite</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

      {/* Footer */}
      <footer className="border-t border-black/10 pt-6 mt-12 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-400 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
