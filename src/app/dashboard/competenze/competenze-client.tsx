'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Subactivity {
  id: string;
  title: string;
  status: 'DA_FARE' | 'IN_CORSO' | 'COMPLETATA';
  responsibleId?: string | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
  } | null;
  progressNotes?: string | null;
}

interface StartupActivity {
  id: string;
  title: string;
  description?: string | null;
  clientProject?: string | null;
  startDate?: string | null;
  targetCompleteDate?: string | null;
  status: 'NUOVO' | 'IN_LAVORAZIONE' | 'CONCLUSO' | 'SOSPESO' | 'ANNULLATO';
  boardType: 'STARTUP' | 'TMS' | 'WMS' | 'CROSS_DOCKING';
  pendingResponse: number;
  subactivities: Subactivity[];
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
  createdAt: string;
  creator?: { name: string; email: string } | null;
  operator?: { name: string; email: string } | null;
}

interface CompetenzeData {
  tickets: {
    spettaAMe: Ticket[];
    attesaRisposta: Ticket[];
    totalSpettaAMe: number;
    totalAttesaRisposta: number;
  };
  activities: {
    spettaAMe: StartupActivity[];
    attesaRisposta: StartupActivity[];
    totalSpettaAMe: number;
    totalAttesaRisposta: number;
  };
  counts: {
    spettaAMe: number;
    attesaRisposta: number;
  };
}

interface CompetenzeClientProps {
  user: UserInfo;
}

export default function CompetenzeClient({ user }: CompetenzeClientProps) {
  const [data, setData] = useState<CompetenzeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  const fetchCompetenze = useCallback(async () => {
    try {
      const res = await fetch('/api/competenze');
      if (!res.ok) throw new Error('Errore durante il caricamento delle competenze.');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompetenze();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCompetenze]);

  const toggleExpandActivity = (id: string) => {
    setExpandedActivities((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getProgress = (activity: StartupActivity) => {
    const total = activity.subactivities.length;
    if (total === 0) return 0;
    const completed = activity.subactivities.filter((sub) => sub.status === 'COMPLETATA').length;
    return Math.round((completed / total) * 100);
  };

  const formatBoardType = (type: StartupActivity['boardType']) => {
    const mapping = {
      STARTUP: 'Start Up',
      TMS: 'TMS',
      WMS: 'WMS',
      CROSS_DOCKING: 'Cross Docking',
    };
    return mapping[type] || type;
  };

  const getBoardHref = (type: StartupActivity['boardType']) => {
    const mapping = {
      STARTUP: '/dashboard/startup',
      TMS: '/dashboard/tms',
      WMS: '/dashboard/wms',
      CROSS_DOCKING: '/dashboard/crossdocking',
    };
    return mapping[type] || '/dashboard';
  };

  const formatTicketStatus = (status: Ticket['status']) => {
    const mapping: Record<Ticket['status'], string> = {
      NUOVO: 'Nuovo',
      IN_VALUTAZIONE: 'In Valutazione',
      IN_CARICO: 'In Carico',
      RISPOSTO: 'Risposto',
      RISOLTO: 'Risolto',
      CHIUSO: 'Chiuso',
      NON_RISOLVIBILE: 'Non Risolvibile',
      ANNULLATO: 'Annullato',
      SOSPESO: 'Sospeso',
    };
    return mapping[status] || status;
  };

  const formatPriority = (priority: Ticket['priority']) => {
    const mapping = {
      BASSA: { label: 'Bassa', style: 'bg-slate-100 text-slate-700' },
      MEDIA: { label: 'Media', style: 'bg-blue-50 text-blue-700 border-blue-100' },
      ALTA: { label: 'Alta', style: 'bg-amber-50 text-amber-800 border-amber-200' },
      CRITICA: { label: 'Critica', style: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },
    };
    return mapping[priority] || { label: priority, style: 'bg-gray-100 text-gray-700' };
  };

  if (isLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl border-4 border-t-[#004B97] border-slate-200 animate-spin"></div>
          <p className="text-sm font-semibold text-gray-500 font-sans">Caricamento delle tue attività...</p>
        </div>
      </div>
    );
  }

  const spettaAMeCount = data?.counts?.spettaAMe || 0;
  const attesaRispostaCount = data?.counts?.attesaRisposta || 0;

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">
              Filtro di Competenza
            </p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Le Mie Attività
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Visualizzazione unificata delle attività in attesa del tuo intervento o in attesa di feedback esterno.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsLoading(true);
                fetchCompetenze();
              }}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 10H18.2" />
              </svg>
              Aggiorna
            </button>
          </div>
        </div>

        {/* Info stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-900">Spetta a Me</h3>
              <p className="text-xs text-amber-700/80 mt-1">Attività che richiedono una mia risposta o azione diretta.</p>
            </div>
            <span className="text-3xl font-black text-amber-600 bg-white shadow-xs border border-amber-200/50 h-14 w-14 rounded-xl flex items-center justify-center">
              {spettaAMeCount}
            </span>
          </div>

          <div className="bg-gradient-to-r from-sky-50 to-blue-50/60 border border-sky-100 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-sky-900">In Attesa di Risposta</h3>
              <p className="text-xs text-sky-700/80 mt-1">Ho risposto e sto aspettando risposte da terze parti o clienti.</p>
            </div>
            <span className="text-3xl font-black text-sky-600 bg-white shadow-xs border border-sky-200/50 h-14 w-14 rounded-xl flex items-center justify-center">
              {attesaRispostaCount}
            </span>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ================= COLUMN 1: SPETTA A ME ================= */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="text-base font-extrabold text-gray-900">Spetta a Me ({spettaAMeCount})</h2>
            </div>

            {spettaAMeCount === 0 ? (
              <div className="bg-white border border-slate-150 rounded-2xl p-8 text-center text-gray-400 text-sm">
                Ottimo lavoro! Non hai attività di tua competenza in sospeso.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Tickets Spetta a me */}
                {data?.tickets?.spettaAMe && data.tickets.spettaAMe.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono text-[#004B97] uppercase tracking-wider pl-1">
                      Ticket Segnalazioni ({data.tickets.spettaAMe.length})
                    </h3>
                    
                    {data.tickets.spettaAMe.map((ticket) => {
                      const priorityInfo = formatPriority(ticket.priority);
                      return (
                        <div 
                          key={ticket.id} 
                          className="bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all duration-150 relative group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-gray-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                              {ticket.ticketNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${priorityInfo.style}`}>
                                {priorityInfo.label}
                              </span>
                              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                                {formatTicketStatus(ticket.status)}
                              </span>
                            </div>
                          </div>
                          
                          <Link href={`/dashboard/tickets/${ticket.id}`} className="block">
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#004B97] transition-colors leading-snug">
                              {ticket.title}
                            </h4>
                          </Link>
                          
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                            {ticket.description}
                          </p>

                          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-400">
                            <span>Da: <strong className="text-gray-600">{ticket.creator?.name || ticket.contact}</strong></span>
                            <span>Aggiornato il: {new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Startup Activities Spetta a me */}
                {data?.activities?.spettaAMe && data.activities.spettaAMe.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono text-[#004B97] uppercase tracking-wider pl-1">
                      Attività di Sviluppo ({data.activities.spettaAMe.length})
                    </h3>
                    
                    {data.activities.spettaAMe.map((activity) => {
                      const isExpanded = !!expandedActivities[activity.id];
                      const progress = getProgress(activity);
                      
                      // Check if there are subactivities assigned to me
                      const mySubactivities = activity.subactivities.filter(
                        (sub) => sub.responsibleId === user.id && sub.status !== 'COMPLETATA'
                      );

                      return (
                        <div 
                          key={activity.id} 
                          className="bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all duration-150"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-[#004B97] bg-blue-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {formatBoardType(activity.boardType)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {activity.pendingResponse === 1 && (
                                <span className="text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md">
                                  Spetta a me
                                </span>
                              )}
                              {mySubactivities.length > 0 && (
                                <span className="text-[9px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                                  {mySubactivities.length} Sotto-attività mie
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 leading-snug">
                              {activity.title}
                            </h4>
                            <button
                              onClick={() => toggleExpandActivity(activity.id)}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <svg 
                                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="text-gray-500 font-semibold">Progetto/Cliente:</span>
                            <span className="text-gray-700 font-bold">{activity.clientProject || 'Nessuno'}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-gray-400 font-bold mb-1">
                              <span>Progresso Attività</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-[#004B97] h-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                              {activity.description && (
                                <div>
                                  <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Descrizione</span>
                                  <p className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {activity.description}
                                  </p>
                                </div>
                              )}

                              <div>
                                <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Sotto-attività ({activity.subactivities.length})</span>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {activity.subactivities.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Nessuna sotto-attività definita.</p>
                                  ) : (
                                    activity.subactivities.map((sub) => {
                                      const isMine = sub.responsibleId === user.id;
                                      const statusStyles = {
                                        DA_FARE: 'text-red-600 bg-red-50 border border-red-100',
                                        IN_CORSO: 'text-blue-600 bg-blue-50 border border-blue-100',
                                        COMPLETATA: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
                                      };
                                      return (
                                        <div 
                                          key={sub.id} 
                                          className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                                            isMine && sub.status !== 'COMPLETATA'
                                              ? 'bg-amber-50/50 border-amber-200/60 font-semibold' 
                                              : 'bg-white border-slate-100'
                                          }`}
                                        >
                                          <div className="min-w-0 pr-2">
                                            <span className="truncate block text-gray-700">
                                              {sub.title}
                                            </span>
                                            <span className="text-[9px] text-gray-400 block mt-0.5">
                                              Resp: {sub.responsible?.name || 'Non assegnato'} {isMine && '(Io)'}
                                            </span>
                                          </div>
                                          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statusStyles[sub.status]}`}>
                                            {sub.status.replace('_', ' ')}
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 flex justify-end">
                                <Link 
                                  href={getBoardHref(activity.boardType)}
                                  className="text-[10px] font-bold text-[#004B97] hover:underline flex items-center gap-1"
                                >
                                  Apri nella Kanban Board
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
          </div>

          {/* ================= COLUMN 2: IN ATTESA DI RISPOSTA ================= */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-sky-200">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h2 className="text-base font-extrabold text-gray-900">In Attesa di Risposta ({attesaRispostaCount})</h2>
            </div>

            {attesaRispostaCount === 0 ? (
              <div className="bg-white border border-slate-150 rounded-2xl p-8 text-center text-gray-400 text-sm">
                Nessuna attività in attesa di risposta esterna.
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Tickets Attesa risposta */}
                {data?.tickets?.attesaRisposta && data.tickets.attesaRisposta.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono text-[#004B97] uppercase tracking-wider pl-1">
                      Ticket Segnalazioni ({data.tickets.attesaRisposta.length})
                    </h3>
                    
                    {data.tickets.attesaRisposta.map((ticket) => {
                      const priorityInfo = formatPriority(ticket.priority);
                      return (
                        <div 
                          key={ticket.id} 
                          className="bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all duration-150 relative group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-gray-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                              {ticket.ticketNumber}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${priorityInfo.style}`}>
                                {priorityInfo.label}
                              </span>
                              <span className="text-[9px] font-bold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-100">
                                {formatTicketStatus(ticket.status)}
                              </span>
                            </div>
                          </div>
                          
                          <Link href={`/dashboard/tickets/${ticket.id}`} className="block">
                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#004B97] transition-colors leading-snug">
                              {ticket.title}
                            </h4>
                          </Link>
                          
                          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                            {ticket.description}
                          </p>

                          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-400">
                            <span>Da: <strong className="text-gray-600">{ticket.creator?.name || ticket.contact}</strong></span>
                            <span>Aggiornato il: {new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Startup Activities Attesa risposta */}
                {data?.activities?.attesaRisposta && data.activities.attesaRisposta.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono text-[#004B97] uppercase tracking-wider pl-1">
                      Attività di Sviluppo ({data.activities.attesaRisposta.length})
                    </h3>
                    
                    {data.activities.attesaRisposta.map((activity) => {
                      const isExpanded = !!expandedActivities[activity.id];
                      const progress = getProgress(activity);
                      
                      return (
                        <div 
                          key={activity.id} 
                          className="bg-white border border-slate-200/80 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all duration-150"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-[#004B97] bg-blue-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {formatBoardType(activity.boardType)}
                            </span>
                            <span className="text-[9px] font-bold bg-sky-500 text-white px-2 py-0.5 rounded-md">
                              Attesa Risposta Esterna
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-gray-900 leading-snug">
                              {activity.title}
                            </h4>
                            <button
                              onClick={() => toggleExpandActivity(activity.id)}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <svg 
                                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className="text-gray-500 font-semibold">Progetto/Cliente:</span>
                            <span className="text-gray-700 font-bold">{activity.clientProject || 'Nessuno'}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-[9px] text-gray-400 font-bold mb-1">
                              <span>Progresso Attività</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-[#004B97] h-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                              {activity.description && (
                                <div>
                                  <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Descrizione</span>
                                  <p className="text-xs text-gray-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    {activity.description}
                                  </p>
                                </div>
                              )}

                              <div>
                                <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Sotto-attività ({activity.subactivities.length})</span>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {activity.subactivities.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">Nessuna sotto-attività definita.</p>
                                  ) : (
                                    activity.subactivities.map((sub) => {
                                      const statusStyles = {
                                        DA_FARE: 'text-red-600 bg-red-50 border border-red-100',
                                        IN_CORSO: 'text-blue-600 bg-blue-50 border border-blue-100',
                                        COMPLETATA: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
                                      };
                                      return (
                                        <div 
                                          key={sub.id} 
                                          className="p-2 rounded-lg text-xs flex items-center justify-between border bg-white border-slate-100"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <span className="truncate block text-gray-700 font-medium">
                                              {sub.title}
                                            </span>
                                            <span className="text-[9px] text-gray-400 block mt-0.5">
                                              Resp: {sub.responsible?.name || 'Non assegnato'}
                                            </span>
                                          </div>
                                          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${statusStyles[sub.status]}`}>
                                            {sub.status.replace('_', ' ')}
                                          </span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 flex justify-end">
                                <Link 
                                  href={getBoardHref(activity.boardType)}
                                  className="text-[10px] font-bold text-[#004B97] hover:underline flex items-center gap-1"
                                >
                                  Apri nella Kanban Board
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}
