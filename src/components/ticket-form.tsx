'use client';

import React, { useState } from 'react';

interface TicketFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  userEmail: string;
}

export default function TicketForm({ onSuccess, onCancel, userEmail }: TicketFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ALTRO');
  const [contact, setContact] = useState(userEmail);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Validate each file
      for (const file of selectedFiles) {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
          setErrorMessage(`Formato file non valido per "${file.name}". Sono supportati solo JPG e PDF.`);
          return;
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          setErrorMessage(`Il file "${file.name}" supera la dimensione massima consentita di 10MB.`);
          return;
        }
      }

      setErrorMessage('');
      setAttachments(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      setErrorMessage('Si prega di compilare tutti i campi obbligatori.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('contact', contact);
      
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/tickets', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la creazione del ticket.');
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-[#0D0D0D] bg-white p-8 md:p-10 border border-black/10 rounded-2xl relative shadow-xl">
      <div>
        <span className="font-mono text-[10px] text-[#004B97] tracking-widest uppercase block mb-1 font-bold">
          [ NUOVA SEGNALAZIONE ]
        </span>
        <h3 className="text-xl font-bold uppercase tracking-tight text-black">Crea Nuovo Ticket IT</h3>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-mono">
          <strong>ERRORE:</strong> {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="title" className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
            Oggetto <span className="text-[#11BCEC]">*</span>
          </label>
          <input
            type="text"
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Descrizione sintetica del problema..."
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all font-sans"
            disabled={isLoading}
          />
        </div>

        {/* Category & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="category" className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
              Categoria <span className="text-[#11BCEC]">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all font-mono cursor-pointer"
              disabled={isLoading}
            >
              <option value="TMS">TMS (Trasporti)</option>
              <option value="WMS">WMS (Magazzino)</option>
              <option value="AMMINISTRATIVO">Amministrativo</option>
              <option value="ALTRO">Altro (Generale)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="contact" className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
              Email / Telefono Contatto <span className="text-[#11BCEC]">*</span>
            </label>
            <input
              type="text"
              id="contact"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="email@azienda.it"
              className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all font-mono"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
            Descrizione Dettagliata <span className="text-[#11BCEC]">*</span>
          </label>
          <textarea
            id="description"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fornisci dettagli sul problema (es. messaggi di errore, passi per riprodurlo)..."
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all font-sans"
            disabled={isLoading}
          />
        </div>

        {/* Attachments */}
        <div className="space-y-1.5">
          <label htmlFor="attachments" className="block text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">
            Allegati (Solo JPG, PDF - max 10MB cad.)
          </label>
          <div className="border border-dashed border-black/10 hover:border-[#11BCEC]/40 transition-colors rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center text-center cursor-pointer relative">
            <input
              type="file"
              id="attachments"
              multiple
              accept=".jpg,.jpeg,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
            <span className="text-gray-450 text-xs font-mono">
              {attachments.length > 0
                ? `${attachments.length} file selezionati`
                : 'Clicca o trascina qui per caricare i file'}
            </span>
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachments.map((file, idx) => (
                  <span key={idx} className="bg-black/5 border border-black/5 rounded px-2 py-0.5 text-[10px] font-mono text-gray-700">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-black/10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="bg-transparent hover:bg-black/5 border border-black/10 text-gray-500 hover:text-black font-mono text-xs font-bold uppercase px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#11BCEC] hover:bg-[#004B97] text-white font-mono text-xs font-bold uppercase px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <>
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Invio...</span>
            </>
          ) : (
            <span>Invia Ticket</span>
          )}
        </button>
      </div>
    </form>
  );
}
