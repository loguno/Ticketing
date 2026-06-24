import React, { useState } from 'react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Subactivity {
  id: string;
  title: string;
  description: string | null;
  status: 'DA_FARE' | 'IN_CORSO' | 'COMPLETATA';
  responsibleId: string | null;
  progressNotes: string | null;
}

interface SubactivityEditModalProps {
  subactivity: Subactivity;
  allUsers: UserInfo[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SubactivityEditModal({
  subactivity,
  allUsers,
  onSuccess,
  onCancel,
}: SubactivityEditModalProps) {
  const [title, setTitle] = useState(subactivity.title);
  const [description, setDescription] = useState(subactivity.description || '');
  const [status, setStatus] = useState<Subactivity['status']>(subactivity.status);
  const [responsibleId, setResponsibleId] = useState(subactivity.responsibleId || '');
  const [progressNotes, setProgressNotes] = useState(subactivity.progressNotes || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Il titolo della sotto-attività è obbligatorio.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/startup/subactivities/${subactivity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          responsibleId: responsibleId || null,
          progressNotes: progressNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore durante l'aggiornamento.");
      }

      onSuccess();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questa sotto-attività? Questa operazione non può essere annullata.')) {
      return;
    }

    setError('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/startup/subactivities/${subactivity.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Errore durante l'eliminazione.");
      }

      onSuccess();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setError(errorMsg);
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 md:p-10 text-[#0D0D0D] font-sans bg-white border border-black/10 rounded-2xl shadow-xl">
      <div className="flex justify-between items-center border-b border-black/10 pb-4 mb-5">
        <div>
          <span className="font-mono text-xs text-[#004B97] tracking-widest uppercase block font-bold">
            [ MODIFICA DETTAGLI SOTTO-ATTIVITÀ ]
          </span>
          <h3 className="text-xl font-bold uppercase text-black tracking-tight mt-1">
            AGGIORNA SOTTO-ATTIVITÀ
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-455 hover:text-black transition-colors text-sm font-mono uppercase cursor-pointer"
        >
          [ CHIUDI ]
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 text-xs font-mono rounded-xl mb-4">
          <strong>ERRORE:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sub-title" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
            Titolo Sotto-attività *
          </label>
          <input
            id="sub-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all"
            disabled={isLoading || isDeleting}
          />
        </div>

        <div>
          <label htmlFor="sub-description" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
            Descrizione Sotto-attività
          </label>
          <input
            id="sub-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dettagli specifici..."
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
            disabled={isLoading || isDeleting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sub-status" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Stato Parziale
            </label>
            <select
              id="sub-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Subactivity['status'])}
              className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
              disabled={isLoading || isDeleting}
            >
              <option value="DA_FARE">Da Fare</option>
              <option value="IN_CORSO">In Corso</option>
              <option value="COMPLETATA">Completata</option>
            </select>
          </div>

          <div>
            <label htmlFor="sub-responsible" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Responsabile Assegnato
            </label>
            <select
              id="sub-responsible"
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
              disabled={isLoading || isDeleting}
            >
              <option value="">Non assegnato</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="progress-notes" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
            Note di Avanzamento
          </label>
          <textarea
            id="progress-notes"
            rows={3}
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            placeholder="Descrivi l'avanzamento dei lavori, ostacoli o dettagli utili per il PM..."
            className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all resize-none font-sans"
            disabled={isLoading || isDeleting}
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="border-t border-black/10 pt-5 mt-6 flex justify-between font-mono text-xs">
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer uppercase font-bold"
            disabled={isLoading || isDeleting}
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina Sotto-attività'}
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-transparent hover:bg-black/5 border border-black/10 text-gray-500 hover:text-black px-5 py-2.5 rounded-xl transition-all cursor-pointer uppercase font-bold"
              disabled={isLoading || isDeleting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="bg-[#11BCEC] hover:bg-[#004B97] text-white px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer uppercase font-bold"
              disabled={isLoading || isDeleting}
            >
              {isLoading ? (
                <>
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Salvataggio...</span>
                </>
              ) : (
                <span>Salva Modifiche</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
