'use client';
 
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import TicketFilters from '@/components/ticket-filters';
import TicketForm from '@/components/ticket-form';
import AdminDeleteModal from '@/components/admin-delete-modal';

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
  creator?: { name: string; email: string };
  operator?: { name: string; email: string };
}

interface TicketsClientProps {
  user: UserInfo;
}

export default function TicketsClient({ user }: TicketsClientProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'triage'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Admin bulk delete state
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleteSuccess, setBulkDeleteSuccess] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
    responseStatus: '',
  });

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets`);
      if (!res.ok) throw new Error('Errore durante il recupero dei ticket.');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const handleFilterChange = useCallback((newFilters: {
    status: string;
    priority: string;
    category: string;
    search: string;
    responseStatus: string;
  }) => {
    setFilters(newFilters);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    fetchTickets();
  }, [fetchTickets]);

  // Filter list based on active tab and search filters client-side
  const displayedTickets = tickets.filter((ticket) => {
    // 1. activeTab filtering (triage tab shows only NUOVO)
    if (activeTab === 'triage') {
      return ticket.status === 'NUOVO';
    }

    // 2. filters.status
    if (filters.status && ticket.status !== filters.status) {
      return false;
    }

    // 3. filters.priority
    if (filters.priority && ticket.priority !== filters.priority) {
      return false;
    }

    // 4. filters.category
    if (filters.category && ticket.category !== filters.category) {
      return false;
    }

    // 5. filters.search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchNumber = ticket.ticketNumber.toLowerCase().includes(searchLower);
      const matchTitle = ticket.title.toLowerCase().includes(searchLower);
      const matchDesc = ticket.description.toLowerCase().includes(searchLower);
      if (!matchNumber && !matchTitle && !matchDesc) {
        return false;
      }
    }

    // 6. filters.responseStatus
    if (filters.responseStatus) {
      const isPendingMe = ticket.status === 'NUOVO' || ticket.status === 'IN_VALUTAZIONE' || ticket.status === 'IN_CARICO';
      const isPendingThem = ticket.status === 'RISPOSTO';
      const isPendingNone = !isPendingMe && !isPendingThem;
      
      const targetStatus = filters.responseStatus;
      if (targetStatus === '1' && !isPendingMe) return false;
      if (targetStatus === '2' && !isPendingThem) return false;
      if (targetStatus === '0' && !isPendingNone) return false;
    }

    return true;
  });

  const isAllSelected =
    displayedTickets.length > 0 && displayedTickets.every((t) => selectedTicketIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(displayedTickets.map((t) => t.id));
    }
  };

  const handleToggleSelectTicket = (id: string) => {
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTicketIds.length === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTicketIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l\'eliminazione dei ticket.');
      }
      const count = data.count ?? selectedTicketIds.length;
      setSelectedTicketIds([]);
      setShowBulkDeleteModal(false);
      setBulkDeleteSuccess(`${count} ticket eliminati definitivamente.`);
      setTimeout(() => setBulkDeleteSuccess(null), 5000);
      await fetchTickets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore imprevisto.';
      setBulkDeleteError(msg);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const triageCount = tickets.filter((t) => t.status === 'NUOVO').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'NUOVO' || t.status === 'IN_VALUTAZIONE' || t.status === 'IN_CARICO' || t.status === 'RISPOSTO' || t.status === 'SOSPESO').length;
  const criticalTicketsCount = tickets.filter((t) => t.priority === 'CRITICA' && t.status !== 'CHIUSO' && t.status !== 'ANNULLATO').length;

  const statusLabel = (status: Ticket['status']) => {
    const labels: Record<Ticket['status'], string> = {
      NUOVO: 'Da valutare',
      IN_VALUTAZIONE: 'In Valutazione',
      IN_CARICO: 'In Carico',
      RISPOSTO: 'Risposto',
      RISOLTO: 'Risolto',
      CHIUSO: 'Chiuso',
      NON_RISOLVIBILE: 'Non Risolvibile',
      ANNULLATO: 'Annullato',
      SOSPESO: 'Sospeso',
    };
    return labels[status] || status;
  };

  const statusStyles = (status: Ticket['status']) => {
    const styles: Record<Ticket['status'], string> = {
      NUOVO: 'bg-blue-50 text-blue-750 border-blue-200/50',
      IN_VALUTAZIONE: 'bg-[#E85D04]/5 text-[#C94E03] border-[#E85D04]/20',
      IN_CARICO: 'bg-amber-50 text-amber-800 border-amber-200/50',
      RISPOSTO: 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
      RISOLTO: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      CHIUSO: 'bg-gray-50 text-gray-650 border-gray-200',
      NON_RISOLVIBILE: 'bg-gray-100 text-gray-500 border-gray-300',
      ANNULLATO: 'bg-red-50 text-red-700 border-red-200/50',
      SOSPESO: 'bg-slate-50 text-slate-700 border-slate-200',
    };
    return styles[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const priorityLabel = (priority: Ticket['priority']) => {
    const labels: Record<Ticket['priority'], string> = {
      BASSA: 'Bassa',
      MEDIA: 'Media',
      ALTA: 'Alta',
      CRITICA: 'Critica',
    };
    return labels[priority] || priority;
  };

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
      {/* Container */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Operativo</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ticket</h1>
            <p className="text-sm text-gray-500 mt-1">Gestione e monitoraggio delle segnalazioni di assistenza</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('open-ai-assistant', { detail: { prompt: 'Genera To-Do di Oggi' } })
                  );
                }
              }}
              className="flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-amber-300 hover:text-amber-200 text-sm font-bold px-4 py-3 rounded-xl transition-all shadow-sm border border-slate-700/80 cursor-pointer"
              title="Apri l'Assistente AI per consultare il Briefing e le priorità del giorno"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Briefing AI</span>
            </button>
            <button
              id="btn-nuovo-ticket"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#004B97] hover:bg-[#003a75] text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              + Crea Ticket
            </button>
          </div>
        </div>

        {/* Flashing Alert Banner for Support Team */}
        {user.role !== 'STANDARD' && triageCount > 0 && (
          <div className="bg-[#FEF2F2] border-2 border-red-250 rounded-2xl p-4 flex items-center justify-between shadow-xs border-l-8 border-l-[#EF4444] animate-pulse">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
              </span>
              <div className="text-sm font-sans font-medium text-red-900">
                ATTENZIONE: Ci sono <span className="font-extrabold text-red-700">{triageCount}</span> nuovi ticket da valutare nel Basket Triage.
              </div>
            </div>
            {activeTab !== 'triage' && (
              <button 
                onClick={() => setActiveTab('triage')}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-xs cursor-pointer uppercase font-mono tracking-wider border-0"
              >
                Vai al Triage
              </button>
            )}
          </div>
        )}

        {/* Mockup-style KPI metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs uppercase">
          
          {/* Card 1: TUTTI I SEGNALATI */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#9ca3af' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">TUTTI I SEGNALATI</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{tickets.length}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#9ca3af20', color: '#4b5563' }}>TOTALI</span>
            </div>
          </div>
 
          {/* Card 2: BASKET TRIAGE */}
          <div className={`bg-white rounded-2xl border p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4 ${
            triageCount > 0 
              ? 'border-red-200 ring-2 ring-red-500/10' 
              : 'border-black/[0.07]'
          }`}
            style={{ borderLeftColor: triageCount > 0 ? '#EF4444' : '#3B82F6' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full flex items-center justify-center gap-1.5">
              {triageCount > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
              BASKET TRIAGE
            </span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className={`text-4xl font-black tracking-tight ${triageCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{triageCount}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ 
                  background: triageCount > 0 ? '#EF444415' : '#3B82F620', 
                  color: triageCount > 0 ? '#DC2626' : '#1d4ed8' 
                }}>[ {triageCount > 0 ? 'NUOVI' : 'DA VALUTARE'} ]</span>
            </div>
          </div>

          {/* Card 3: TICKET IN CORSO */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#11BCEC' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">TICKET IN CORSO</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{openTicketsCount}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#11BCEC20', color: '#004B97' }}>ATTIVI</span>
            </div>
          </div>
 
          {/* Card 4: PRIORITÀ CRITICA */}
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#EF4444' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">PRIORITÀ CRITICA</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{criticalTicketsCount}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#EF444420', color: '#dc2626' }}>URGENTI</span>
            </div>
          </div>

        </div>

        {/* Tab & Filters wrapper */}
        <div className="space-y-4">
          
          {/* Tabs for Admin/Helpdesk */}
          {user.role !== 'STANDARD' && (
            <div className="flex border-b border-black/10 font-mono text-xs uppercase">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-3 px-4 border-b-2 font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'border-[#004B97] text-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Tutti i Ticket
              </button>
              <button
                onClick={() => setActiveTab('triage')}
                className={`pb-3 px-4 border-b-2 font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'triage'
                    ? 'border-[#004B97] text-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>Basket Triage (Da valutare)</span>
                {triageCount > 0 && (
                  <span className="bg-[#11BCEC] text-white text-[10px] px-1.5 py-0.5 rounded font-mono animate-pulse">
                    {triageCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-grow">
              <TicketFilters onFilterChange={handleFilterChange} showStatusFilter={activeTab !== 'triage'} showResponseFilter={user.role !== 'STANDARD'} />
            </div>
            <button
              onClick={() => fetchTickets()}
              className="bg-white hover:bg-gray-50 border border-black/10 rounded-xl px-4 py-2.5 text-gray-655 hover:text-black font-mono text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 h-[38px] shrink-0 shadow-xs"
              title="Aggiorna dati"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Aggiorna</span>
            </button>
          </div>

          {/* Admin Bulk Action Bar */}
          {user.role === 'ADMIN' && selectedTicketIds.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700 font-black font-mono text-xs shrink-0">
                  {selectedTicketIds.length}
                </span>
                <div>
                  <p className="text-xs font-mono font-bold uppercase text-red-950">
                    {selectedTicketIds.length === 1
                      ? '1 Ticket selezionato'
                      : `${selectedTicketIds.length} Ticket selezionati`}
                  </p>
                  <p className="text-[11px] text-red-700/80">
                    Operazione amministrativa di pulizia archivio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedTicketIds([])}
                  className="px-3.5 py-2 text-xs font-mono font-bold uppercase text-gray-650 hover:text-black bg-white hover:bg-gray-100 border border-black/10 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  Deseleziona
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  <span>Elimina selezionati ({selectedTicketIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 text-xs font-mono text-gray-450 uppercase">
                <span className="h-6 w-6 border-2 border-[#11BCEC] border-t-transparent rounded-full animate-spin"></span>
                <span>Caricamento dati...</span>
              </div>
            ) : displayedTickets.length === 0 ? (
              <div className="p-20 text-center text-xs font-mono text-gray-450 uppercase">
                [ NESSUN TICKET TROVATO CORRISPONDENTE AI FILTRI ]
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono text-black">
                  <thead>
                    <tr className="border-b border-black/15 text-gray-500 uppercase tracking-wider bg-gray-50/75">
                      {user.role === 'ADMIN' && (
                        <th className="p-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                            title="Seleziona tutti i ticket visualizzati"
                          />
                        </th>
                      )}
                      <th className="p-4">[ NUMERO ]</th>
                      <th className="p-4">[ OGGETTO / TITOLO ]</th>
                      <th className="p-4">[ CATEGORIA ]</th>
                      <th className="p-4">[ STATO ]</th>
                      {user.role !== 'STANDARD' && <th className="p-4">[ RISPOSTA ]</th>}
                      <th className="p-4">[ PRIORITÀ ]</th>
                      <th className="p-4">[ DATA CREAZIONE ]</th>
                      {user.role !== 'STANDARD' && <th className="p-4">[ OPERATORE ]</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-gray-800 bg-white">
                    {displayedTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                        className={`hover:bg-black/[0.015] transition-colors cursor-pointer ${
                          selectedTicketIds.includes(ticket.id) ? 'bg-red-50/30' : ''
                        }`}
                      >
                        {user.role === 'ADMIN' && (
                          <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedTicketIds.includes(ticket.id)}
                              onChange={() => handleToggleSelectTicket(ticket.id)}
                              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                              title={`Seleziona ${ticket.ticketNumber}`}
                            />
                          </td>
                        )}
                        <td className="p-4 font-bold text-black">
                          {ticket.ticketNumber}
                        </td>
                        <td className="p-4 max-w-[300px] truncate text-gray-800 font-sans font-medium">
                          <span className="flex items-center gap-1.5 truncate">
                            {ticket.isSuggestion && (
                              <span className="bg-[#11BCEC]/15 text-[#004B97] border border-[#11BCEC]/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono shrink-0 select-none" title="Suggerimento / Nuova Idea">
                                💡 IDEA
                              </span>
                            )}
                            <span className="truncate">{ticket.title}</span>
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="border border-black/5 bg-gray-100 text-gray-650 px-2.5 py-0.5 rounded text-[10px]">
                            {ticket.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`border px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${statusStyles(ticket.status)}`}>
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        {user.role !== 'STANDARD' && (
                          <td className="p-4">
                            <TriStateSwitch
                              value={
                                (ticket.status === 'NUOVO' || ticket.status === 'IN_VALUTAZIONE' || ticket.status === 'IN_CARICO') ? 1 :
                                ticket.status === 'RISPOSTO' ? 2 : 0
                              }
                              readOnly={true}
                            />
                          </td>
                        )}
                        <td className="p-4">
                          <span className={`border px-2 py-0.5 rounded text-[10px] font-bold ${priorityStyles(ticket.priority)}`}>
                            {priorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">
                          {new Date(ticket.createdAt).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        {user.role !== 'STANDARD' && (
                          <td className="p-4">
                            {ticket.operator ? (
                              <span className="text-[#004B97] font-bold">{ticket.operator.name}</span>
                            ) : (
                              <span className="text-red-700 bg-red-50 border border-red-200/50 px-2 py-0.5 rounded text-[10px] font-bold">
                                Non Assegnato
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Creation Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-black/10 rounded-xl overflow-hidden shadow-xl">
            <TicketForm
              userEmail={user.email}
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Delete Success Notification */}
      {bulkDeleteSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-[#10B981] text-white px-5 py-4 rounded-xl shadow-lg flex items-center gap-3 font-sans text-xs border border-emerald-500/30 transition-all duration-300 animate-fadeIn">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-bold leading-tight uppercase tracking-wider">{bulkDeleteSuccess}</span>
        </div>
      )}

      {/* Admin Bulk Delete Modal */}
      {user.role === 'ADMIN' && (
        <AdminDeleteModal
          isOpen={showBulkDeleteModal}
          onClose={() => {
            if (!isBulkDeleting) {
              setShowBulkDeleteModal(false);
              setBulkDeleteError(null);
            }
          }}
          onConfirm={handleBulkDelete}
          isDeleting={isBulkDeleting}
          title={`Eliminazione definitiva di ${selectedTicketIds.length} ${selectedTicketIds.length === 1 ? 'ticket' : 'ticket'}`}
          description={`Stai per eliminare ${selectedTicketIds.length} ticket selezionati. Tutti i record, i messaggi/note interne e tutti gli allegati salvati fisicamente su server verranno rimossi per sempre.`}
          ticketNumbers={tickets.filter((t) => selectedTicketIds.includes(t.id)).map((t) => t.ticketNumber)}
          errorMessage={bulkDeleteError}
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
