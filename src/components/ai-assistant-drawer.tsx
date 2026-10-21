'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

const QUICK_ACTIONS = [
  {
    label: '📋 Genera To-Do di Oggi',
    prompt: 'Genera To-Do di Oggi',
    description: 'Briefing delle priorità, scadenze e solleciti',
  },
  {
    label: '⏳ Mostra Solleciti Pendenti',
    prompt: 'Mostra Solleciti Pendenti',
    description: 'Ticket fermi e chi deve rispondere',
  },
  {
    label: '❓ A chi devo rispondere oggi?',
    prompt: 'A chi devo rispondere oggi?',
    description: 'Ticket in attesa di intervento',
  },
  {
    label: '🚨 Ticket Critici / Urgenti',
    prompt: 'Quali sono i ticket più critici e urgenti?',
    description: 'Focus su emergenze e scadenze immediate',
  },
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '### 👋 Ciao! Sono il tuo Assistente AI Operativo per i Ticket.\n\n' +
    'Sono collegato in tempo reale al database per aiutarti a gestire le priorità, le scadenze e i solleciti giornalieri.\n\n' +
    'Seleziona una delle azioni rapide qui sotto o fammi una domanda libera in linguaggio naturale (es. *"A chi devo rispondere oggi?"*, *"Situazione dei ticket di Marco"*).',
  timestamp: 'Oggi',
  suggestedPrompts: [
    'Genera To-Do di Oggi',
    'Mostra Solleciti Pendenti',
    'A chi devo rispondere oggi?',
    'Ticket Critici / Urgenti',
  ],
};

export default function AiAssistantDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on message update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputMessage).trim();
      if (!text || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');
      setIsLoading(true);

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error(`Errore HTTP ${res.status}`);
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Nessuna risposta disponibile.',
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: data.suggestedPrompts,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error('Errore chiamata assistente AI:', err);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Si è verificato un errore durante la connessione con l\'assistente. Verifica che la sessione sia attiva e riprova.',
          timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputMessage, isLoading, messages]
  );

  // Listen for open-ai-assistant custom events from sidebar or other components
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        handleSendMessage(customEvent.detail.prompt);
      }
    };
    window.addEventListener('open-ai-assistant', handleOpenEvent);
    return () => window.removeEventListener('open-ai-assistant', handleOpenEvent);
  }, [handleSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat azzerata. Come posso aiutarti ora con i ticket?',
        timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: [
          'Genera To-Do di Oggi',
          'Mostra Solleciti Pendenti',
          'A chi devo rispondere oggi?',
        ],
      },
    ]);
  };

  // Helper to render markdown text with styled badges and clickable ticket numbers
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return lines.map((line, lineIdx) => {
      // Header 3: ###
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineIdx} className="text-[14px] font-bold text-slate-100 mt-2 mb-1 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Header 4: ####
      if (line.startsWith('#### ')) {
        return (
          <h4 key={lineIdx} className="text-[12px] font-semibold text-amber-400 mt-3 mb-1 flex items-center gap-1">
            {line.replace('#### ', '')}
          </h4>
        );
      }

      // List item: - or *
      const isListItem = line.startsWith('- ') || line.startsWith('* ') || line.startsWith('  • ');
      const cleanLine = isListItem ? line.replace(/^(\s*[-*•]\s*)/, '') : line;

      // Parse bold **text**, code `text`, and ticket badges [TKT-YYYY-XXXXX]
      const parts = cleanLine.split(/(\*\*.*?\*\*|`.*?`|\[TKT-\d{4}-\d{5}\])/g);

      const parsedElements = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          const codeVal = part.slice(1, -1);
          let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
          if (codeVal === 'CRITICA' || codeVal === 'ALTA') {
            badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
          } else if (codeVal === 'MEDIA') {
            badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800';
          } else if (codeVal === 'BASSA') {
            badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
          } else if (codeVal === 'NUOVO') {
            badgeColor = 'bg-sky-950/80 text-sky-300 border-sky-800';
          }
          return (
            <span
              key={pIdx}
              className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded border ${badgeColor} mx-0.5`}
            >
              {codeVal}
            </span>
          );
        }
        // Clickable Ticket Number badge
        if (part.startsWith('[TKT-') && part.endsWith(']')) {
          const ticketNumber = part.slice(1, -1);
          return (
            <button
              key={pIdx}
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push(`/dashboard/tickets?search=${encodeURIComponent(ticketNumber)}`);
              }}
              title={`Cerca il ticket ${ticketNumber} nel portale`}
              className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-bold text-sky-300 bg-sky-950/70 hover:bg-sky-900 border border-sky-700/60 rounded cursor-pointer transition-colors mx-0.5 hover:underline"
            >
              {ticketNumber}
            </button>
          );
        }
        return part;
      });

      if (isListItem) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 my-0.5 text-[12px] text-slate-200 pl-1 leading-relaxed">
            <span className="text-amber-400 font-bold select-none">•</span>
            <div className="flex-1">{parsedElements}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={lineIdx} className="h-1.5" />;
      }

      return (
        <p key={lineIdx} className="text-[12px] text-slate-200 leading-relaxed my-0.5">
          {parsedElements}
        </p>
      );
    });
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. FLOATING ACTION BUTTON (FAB) - FISSO IN BASSO A DESTRA */}
      {/* ======================================================== */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Apri Assistente AI Ticket"
        title="Assistente AI - Intelligence & Priorità Giornaliere"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 border cursor-pointer select-none group ${
          isOpen
            ? 'bg-slate-900 text-amber-400 border-amber-500/60 shadow-amber-500/10 scale-95'
            : 'bg-[#0f172a] text-white border-slate-700/80 hover:border-amber-400/80 hover:shadow-amber-500/20 hover:scale-105 active:scale-95'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </div>
        <span className="text-xs font-bold tracking-wide uppercase text-slate-100 group-hover:text-amber-300 transition-colors">
          Assistente AI
        </span>
      </button>

      {/* ======================================================== */}
      {/* 2. BACKDROP OVERLAY PER DISPOSITIVI MOBILI               */}
      {/* ======================================================== */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:bg-transparent md:pointer-events-none"
        />
      )}

      {/* ======================================================== */}
      {/* 3. SLIDE-OVER DRAWER LATERALE DESTRO                    */}
      {/* ======================================================== */}
      <aside
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[460px] bg-[#0f172a] text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* DRAWER HEADER */}
        <header className="px-5 py-4 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Assistente Operativo Ticket</h2>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live DB
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Daily Agenda, Briefing & Solleciti</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearChat}
              title="Azzera la cronologia della chat"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              title="Chiudi il drawer"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* QUICK ACTION PILLS (Pulsanti di azione rapida) */}
        <section className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Azioni Rapide</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(action.prompt)}
                title={action.description}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800/90 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/50 border border-slate-700/60 rounded-md transition-all cursor-pointer disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>

        {/* CONVERSATION MESSAGE STREAM */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-semibold text-slate-400">
                  {msg.role === 'user' ? 'Tu' : 'Assistente AI'}
                </span>
                <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] px-3.5 py-2.5 rounded-xl border text-[13px] shadow-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white border-sky-500 rounded-tr-xs'
                    : 'bg-[#182234] text-slate-100 border-slate-800/80 rounded-tl-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div>{renderFormattedContent(msg.content)}</div>
                )}
              </div>

              {/* Follow-up suggestion pills from assistant */}
              {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-1">
                  {msg.suggestedPrompts.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendMessage(sug)}
                      className="px-2 py-0.5 text-[10px] text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="bg-[#182234] px-4 py-3 rounded-xl border border-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 ml-1">L&apos;assistente sta analizzando i ticket...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* INPUT BAR */}
        <footer className="p-3 bg-[#0a0f1d] border-t border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-[#182234] border border-slate-700/80 rounded-xl p-1.5 focus-within:border-amber-500/80 transition-colors"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi: 'Quali ticket scadono oggi?', 'Situazione di Marco'..."
              className="flex-1 bg-transparent border-0 text-xs text-white placeholder-slate-400 px-2 py-1.5 resize-none focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              aria-label="Invia messaggio"
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
          <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] text-slate-500">
            <span>Premi <strong>Invio</strong> per inviare, <strong>Shift + Invio</strong> per nuova riga</span>
            <span>Step 2 AI Assistant</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
