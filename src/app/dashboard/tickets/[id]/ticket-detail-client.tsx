'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

interface Message {
  id: string;
  body: string;
  type: 'INTERNAL_NOTE' | 'USER_COMMUNICATION';
  createdAt: string;
  senderEmail: string;
  sender?: { name: string; role: string } | null;
  attachments: Attachment[];
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
  targetCloseDate: string | null;
  isSuggestion: boolean;
  createdAt: string;
  creatorId: string | null;
  operatorId: string | null;
  creator?: { id: string; name: string; email: string } | null;
  operator?: { id: string; name: string; email: string } | null;
  attachments: Attachment[];
}

interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TicketDetailClientProps {
  user: UserInfo;
  ticketId: string;
  initialOperators: Operator[];
}

export default function TicketDetailClient({ user, ticketId, initialOperators }: TicketDetailClientProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [operators] = useState<Operator[]>(initialOperators);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Edit fields for triage
  const [status, setStatus] = useState<Ticket['status']>('NUOVO');
  const [priority, setPriority] = useState<Ticket['priority']>('BASSA');
  const [category, setCategory] = useState<Ticket['category']>('ALTRO');
  const [operatorId, setOperatorId] = useState<string>('');
  const [targetCloseDate, setTargetCloseDate] = useState<string>('');
  const [isSuggestion, setIsSuggestion] = useState<boolean>(false);
  const [sendNotification, setSendNotification] = useState(true);

  // New message fields
  const [msgBody, setMsgBody] = useState('');
  const [msgType, setMsgType] = useState<'USER_COMMUNICATION' | 'INTERNAL_NOTE'>('USER_COMMUNICATION');
  const [msgSendNotify, setMsgSendNotify] = useState(true);
  const [msgAttachments, setMsgAttachments] = useState<File[]>([]);

  const [triageError, setTriageError] = useState('');
  const [triageSuccess, setTriageSuccess] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchTicketDetails = useCallback(async () => {
    try {
      const ticketRes = await fetch(`/api/tickets/${ticketId}`);
      if (!ticketRes.ok) throw new Error('Ticket non trovato.');
      const ticketData = await ticketRes.json();
      setTicket(ticketData.ticket);

      // Set form defaults
      if (ticketData.ticket) {
        setStatus(ticketData.ticket.status);
        setPriority(ticketData.ticket.priority);
        setCategory(ticketData.ticket.category);
        setOperatorId(ticketData.ticket.operatorId || '');
        setIsSuggestion(ticketData.ticket.isSuggestion || false);
        setTargetCloseDate(
          ticketData.ticket.targetCloseDate
            ? new Date(ticketData.ticket.targetCloseDate).toISOString().substring(0, 10)
            : ''
        );
      }

      const msgRes = await fetch(`/api/tickets/${ticketId}/messages`);
      if (!msgRes.ok) throw new Error('Impossibile caricare i messaggi.');
      const msgData = await msgRes.json();
      setMessages(msgData.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTicketDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTicketDetails]);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTriageError('');
    setTriageSuccess(false);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          priority,
          category,
          operatorId: operatorId || null,
          targetCloseDate: targetCloseDate || null,
          isSuggestion,
          sendNotification,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la modifica.');

      setTriageSuccess(true);
      fetchTicketDetails(); // Refresh details and logs
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore imprevisto.';
      setTriageError(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMsgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      for (const file of selectedFiles) {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
          setMsgError(`Formato non supportato per "${file.name}". Sono ammessi solo JPG e PDF.`);
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setMsgError(`Il file "${file.name}" supera i 10MB.`);
          return;
        }
      }
      setMsgError('');
      setMsgAttachments(selectedFiles);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) {
      setMsgError('Inserire del testo per inviare la risposta.');
      return;
    }

    setIsSendingMsg(true);
    setMsgError('');

    try {
      const formData = new FormData();
      formData.append('body', msgBody);
      formData.append('type', msgType);
      formData.append('sendNotification', String(msgSendNotify));
      msgAttachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante l\'invio del messaggio.');

      setMsgBody('');
      setMsgAttachments([]);
      // Clear file input on page if possible
      const fileInput = document.getElementById('msg-files') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Set success notification
      if (msgType === 'USER_COMMUNICATION' && msgSendNotify && user.role !== 'STANDARD') {
        setSuccessMessage('Risposta salvata con successo. Notifica email inviata in background.');
      } else {
        setSuccessMessage('Risposta salvata con successo.');
      }
      setTimeout(() => setSuccessMessage(null), 5000); // hide after 5 seconds

      if (user.role === 'STANDARD') {
        router.push('/dashboard/tickets');
        router.refresh();
      } else {
        fetchTicketDetails(); // Reload message logs
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore imprevisto.';
      setMsgError(errorMsg);
    } finally {
      setIsSendingMsg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] text-gray-500 font-mono text-xs uppercase flex flex-col items-center justify-center gap-4">
        <span className="h-6 w-6 border-2 border-[#11BCEC] border-t-transparent rounded-full animate-spin"></span>
        <span>Caricamento dettagli ticket...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] text-red-500 font-mono text-xs uppercase flex flex-col items-center justify-center gap-4">
        <span>[ ERRORE: TICKET NON TROVATO O ACCESSO NEGATO ]</span>
        <Link href="/dashboard/tickets" className="text-gray-500 hover:text-black underline">
          &larr; Torna all&apos;elenco
        </Link>
      </div>
    );
  }

  const isClosedOrCancelled = ticket.status === 'CHIUSO' || ticket.status === 'ANNULLATO';
  const showTriagePanel = user.role !== 'STANDARD';

  return (
    <main className="flex-grow p-6 md:p-12 flex flex-col justify-between font-sans bg-[#F5F0EB]">
      {/* Container */}
      <div className="max-w-7xl w-full mx-auto space-y-8">
        
        {/* Breadcrumb Header */}
        <div className="flex justify-between items-center border-b border-black/10 pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1.5 min-w-0">
            <span>Dashboard</span>
            <span className="text-gray-400">&bull;</span>
            <Link href="/dashboard/tickets" className="hover:text-black transition-colors shrink-0">Ticket IT</Link>
            <span className="text-gray-400">&bull;</span>
            <span className="text-[#004B97] font-bold truncate">{ticket.ticketNumber}</span>
          </div>

          <Link
            href="/dashboard/tickets"
            className="px-4 py-2 border border-black/10 hover:border-black/20 text-gray-600 hover:text-black font-mono text-xs font-bold uppercase rounded-lg transition-all shrink-0"
          >
            &larr; Indietro
          </Link>
        </div>

        {/* Header Title block */}
        <div className="bg-white border border-black/[0.07] p-6 rounded-2xl shadow-xs">
          <span className="font-mono text-xs text-[#004B97] tracking-widest uppercase block mb-1">[ TITOLO SEGNALAZIONE ]</span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-black uppercase font-sans break-words">
            {ticket.title}
          </h1>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left column: timeline & replies */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            
            {/* Ticket Description block */}
            <div className="bg-white border border-black/[0.07] p-6 rounded-2xl space-y-4 shadow-xs">
              <div>
                <span className="font-mono text-[10px] text-[#004B97] tracking-widest uppercase block mb-2">[ DESCRIZIONE INIZIALE ]</span>
                <p className="text-sm text-gray-700 leading-relaxed font-sans whitespace-pre-wrap break-words">
                  {ticket.description}
                </p>
              </div>

              {ticket.attachments.length > 0 && (
                <div className="pt-4 border-t border-black/5 space-y-2">
                  <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest block">Allegati iniziali:</span>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/attachments/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-black/10 hover:border-black/20 rounded-lg text-xs text-gray-700 font-mono transition-all max-w-full truncate"
                      >
                        <svg className="h-3 w-3 text-[#11BCEC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">{file.filename}</span>
                        <span className="text-gray-400 font-normal shrink-0">({Math.round(file.fileSize / 1024)} KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Messages Stream */}
            <div className="space-y-4">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-widest block">[ CRONOLOGIA COMUNICAZIONI ]</span>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-gray-400 uppercase border border-dashed border-black/[0.07] bg-white rounded-2xl">
                    Nessuna comunicazione registrata per questo ticket.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isInternal = msg.type === 'INTERNAL_NOTE';
                    
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border transition-all shadow-xs ${
                          isInternal
                            ? 'bg-amber-500/[0.04] border-amber-500/20 text-gray-800'
                            : 'bg-white border-black/10 text-gray-800'
                        }`}
                      >
                        {/* Message header */}
                        <div className="flex flex-wrap justify-between items-center mb-2 gap-2 font-mono text-[10px] text-gray-500 uppercase border-b border-black/5 pb-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={isInternal ? 'text-amber-600 font-bold' : 'text-gray-700 font-bold'}>
                              {msg.sender ? msg.sender.name : msg.senderEmail}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase leading-none ${
                              isInternal 
                                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                : 'bg-gray-100 text-gray-650 border-gray-200'
                            }`}>
                              {isInternal ? 'NOTA INTERNA IT' : (msg.sender?.role || 'UTENTE')}
                            </span>
                          </div>
                          <span className="shrink-0 text-gray-400">
                            {new Date(msg.createdAt).toLocaleString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Message body */}
                        <p className="text-sm font-sans whitespace-pre-wrap leading-relaxed break-words text-gray-700">
                          {msg.body}
                        </p>

                        {/* Message attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-black/5 flex flex-wrap gap-2">
                            {msg.attachments.map((file) => (
                              <a
                                key={file.id}
                                href={`/api/attachments/${file.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-55 hover:bg-gray-100 border border-black/10 rounded-md text-[10px] text-gray-600 hover:text-black transition-all font-mono max-w-full truncate"
                              >
                                <svg className="h-2.5 w-2.5 text-[#11BCEC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                                </svg>
                                <span className="truncate">{file.filename}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Reply Form */}
            <div className="bg-white border border-black/[0.07] p-6 rounded-2xl space-y-4 shadow-xs">
              <div>
                <span className="font-mono text-[10px] text-[#004B97] tracking-widest uppercase block mb-1">[ INVIA RISPOSTA ]</span>
                <h3 className="text-md font-bold uppercase text-black tracking-tight font-sans">Scrivi un messaggio</h3>
              </div>

              {isClosedOrCancelled && user.role === 'STANDARD' ? (
                <div className="bg-red-50 text-red-700 border border-red-200/50 p-4 rounded-lg text-xs font-mono uppercase text-center font-bold">
                  [ TICKET CHIUSO O ANNULLATO. NON È POSSIBILE INVIARE ULTERIORI AGGIORNAMENTI ]
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  {msgError && (
                    <div className="bg-red-50 text-red-700 border border-red-200/50 p-3 rounded-lg text-xs font-mono">
                      <strong>ERRORE:</strong> {msgError}
                    </div>
                  )}

                  {/* Staff-only Options (Internal Note toggle) */}
                  {user.role !== 'STANDARD' && (
                    <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-3 border border-black/10 rounded-lg text-xs font-mono text-gray-700">
                      <span className="text-gray-400 font-bold">TIPO RISPOSTA:</span>
                      <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
                        <input
                          type="radio"
                          name="msgType"
                          value="USER_COMMUNICATION"
                          checked={msgType === 'USER_COMMUNICATION'}
                          onChange={() => setMsgType('USER_COMMUNICATION')}
                          className="accent-[#11BCEC]"
                        />
                        Comunicazione Utente
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-amber-650 font-bold">
                        <input
                          type="radio"
                          name="msgType"
                          value="INTERNAL_NOTE"
                          checked={msgType === 'INTERNAL_NOTE'}
                          onChange={() => setMsgType('INTERNAL_NOTE')}
                          className="accent-[#11BCEC]"
                        />
                        Nota Interna (Solo Helpdesk)
                      </label>
                      
                      {msgType === 'USER_COMMUNICATION' && (
                        <div className="ml-auto flex items-center gap-2 border-l border-black/10 pl-4 text-gray-500">
                          <input
                            type="checkbox"
                            id="msgSendNotify"
                            checked={msgSendNotify}
                            onChange={(e) => setMsgSendNotify(e.target.checked)}
                            className="accent-[#11BCEC]"
                          />
                          <label htmlFor="msgSendNotify" className="cursor-pointer select-none text-[10px]">
                            Invia Mail Notifica
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text area */}
                  <textarea
                    required
                    rows={4}
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder={
                      msgType === 'INTERNAL_NOTE'
                        ? 'Inserisci una nota privata visibile solo all\'help desk...'
                        : 'Scrivi la tua risposta all\'utente...'
                    }
                    className="w-full bg-white border border-black/10 rounded-lg px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/25 transition-all font-sans"
                    disabled={isSendingMsg}
                  />

                  {/* Attachments */}
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                    <div className="flex-grow">
                      <input
                        type="file"
                        id="msg-files"
                        multiple
                        accept=".jpg,.jpeg,.pdf"
                        onChange={handleMsgFileChange}
                        className="block w-full text-xs font-mono text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-xs file:font-mono file:font-bold file:uppercase
                          file:bg-black/5 file:text-gray-700
                          hover:file:bg-black/10 file:cursor-pointer"
                        disabled={isSendingMsg}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingMsg}
                      className="bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      {isSendingMsg ? (
                        <>
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Invio...</span>
                        </>
                      ) : (
                        <span>Invia Risposta</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right column: Triage Form / Metadata */}
          <div className="space-y-6 min-w-0 w-full">
            
            {/* Triage / Management Panel */}
            {showTriagePanel && (
              <div className="bg-white border border-black/[0.07] p-6 rounded-2xl space-y-4 shadow-xs">
                <div>
                  <span className="font-mono text-[10px] text-[#004B97] tracking-widest uppercase block mb-1">[ PANNELLO GESTIONE ]</span>
                  <h3 className="text-md font-bold uppercase text-black tracking-tight font-sans">Triage &amp; Assegnazione</h3>
                </div>

                {triageError && (
                  <div className="bg-red-50 text-red-700 border border-red-200/50 p-3 rounded-lg text-xs font-mono">
                    <strong>ERRORE:</strong> {triageError}
                  </div>
                )}

                {triageSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 p-3 rounded-lg text-xs font-mono">
                    <strong>SUCCESSO:</strong> Modifiche salvate e note aggiornate.
                  </div>
                )}

                <form onSubmit={handleTriageSubmit} className="space-y-4 text-xs font-mono text-black">
                  {/* Status */}
                  <div className="space-y-1">
                    <label htmlFor="t-status" className="block text-gray-400 uppercase tracking-widest text-[9px]">Stato</label>
                    <select
                      id="t-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Ticket['status'])}
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isUpdating}
                    >
                      <option value="NUOVO">Da valutare</option>
                      <option value="IN_VALUTAZIONE">In Valutazione</option>
                      <option value="IN_CARICO">In Carico</option>
                      <option value="RISPOSTO">Risposto</option>
                      <option value="SOSPESO">Sospeso</option>
                      <option value="RISOLTO">Risolto</option>
                      <option value="CHIUSO">Chiuso</option>
                      <option value="NON_RISOLVIBILE">Non Risolvibile</option>
                      <option value="ANNULLATO">Annullato</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label htmlFor="t-priority" className="block text-gray-400 uppercase tracking-widest text-[9px]">Priorità</label>
                    <select
                      id="t-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Ticket['priority'])}
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isUpdating}
                    >
                      <option value="BASSA">Bassa</option>
                      <option value="MEDIA">Media</option>
                      <option value="ALTA">Alta</option>
                      <option value="CRITICA">Critica</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label htmlFor="t-category" className="block text-gray-400 uppercase tracking-widest text-[9px]">Categoria</label>
                    <select
                      id="t-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Ticket['category'])}
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isUpdating}
                    >
                      <option value="TMS">TMS</option>
                      <option value="WMS">WMS</option>
                      <option value="AMMINISTRATIVO">Amministrativo</option>
                      <option value="ALTRO">Altro</option>
                    </select>
                  </div>

                  {/* Assigned Operator */}
                  <div className="space-y-1">
                    <label htmlFor="t-operator" className="block text-gray-400 uppercase tracking-widest text-[9px]">Operatore IT Assegnato</label>
                    <select
                      id="t-operator"
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isUpdating}
                    >
                      <option value="">-- Non Assegnato --</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.name} ({op.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Close Date */}
                  <div className="space-y-1">
                    <label htmlFor="t-close-date" className="block text-gray-400 uppercase tracking-widest text-[9px]">Data Prevista Chiusura</label>
                    <input
                      type="date"
                      id="t-close-date"
                      value={targetCloseDate}
                      onChange={(e) => setTargetCloseDate(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Notification send */}
                  <div className="flex items-center gap-2 pt-2 text-gray-600">
                    <input
                      type="checkbox"
                      id="t-notify"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="accent-[#11BCEC]"
                      disabled={isUpdating}
                    />
                    <label htmlFor="t-notify" className="cursor-pointer select-none">
                      Notifica cambio stato via email
                    </label>
                  </div>

                  {/* Suggerimento / Nuova Idea */}
                  <div className="flex items-center gap-2 pt-1 text-gray-600">
                    <input
                      type="checkbox"
                      id="t-suggestion"
                      checked={isSuggestion}
                      onChange={(e) => setIsSuggestion(e.target.checked)}
                      className="accent-[#11BCEC]"
                      disabled={isUpdating}
                    />
                    <label htmlFor="t-suggestion" className="cursor-pointer select-none flex items-center gap-1.5 font-bold text-[#004B97]">
                      💡 Segnala come Suggerimento
                    </label>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isUpdating ? 'Salvataggio...' : 'Salva Parametri'}
                  </button>
                </form>
              </div>
            )}

            {/* Ticket Information card */}
            <div className="bg-white border border-black/[0.07] p-6 rounded-2xl space-y-4 text-xs font-mono shadow-xs">
              <div>
                <span className="font-mono text-[10px] text-[#004B97] tracking-widest uppercase block mb-1">[ INFORMAZIONI GENERALI ]</span>
                <h3 className="text-md font-bold uppercase text-black tracking-tight font-sans">Scheda Ticket</h3>
              </div>

              <div className="space-y-3 divide-y divide-black/5">
                <div className="pt-2 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">CANALE ORIGINE:</span>
                  <span className="text-black font-bold truncate">{ticket.origin}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">CATEGORIA:</span>
                  <span className="text-black font-bold truncate">{ticket.category}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">STATO ATTUALE:</span>
                  <span className={`font-bold ${
                    ticket.status === 'NUOVO' ? 'text-blue-700' :
                    ticket.status === 'IN_VALUTAZIONE' ? 'text-[#C94E03]' :
                    ticket.status === 'IN_CARICO' ? 'text-amber-800' :
                    ticket.status === 'RISPOSTO' ? 'text-cyan-700' :
                    ticket.status === 'RISOLTO' ? 'text-emerald-700' :
                    ticket.status === 'SOSPESO' ? 'text-slate-650' :
                    'text-gray-555'
                  }`}>
                    {{
                      NUOVO: 'Da valutare',
                      IN_VALUTAZIONE: 'In Valutazione',
                      IN_CARICO: 'In Carico',
                      RISPOSTO: 'Risposto',
                      RISOLTO: 'Risolto',
                      CHIUSO: 'Chiuso',
                      NON_RISOLVIBILE: 'Non Risolvibile',
                      ANNULLATO: 'Annullato',
                      SOSPESO: 'Sospeso',
                    }[ticket.status]}
                  </span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">PRIORITÀ:</span>
                  <span className="text-black font-bold truncate">{ticket.priority}</span>
                </div>
                <div className="pt-3 flex justify-between gap-2 items-center">
                  <span className="text-gray-500 shrink-0">CONTATTO:</span>
                  <span className="text-gray-700 break-all ml-4 text-right font-sans font-medium">{ticket.contact}</span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">DATA CREAZIONE:</span>
                  <span className="text-gray-500">
                    {new Date(ticket.createdAt).toLocaleString('it-IT')}
                  </span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">OPERATORE ASSEGNATO:</span>
                  <span className="text-black font-bold truncate">
                    {ticket.operator ? ticket.operator.name : 'Non Assegnato'}
                  </span>
                </div>
                <div className="pt-3 flex justify-between gap-4 items-center">
                  <span className="text-gray-500 shrink-0">CREATORE TICKET:</span>
                  <span className="text-gray-600 font-sans font-medium truncate">
                    {ticket.creator ? ticket.creator.name : 'Email/WhatsApp'}
                  </span>
                </div>
                {ticket.targetCloseDate && (
                  <div className="pt-3 flex justify-between gap-4 items-center">
                    <span className="text-gray-500 shrink-0">PREVISTA CHIUSURA:</span>
                    <span className="text-emerald-600 font-bold shrink-0">
                      {new Date(ticket.targetCloseDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#10B981] text-white px-5 py-4 rounded-xl shadow-lg flex items-center gap-3 font-sans text-xs border border-emerald-500/30 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-bold leading-tight uppercase tracking-wider">{successMessage}</span>
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
