'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TicketFilters from '@/components/ticket-filters';
import TicketForm from '@/components/ticket-form';

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
  status: 'NUOVO' | 'IN_VALUTAZIONE' | 'RISOLTO' | 'CHIUSO' | 'NON_RISOLVIBILE' | 'ANNULLATO' | 'SOSPESO';
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'triage'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.search) queryParams.append('search', filters.search);

      const res = await fetch(`/api/tickets?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Errore durante il recupero dei ticket.');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    fetchTickets();
  }, [fetchTickets]);

  // Filter list based on active tab
  // Triage: status == 'NUOVO' and no operator assigned (or just NUOVO status)
  const displayedTickets = tickets.filter((ticket) => {
    if (activeTab === 'triage') {
      return ticket.status === 'NUOVO';
    }
    return true;
  });

  const triageCount = tickets.filter((t) => t.status === 'NUOVO').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'NUOVO' || t.status === 'IN_VALUTAZIONE').length;
  const criticalTicketsCount = tickets.filter((t) => t.priority === 'CRITICA' && t.status !== 'CHIUSO' && t.status !== 'ANNULLATO').length;

  const statusLabel = (status: Ticket['status']) => {
    const labels: Record<Ticket['status'], string> = {
      NUOVO: 'Da valutare',
      IN_VALUTAZIONE: 'In Valutazione',
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
      RISOLTO: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      CHIUSO: 'bg-gray-50 text-gray-600 border-gray-200',
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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Ticket IT</h1>
            <p className="text-sm text-gray-500 mt-1">Gestione e monitoraggio delle segnalazioni di assistenza</p>
          </div>
          <button
            id="btn-nuovo-ticket"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#004B97] hover:bg-[#003a75] text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            + Crea Ticket
          </button>
        </div>

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
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
            style={{ borderLeftColor: '#3B82F6' }}>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">BASKET TRIAGE</span>
            <div className="flex items-center justify-center gap-3 mt-3 w-full">
              <span className="text-4xl font-black text-gray-900 tracking-tight">{triageCount}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                style={{ background: '#3B82F620', color: '#1d4ed8' }}>DA VALUTARE</span>
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

          <TicketFilters onFilterChange={handleFilterChange} showStatusFilter={activeTab !== 'triage'} />

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
                      <th className="p-4">[ NUMERO ]</th>
                      <th className="p-4">[ OGGETTO / TITOLO ]</th>
                      <th className="p-4">[ CATEGORIA ]</th>
                      <th className="p-4">[ STATO ]</th>
                      <th className="p-4">[ PRIORITÀ ]</th>
                      <th className="p-4">[ DATA CREAZIONE ]</th>
                      {user.role !== 'STANDARD' && <th className="p-4">[ OPERATORE ]</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-gray-800 bg-white">
                    {displayedTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="hover:bg-black/[0.015] transition-colors cursor-pointer"
                      >
                        <td className="p-4 font-bold text-black">
                          <Link href={`/dashboard/tickets/${ticket.id}`} className="block">
                            {ticket.ticketNumber}
                          </Link>
                        </td>
                        <td className="p-4 max-w-[300px] truncate text-gray-800 font-sans font-medium">
                          <Link href={`/dashboard/tickets/${ticket.id}`} className="block">
                            <span className="flex items-center gap-1.5 truncate">
                              {ticket.isSuggestion && (
                                <span className="bg-[#11BCEC]/15 text-[#004B97] border border-[#11BCEC]/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono shrink-0 select-none" title="Suggerimento / Nuova Idea">
                                  💡 IDEA
                                </span>
                              )}
                              <span className="truncate">{ticket.title}</span>
                            </span>
                          </Link>
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

      {/* Footer */}
      <footer className="border-t border-black/10 pt-6 mt-12 flex flex-col md:flex-row justify-between items-center font-mono text-xs text-gray-400 uppercase gap-2">
        <div>SISTEMA TICKET INTERNI LOGISTICA UNO EUROPE SRL</div>
        <div>STABILIMENTO LOCALE // 2026</div>
      </footer>
    </main>
  );
}
