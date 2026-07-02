import React, { useState } from 'react';

interface StartupActivity {
  id: string;
  title: string;
  description: string | null;
  clientProject: string | null;
  startDate: string | null;
  targetCompleteDate: string | null;
}

interface MacroEditModalProps {
  activity: StartupActivity;
  onSave: (
    id: string,
    updates: {
      title: string;
      clientProject: string | null;
      description: string | null;
      startDate: string | null;
      targetCompleteDate: string | null;
    }
  ) => Promise<void>;
  onClose: () => void;
}

export default function MacroEditModal({ activity, onSave, onClose }: MacroEditModalProps) {
  const [title, setTitle] = useState(activity.title);
  const [clientProject, setClientProject] = useState(activity.clientProject || '');
  const [description, setDescription] = useState(activity.description || '');
  
  const [startDate, setStartDate] = useState(
    activity.startDate ? new Date(activity.startDate).toISOString().substring(0, 10) : ''
  );
  const [targetCompleteDate, setTargetCompleteDate] = useState(
    activity.targetCompleteDate ? new Date(activity.targetCompleteDate).toISOString().substring(0, 10) : ''
  );
  
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Il titolo è obbligatorio.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onSave(activity.id, {
        title: title.trim(),
        clientProject: clientProject.trim() || null,
        description: description.trim() || null,
        startDate: startDate || null,
        targetCompleteDate: targetCompleteDate || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si è verificato un errore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-black/10 rounded-2xl overflow-hidden shadow-2xl p-6 font-sans text-black">
        <div className="flex justify-between items-center border-b border-black/10 pb-4 mb-4">
          <div>
            <span className="font-mono text-xs text-[#004B97] tracking-widest uppercase block font-bold">
              [ MODIFICA ATTIVITÀ ]
            </span>
            <h3 className="text-lg font-bold uppercase text-black tracking-tight mt-1">
              Modifica Parametri
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-455 hover:text-black transition-colors text-sm font-mono uppercase cursor-pointer"
          >
            [ CHIUDI ]
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-750 text-xs font-mono rounded-lg">
            <strong>ERRORE:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono text-black">
          <div>
            <label htmlFor="edit-title" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Titolo Attività *
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all font-sans"
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="edit-client" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Cliente / Progetto
            </label>
            <input
              id="edit-client"
              type="text"
              value={clientProject}
              onChange={(e) => setClientProject(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all font-sans"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                Data Inizio
              </label>
              <input
                id="edit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer font-sans"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="edit-end" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                Scadenza Prevista
              </label>
              <input
                id="edit-end"
                type="date"
                value={targetCompleteDate}
                onChange={(e) => setTargetCompleteDate(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer font-sans"
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-desc" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Descrizione
            </label>
            <textarea
              id="edit-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-lg p-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all resize-none font-sans"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-black/10 pt-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 border border-black/10 text-gray-700 px-4 py-2 rounded-lg font-bold uppercase transition-all"
              disabled={isSaving}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="bg-[#11BCEC] hover:bg-[#004B97] text-white px-5 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Salvataggio...</span>
                </>
              ) : (
                <span>Salva</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
