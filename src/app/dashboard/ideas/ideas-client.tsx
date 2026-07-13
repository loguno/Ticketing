'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'NUOVO' | 'IN_VALUTAZIONE' | 'IN_CARICO' | 'RISPOSTO' | 'RISOLTO' | 'CHIUSO' | 'NON_RISOLVIBILE' | 'ANNULLATO' | 'SOSPESO';
  priority: 'BASSA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  category: 'TMS' | 'WMS' | 'AMMINISTRATIVO' | 'ALTRO';
  origin: 'PORTALE' | 'EMAIL';
  contact: string;
  isSuggestion?: boolean;
  createdAt: string;
  operatorId: string | null;
  creator?: { name: string; email: string } | null;
  operator?: { name: string; email: string } | null;
}

interface IdeasClientProps {
  operators: Operator[];
}

export default function IdeasClient({ operators }: IdeasClientProps) {
  const [ideas, setIdeas] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchIdeas = useCallback(async () => {
    setIsLoading(true);
    try {
      // Carica solo i ticket contrassegnati come suggerimenti/idee
      const res = await fetch('/api/tickets?isSuggestion=true');
      if (!res.ok) throw new Error('Errore nel caricamento delle idee.');
      const data = await res.json();
      setIdeas(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIdeas();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchIdeas]);

  const handleStatusChange = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, sendNotification: false }),
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dello stato dell'idea.");
      fetchIdeas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  };

  const handleOperatorChange = async (ticketId: string, opId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: opId || null, sendNotification: false }),
      });
      if (!res.ok) throw new Error("Errore durante l'assegnazione dell'operatore.");
      fetchIdeas();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  };

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch =
      idea.title.toLowerCase().includes(search.toLowerCase()) ||
      idea.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      (idea.description && idea.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !categoryFilter || idea.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const columns: { id: string; title: string; color: string; bg: string; border: string; statuses: Ticket['status'][] }[] = [
    { id: 'NUOVO', title: 'Da Valutare', color: 'text-blue-700', bg: 'bg-blue-500/5', border: 'border-blue-500/20 bg-blue-50/40', statuses: ['NUOVO'] },
    { id: 'IN_VALUTAZIONE', title: 'In Valutazione', color: 'text-[#C94E03]', bg: 'bg-[#E85D04]/5', border: 'border-[#E85D04]/20 bg-amber-50/40', statuses: ['IN_VALUTAZIONE', 'IN_CARICO', 'RISPOSTO'] },
    { id: 'SOSPESO', title: 'Sospeso', color: 'text-slate-650', bg: 'bg-slate-500/5', border: 'border-slate-400/30 bg-slate-100/40', statuses: ['SOSPESO'] },
    { id: 'RISOLTO', title: 'Approvato/Completato', color: 'text-emerald-700', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20 bg-emerald-50/40', statuses: ['RISOLTO', 'CHIUSO'] },
    { id: 'ANNULLATO', title: 'Respinto/Annullato', color: 'text-red-700', bg: 'bg-red-500/5', border: 'border-red-500/20 bg-red-50/40', statuses: ['ANNULLATO', 'NON_RISOLVIBILE'] },
  ];

  const priorityStyles = (priority: Ticket['priority']) => {
    const styles: Record<Ticket['priority'], string> = {
      BASSA: 'text-gray-500 border-black/5 bg-black/[0.01]',
      MEDIA: 'text-cyan-700 border-cyan-500/25 bg-cyan-50/50',
      ALTA: 'text-[#C94E03] border-orange-500/25 bg-orange-50/50',
      CRITICA: 'text-red-700 border-red-500/25 bg-red-50/50 animate-pulse',
    };
    return styles[priority] || 'text-gray-500 border-black/5 bg-black/[0.01]';
  };

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Operativo</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Nuove Idee e Suggerimenti</h1>
            <p className="text-sm text-gray-500 mt-1">Raccolta e coordinamento delle proposte di miglioramento</p>
          </div>
        </div>

        {/* KPI metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 font-mono text-xs uppercase">
          
          {/* Card 1: TOTALI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#9ca3af' }}>
            <span className="text-xs font-bold text-gray-500 tracking-wider text-center w-full">TOTALI PROPOSTE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{ideas.length}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 bg-slate-100 text-slate-700">IDEE</span>
            </div>
          </div>
  
          {/* Card 2: DA VALUTARE */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#3B82F6' }}>
            <span className="text-xs font-bold text-gray-500 tracking-wider text-center w-full">DA VALUTARE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {ideas.filter((s) => s.status === 'NUOVO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 bg-blue-50 text-blue-700">ATTESA</span>
            </div>
          </div>
  
          {/* Card 3: IN VALUTAZIONE */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#E85D04' }}>
            <span className="text-xs font-bold text-gray-500 tracking-wider text-center w-full">IN ESAME</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {ideas.filter((s) => s.status === 'IN_VALUTAZIONE').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 bg-orange-50 text-[#C94E03]">STUDIO</span>
            </div>
          </div>

          {/* Card 4: SOSPESI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#64748b' }}>
            <span className="text-xs font-bold text-gray-500 tracking-wider text-center w-full">SOSPESE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {ideas.filter((s) => s.status === 'SOSPESO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 bg-slate-100 text-slate-700">PAUSA</span>
            </div>
          </div>
  
          {/* Card 5: APPROVATI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-5 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#10B981' }}>
            <span className="text-xs font-bold text-gray-500 tracking-wider text-center w-full">APPROVATE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {ideas.filter((s) => s.status === 'RISOLTO' || s.status === 'CHIUSO').length}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 bg-emerald-50 text-emerald-700">FATTO</span>
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
              placeholder="Cerca per numero, oggetto o descrizione..."
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-[220px] shrink-0">
            <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ CATEGORIA ]</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
            >
              <option value="">Tutte</option>
              <option value="TMS">TMS</option>
              <option value="WMS">WMS</option>
              <option value="AMMINISTRATIVO">Amministrativo</option>
              <option value="ALTRO">Altro</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="w-full md:w-auto shrink-0 flex items-end">
            <button
              onClick={() => fetchIdeas()}
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
              <span>Caricamento proposte...</span>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <div className="p-20 text-center border border-dashed border-black/10 rounded-xl text-xs font-mono text-gray-450 uppercase">
              [ NESSUN SUGGERIMENTO TROVATO ]
            </div>
          ) : (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
              {columns.map((col) => {
                const columnIdeas = filteredIdeas.filter((idea) => col.statuses.includes(idea.status));
                return (
                  <div key={col.id} className="flex flex-col bg-slate-50/50 border border-black/[0.03] rounded-2xl p-3 min-w-0 shadow-xs min-h-[500px]">
                    
                    {/* Column Header */}
                    <div className="flex justify-between items-center py-2.5 px-3 bg-white border border-black/[0.05] rounded-xl font-sans text-xs shadow-xs mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          col.id === 'NUOVO' ? 'bg-blue-500' :
                          col.id === 'IN_VALUTAZIONE' ? 'bg-amber-500' :
                          col.id === 'SOSPESO' ? 'bg-slate-400' :
                          col.id === 'RISOLTO' ? 'bg-emerald-500' :
                          'bg-red-500'
                        }`} />
                        <span className="font-extrabold text-gray-800 tracking-tight truncate">{col.title}</span>
                      </div>
                      <span className="bg-slate-100 font-mono font-bold px-2.5 py-0.5 rounded-lg text-slate-500 text-[10px] shrink-0">
                        {columnIdeas.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1 flex-grow">
                      {columnIdeas.map((idea) => {
                        return (
                          <div
                            key={idea.id}
                            className="bg-white border border-black/[0.06] hover:border-black/[0.1] hover:shadow-md p-4 rounded-2xl space-y-3.5 transition-all group shadow-xs flex flex-col justify-between"
                          >
                            <div className="space-y-2.5">
                              {/* Card Header: Number & Category */}
                              <div className="flex justify-between items-start gap-2">
                                <Link
                                  href={`/dashboard/tickets/${idea.id}`}
                                  className="text-[10px] font-mono font-extrabold text-[#004B97] hover:underline"
                                >
                                  {idea.ticketNumber}
                                </Link>
                                <span className="inline-block bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                  {idea.category}
                                </span>
                              </div>

                              {/* Title */}
                              <h3 className="text-xs font-extrabold text-gray-900 font-sans tracking-tight group-hover:text-[#004B97] transition-colors leading-snug break-words">
                                <Link href={`/dashboard/tickets/${idea.id}`}>
                                  {idea.title}
                                </Link>
                              </h3>

                              {/* Description snippet */}
                              {idea.description && (
                                <p className="text-[11px] text-gray-500 leading-relaxed font-sans line-clamp-2 break-words">
                                  {idea.description}
                                </p>
                              )}

                              {/* Priority & Date */}
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-sans">
                                <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold ${priorityStyles(idea.priority)}`}>
                                  {idea.priority}
                                </span>
                                <span className="text-gray-400 font-mono">
                                  {new Date(idea.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>

                            {/* Operator dropdown & Status selectors */}
                            <div className="border-t border-black/[0.05] pt-3 mt-3.5 space-y-2 text-[9px] font-sans">
                              {/* Operator select */}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-bold uppercase tracking-wider">Gestore</span>
                                <select
                                  value={idea.operatorId || ''}
                                  onChange={(e) => handleOperatorChange(idea.id, e.target.value)}
                                  className="bg-slate-50 border border-black/10 rounded px-1.5 py-0.5 text-black font-semibold focus:outline-none transition-all cursor-pointer text-[9px] max-w-[120px] truncate"
                                >
                                  <option value="">Nessuno</option>
                                  {operators.map((op) => (
                                    <option key={op.id} value={op.id}>
                                      {op.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Status select */}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-bold uppercase tracking-wider">Stato</span>
                                <select
                                  value={idea.status}
                                  onChange={(e) => handleStatusChange(idea.id, e.target.value as Ticket['status'])}
                                  className="bg-slate-50 border border-black/10 rounded px-1.5 py-0.5 text-black font-semibold focus:outline-none transition-all cursor-pointer text-[9px]"
                                >
                                  <option value="NUOVO">Da valutare</option>
                                  <option value="IN_VALUTAZIONE">In Esame</option>
                                  <option value="SOSPESO">Sospeso</option>
                                  <option value="RISOLTO">Approvato</option>
                                  <option value="CHIUSO">Chiuso</option>
                                  <option value="ANNULLATO">Annullato</option>
                                  <option value="NON_RISOLVIBILE">Non Risolvibile</option>
                                </select>
                              </div>
                            </div>

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

      {/* Footer */}
      <footer className="border-t border-black/10 pt-6 mt-12 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-400 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
