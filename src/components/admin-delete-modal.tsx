'use client';

import React, { useState } from 'react';

interface AdminDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  title: string;
  description?: string;
  ticketNumbers?: string[];
  errorMessage?: string | null;
}

export default function AdminDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title,
  description,
  ticketNumbers = [],
  errorMessage,
}: AdminDeleteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'ELIMINA';

  const handleClose = () => {
    setStep(1);
    setConfirmInput('');
    onClose();
  };

  const handleNextStep = () => {
    setStep(2);
    setConfirmInput('');
  };

  const handleBack = () => {
    setStep(1);
    setConfirmInput('');
  };

  const handleFinalConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div className="w-full max-w-lg bg-white border border-red-200 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-scaleUp">
        {/* Header with Danger Accent */}
        <div className="bg-red-50 border-b border-red-100 p-6 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-700 font-bold bg-red-200/60 px-2 py-0.5 rounded">
                Admin Zone • Step {step} di 2
              </span>
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md"
                title="Chiudi"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h2 id="modal-headline" className="text-lg font-black text-gray-950 mt-1">
              {title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Avviso e Dettaglio Impatto */
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Operazione distruttiva permanente
                </p>
                <p>
                  Stai per eliminare definitivamente i dati dall&apos;archivio di sistema. L&apos;operazione è irreversibile e
                  rimuoverà per sempre:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-[11px] text-amber-950">
                  <li>Record del ticket e storico modifiche</li>
                  <li>Tutti i messaggi e note interne scambiate</li>
                  <li>Tutti i file allegati salvati fisicamente sul server</li>
                </ul>
              </div>

              {description && (
                <p className="text-xs text-gray-600 leading-relaxed">
                  {description}
                </p>
              )}

              {ticketNumbers.length > 0 && (
                <div className="bg-gray-50 border border-black/5 rounded-xl p-3">
                  <p className="text-[10px] font-mono uppercase text-gray-500 font-bold mb-2">
                    Ticket interessati ({ticketNumbers.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {ticketNumbers.map((num) => (
                      <span
                        key={num}
                        className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-black/10 rounded text-gray-800"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-black/10 text-gray-700 hover:text-black font-mono text-xs font-bold uppercase transition-all hover:bg-gray-50 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Procedi al Passaggio 2</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Conferma di Sicurezza con Testo */
            <form onSubmit={handleFinalConfirm} className="space-y-4">
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl text-red-900 text-xs leading-relaxed space-y-2">
                <p className="font-bold text-red-800">
                  Conferma finale richiesta
                </p>
                <p>
                  Per confermare l&apos;eliminazione immediata e definitiva, digita la parola{' '}
                  <span className="font-mono font-black text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                    ELIMINA
                  </span>{' '}
                  nel campo sottostante:
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-delete-input"
                  className="block text-[11px] font-mono uppercase text-gray-600 font-bold mb-1.5"
                >
                  Digitare &quot;ELIMINA&quot; per procedere:
                </label>
                <input
                  id="confirm-delete-input"
                  type="text"
                  autoFocus
                  disabled={isDeleting}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="ELIMINA"
                  className="w-full px-3.5 py-2.5 border-2 border-red-300 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 rounded-xl font-mono text-sm tracking-wider uppercase outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-black/10 text-gray-700 hover:text-black font-mono text-xs font-bold uppercase transition-all hover:bg-gray-50 cursor-pointer"
                >
                  &larr; Indietro
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="px-4 py-2.5 rounded-xl border border-black/10 text-gray-700 hover:text-black font-mono text-xs font-bold uppercase transition-all hover:bg-gray-50 cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!isConfirmed || isDeleting}
                    className={`px-5 py-2.5 rounded-xl text-white font-mono text-xs font-bold uppercase transition-all shadow-xs flex items-center gap-2 ${
                      isConfirmed && !isDeleting
                        ? 'bg-red-700 hover:bg-red-800 cursor-pointer'
                        : 'bg-red-300 cursor-not-allowed opacity-70'
                    }`}
                  >
                    {isDeleting && (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    )}
                    <span>{isDeleting ? 'Eliminazione in corso...' : 'Elimina definitivamente'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
