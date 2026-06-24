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
  status: 'NUOVO' | 'IN_VALUTAZIONE' | 'RISOLTO' | 'CHIUSO' | 'NON_RISOLVIBILE' | 'ANNULLATO';
  priority: 'BASSA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  category: 'TMS' | 'WMS' | 'AMMINISTRATIVO' | 'ALTRO';
  origin: 'PORTALE' | 'EMAIL';
  contact: string;
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
    <main className="flex-grow p-6 md:p-12 flex flex-col justify-between font-sans bg-[#F5F0EB]">
      {/* Container */}
      <div className="max-w-7xl w-full mx-auto space-y-8">
        
        {/* Breadcrumb Header */}
        <div className="flex justify-between items-center border-b border-black/10 pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <span>Dashboard</span>
            <span className="text-gray-400">&bull;</span>
            <span className="text-[#004B97] font-bold">Ticket IT</span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow-sm cursor-pointer"
          >
            + Crea Ticket
          </button>
        </div>

        {/* Mockup-style KPI metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono text-xs uppercase">
          
          <div className="bg-white border border-black/10 border-l-4 border-l-gray-400 rounded-xl py-4 px-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">TUTTI I SEGNALATI</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">{tickets.length}</span>
              <span className="text-[9px] text-gray-400">TOTALI</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#3B82F6] rounded-xl py-4 px-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">BASKET TRIAGE</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">{triageCount}</span>
              <span className="text-[9px] text-blue-600 font-bold">DA VALUTARE</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#11BCEC] rounded-xl py-4 px-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">TICKET IN CORSO</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">{openTicketsCount}</span>
              <span className="text-[9px] text-[#004B97] font-bold">ATTIVI</span>
            </div>
          </div>

          <div className="bg-white border border-black/10 border-l-4 border-l-[#EF4444] rounded-xl py-4 px-4 flex flex-col justify-between hover:border-black/20 hover:shadow-xs transition-all min-h-[90px]">
            <span className="text-[10px] font-bold text-gray-500">PRIORITÀ CRITICA</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-black">{criticalTicketsCount}</span>
              <span className="text-[9px] text-red-600 font-bold">URGENTI</span>
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
          <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-xs">
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
                            {ticket.title}
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
