import React, { useState } from 'react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SubactivityInput {
  title: string;
  description: string;
  responsibleId: string;
}

interface StartupFormProps {
  allUsers: UserInfo[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StartupForm({ allUsers, onSuccess, onCancel }: StartupFormProps) {
  const [title, setTitle] = useState('');
  const [clientProject, setClientProject] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetCompleteDate, setTargetCompleteDate] = useState('');
  const [subactivities, setSubactivities] = useState<SubactivityInput[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSubactivity = () => {
    setSubactivities([
      ...subactivities,
      { title: '', description: '', responsibleId: '' },
    ]);
  };

  const handleRemoveSubactivity = (index: number) => {
    setSubactivities(subactivities.filter((_, i) => i !== index));
  };

  const handleSubactivityChange = (index: number, field: keyof SubactivityInput, value: string) => {
    const updated = [...subactivities];
    updated[index][field] = value;
    setSubactivities(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Il titolo della macro-attività è obbligatorio.');
      return;
    }

    // Verify subactivities have titles
    for (let i = 0; i < subactivities.length; i++) {
      if (!subactivities[i].title.trim()) {
        setError(`Inserire un titolo per la sotto-attività #${i + 1}.`);
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/startup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          clientProject: clientProject.trim() || null,
          description: description.trim() || null,
          startDate: startDate || null,
          targetCompleteDate: targetCompleteDate || null,
          subactivities: subactivities.map((sub) => ({
            title: sub.title.trim(),
            description: sub.description.trim() || null,
            responsibleId: sub.responsibleId || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante la creazione.');
      }

      onSuccess();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6 max-h-[85vh] overflow-y-auto text-[#0D0D0D] font-sans bg-white border border-black/10 rounded-2xl relative shadow-xl">
      <div className="flex justify-between items-center border-b border-black/10 pb-4">
        <div>
          <span className="font-mono text-xs text-[#004B97] tracking-widest uppercase block font-bold">
            [ NUOVA COMPILAZIONE STARTUP ]
          </span>
          <h3 className="text-xl font-bold uppercase text-black tracking-tight mt-1">
            CREA ATTIVITÀ START UP
          </h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-455 hover:text-black transition-colors text-sm font-mono uppercase cursor-pointer"
        >
          [ ANNULLA ]
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-750 text-xs font-mono rounded-xl">
          <strong>ERRORE:</strong> {error}
        </div>
      )}

      {/* Main Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="macro-title" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
            Titolo Attività *
          </label>
          <input
            id="macro-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="es. Startup Cliente Beta WMS"
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="client-project" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
            Cliente / Progetto
          </label>
          <input
            id="client-project"
            type="text"
            value={clientProject}
            onChange={(e) => setClientProject(e.target.value)}
            placeholder="es. Cliente Beta"
            className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start-date" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              Data Inizio
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              Scadenza Prevista
            </label>
            <input
              id="end-date"
              type="date"
              value={targetCompleteDate}
              onChange={(e) => setTargetCompleteDate(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
            Descrizione Generale
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fornisci una descrizione dell'attività e degli obiettivi generali..."
            className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all resize-none"
            disabled={isLoading}
          ></textarea>
        </div>
      </div>

      {/* Subactivities Section */}
      <div className="border-t border-black/10 pt-5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold uppercase text-black font-mono tracking-wide">
            [ SOTTO-ATTIVITÀ ]
          </h4>
          <button
            type="button"
            onClick={handleAddSubactivity}
            className="bg-transparent border border-black/10 text-xs font-mono uppercase px-3 py-1.5 rounded-xl text-gray-500 hover:text-black hover:bg-black/5 cursor-pointer transition-all"
            disabled={isLoading}
          >
            + Aggiungi
          </button>
        </div>

        {subactivities.length === 0 ? (
          <p className="text-xs font-mono text-gray-450 text-center py-6 border border-dashed border-black/10 rounded-xl uppercase">
            [ NESSUNA SOTTO-ATTIVITÀ INSERITA // UTILIZZA IL TASTO AGGIUNGI ]
          </p>
        ) : (
          <div className="space-y-4">
            {subactivities.map((sub, index) => (
              <div
                key={index}
                className="bg-gray-50/50 border border-black/5 rounded-xl p-4 relative space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[#004B97] uppercase font-bold">
                    Sotto-attività #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubactivity(index)}
                    className="text-red-600 hover:text-red-700 text-xs font-mono uppercase cursor-pointer font-bold"
                    disabled={isLoading}
                  >
                    [ Elimina ]
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                      Titolo Sotto-attività *
                    </label>
                    <input
                      type="text"
                      value={sub.title}
                      onChange={(e) => handleSubactivityChange(index, 'title', e.target.value)}
                      placeholder="es. Configurazione server o formazione operatori"
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                      Responsabile Assegnato
                    </label>
                    <select
                      value={sub.responsibleId}
                      onChange={(e) => handleSubactivityChange(index, 'responsibleId', e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
                      disabled={isLoading}
                    >
                      <option value="">Seleziona Operatore...</option>
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1">
                      Descrizione Sotto-attività
                    </label>
                    <input
                      type="text"
                      value={sub.description}
                      onChange={(e) => handleSubactivityChange(index, 'description', e.target.value)}
                      placeholder="Dettagli specifici sul lavoro da svolgere per questa sotto-attività..."
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-black/10 pt-5 flex justify-end gap-3 font-mono text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="bg-transparent hover:bg-black/5 border border-black/10 text-gray-500 hover:text-black px-5 py-3 rounded-xl transition-all cursor-pointer uppercase font-bold"
          disabled={isLoading}
        >
          Annulla
        </button>
        <button
          type="submit"
          className="bg-[#11BCEC] hover:bg-[#004B97] text-white px-6 py-3 rounded-xl transition-all shadow-xs hover:shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer uppercase font-bold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Creazione...</span>
            </>
          ) : (
            <span>Conferma e Crea</span>
          )}
        </button>
      </div>
    </form>
  );
}
