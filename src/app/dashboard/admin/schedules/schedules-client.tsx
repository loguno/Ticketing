'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ReportSchedule {
  id: string;
  name: string;
  emails: string;
  startDate: string;
  frequency: string;
  freqDetails: string | null;
  boardTypes: string;
  clientProject: string;
  active: boolean;
  lastRun: string | null;
  nextRun: string | null;
  _count: {
    logs: number;
  };
}

interface ReportLog {
  id: string;
  sentAt: string;
  recipient: string;
  status: 'SUCCESS' | 'FAILED';
  error: string | null;
  schedule: {
    name: string;
  };
}

interface SchedulesClientProps {
  projectList: string[];
}

export default function SchedulesClient({ projectList }: SchedulesClientProps) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmails, setFormEmails] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formFrequency, setFormFrequency] = useState('giornaliera');
  const [formBoardTypes, setFormBoardTypes] = useState<string[]>(['STARTUP']);
  const [formClientProject, setFormClientProject] = useState('ALL');
  const [formCustomProject, setFormCustomProject] = useState('');

  // Frequency Details State
  const [dailyDays, setDailyDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [weeklyDay, setWeeklyDay] = useState(1); // Mon
  const [monthlyDay, setMonthlyDay] = useState(1);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSchedulesAndLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/schedules');
      if (!res.ok) throw new Error('Errore durante il caricamento dei dati.');
      const data = await res.json();
      setSchedules(data.schedules || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Impossibile caricare le schedulazioni.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchedulesAndLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSchedulesAndLogs]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormName('');
    setFormEmails('');
    
    // Set default startDate to tomorrow at 08:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    // Format to yyyy-MM-ddThh:mm matching datetime-local input
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateTime = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
    
    setFormStartDate(localDateTime);
    setFormFrequency('giornaliera');
    setFormBoardTypes(['STARTUP', 'WMS', 'TMS', 'CROSS_DOCKING']);
    setFormClientProject('ALL');
    setFormCustomProject('');
    setDailyDays([1, 2, 3, 4, 5]);
    setWeeklyDay(1);
    setMonthlyDay(1);
    setErrorMessage('');
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (schedule: ReportSchedule) => {
    setEditingSchedule(schedule);
    setFormName(schedule.name);
    setFormEmails(schedule.emails);
    
    // Format startDate timestamp for input
    const d = new Date(schedule.startDate);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setFormStartDate(localDateTime);
    
    setFormFrequency(schedule.frequency);
    setFormBoardTypes(schedule.boardTypes.split(',').map(t => t.trim()));
    
    if (projectList.includes(schedule.clientProject) || schedule.clientProject === 'ALL') {
      setFormClientProject(schedule.clientProject);
      setFormCustomProject('');
    } else {
      setFormClientProject('CUSTOM');
      setFormCustomProject(schedule.clientProject);
    }

    // Parse frequency details
    if (schedule.freqDetails) {
      try {
        const details = JSON.parse(schedule.freqDetails);
        if (schedule.frequency === 'giornaliera') {
          setDailyDays(Array.isArray(details) ? details : []);
        } else if (schedule.frequency === 'settimanale') {
          setWeeklyDay(Number(details));
        } else if (schedule.frequency === 'mensile') {
          setMonthlyDay(Number(details));
        }
      } catch (e) {
        console.error(e);
      }
    }

    setErrorMessage('');
    setShowModal(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (!res.ok) throw new Error("Errore durante l'aggiornamento dello stato.");
      fetchSchedulesAndLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa schedulazione?')) return;
    try {
      const res = await fetch(`/api/admin/schedules/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore durante la cancellazione.');
      fetchSchedulesAndLogs();
      setSuccessMessage('Schedulazione eliminata con successo.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  };

  const handleTestRun = async (id: string) => {
    setIsTestLoading(id);
    try {
      const res = await fetch(`/api/admin/schedules/${id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore durante l'invio del test.");
      
      setSuccessMessage('Email di test inviata con successo. Verifica la tua casella di posta.');
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchSchedulesAndLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setIsTestLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmails.trim() || !formStartDate || !formFrequency || formBoardTypes.length === 0) {
      setErrorMessage('Compila tutti i campi obbligatori.');
      return;
    }

    setIsSubmitLoading(true);
    setErrorMessage('');

    const clientProjectValue = formClientProject === 'CUSTOM' ? formCustomProject : formClientProject;
    if (formClientProject === 'CUSTOM' && !formCustomProject.trim()) {
      setErrorMessage('Specifica un nome cliente/progetto personalizzato.');
      setIsSubmitLoading(false);
      return;
    }

    // Determine freqDetails payload
    let freqDetailsPayload: number[] | number | null = null;
    if (formFrequency === 'giornaliera') {
      freqDetailsPayload = dailyDays;
    } else if (formFrequency === 'settimanale') {
      freqDetailsPayload = weeklyDay;
    } else if (formFrequency === 'mensile') {
      freqDetailsPayload = monthlyDay;
    }

    const payload = {
      name: formName,
      emails: formEmails,
      startDate: new Date(formStartDate).toISOString(),
      frequency: formFrequency,
      freqDetails: freqDetailsPayload,
      boardTypes: formBoardTypes.join(','),
      clientProject: clientProjectValue,
    };

    try {
      const url = editingSchedule
        ? `/api/admin/schedules/${editingSchedule.id}`
        : '/api/admin/schedules';
      
      const method = editingSchedule ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante il salvataggio.');

      setSuccessMessage(editingSchedule ? 'Schedulazione modificata con successo.' : 'Schedulazione creata con successo.');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowModal(false);
      fetchSchedulesAndLogs();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Si è verificato un errore.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const toggleBoardType = (type: string) => {
    if (formBoardTypes.includes(type)) {
      setFormBoardTypes(formBoardTypes.filter((t) => t !== type));
    } else {
      setFormBoardTypes([...formBoardTypes, type]);
    }
  };

  const toggleDailyDay = (day: number) => {
    if (dailyDays.includes(day)) {
      setDailyDays(dailyDays.filter((d) => d !== day));
    } else {
      setDailyDays([...dailyDays, day].sort());
    }
  };

  const formatBoardTypes = (typesStr: string) => {
    if (typesStr === 'STARTUP,WMS,TMS,CROSS_DOCKING' || typesStr === 'WMS,TMS,STARTUP,CROSS_DOCKING') {
      return 'Tutte le attività';
    }
    return typesStr;
  };

  const formatFrequency = (freq: string, details: string | null) => {
    const daysName = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    if (freq === 'giornaliera') {
      if (!details) return 'Giornaliera (Ogni giorno)';
      try {
        const parsed = JSON.parse(details);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length === 5 && !parsed.includes(0) && !parsed.includes(6)) {
            return 'Giornaliera (Lun-Ven)';
          }
          return `Giornaliera (${parsed.map((d: number) => daysName[d].substring(0, 3)).join(', ')})`;
        }
      } catch {}
      return 'Giornaliera';
    }
    if (freq === 'settimanale') {
      try {
        const idx = Number(details);
        return `Settimanale (Ogni ${daysName[idx]})`;
      } catch {}
      return 'Settimanale';
    }
    if (freq === 'mensile') {
      return `Mensile (Il giorno ${details})`;
    }
    return freq;
  };

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Amministrazione</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pianificazione Invio Report PDF</h1>
            <p className="text-sm text-gray-500 mt-1">Configura l&apos;invio pianificato del report PDF dello stato delle attività di sviluppo</p>
          </div>
          <div>
            <button
              onClick={handleOpenCreate}
              className="bg-[#004B97] hover:bg-[#003a75] text-white font-mono text-xs font-bold uppercase px-5 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7-7H5" />
              </svg>
              Nuova Schedulazione
            </button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-mono">
            <strong>SUCCESSO:</strong> {successMessage}
          </div>
        )}

        {/* Schedules Table */}
        <div className="bg-white border border-black/[0.07] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-black/[0.05] bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Schedulazioni Attive</h2>
            <span className="bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
              {schedules.length} SCHEDE
            </span>
          </div>

          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-xs font-mono text-gray-400 uppercase">
              <span className="h-6 w-6 border-2 border-[#004B97] border-t-transparent rounded-full animate-spin"></span>
              <span>Caricamento schedulazioni...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-20 text-center text-xs font-mono text-gray-450 uppercase">
              Nessuna schedulazione configurata. Clicca su &quot;Nuova Schedulazione&quot; per iniziare.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.05] text-[10px] font-mono text-gray-400 uppercase bg-gray-50/20 select-none">
                    <th className="p-4">Nome Schedulazione</th>
                    <th className="p-4">Stato</th>
                    <th className="p-4">Destinatari</th>
                    <th className="p-4">Filtri (Attività / Progetto)</th>
                    <th className="p-4">Frequenza</th>
                    <th className="p-4">Prossimo Invio</th>
                    <th className="p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-xs text-gray-800 bg-white">
                  {schedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-black/[0.01] transition-colors">
                      <td className="p-4 font-bold text-black min-w-[150px]">
                        {sch.name}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(sch.id, sch.active)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            sch.active ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              sch.active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4 max-w-[200px] truncate" title={sch.emails}>
                        {sch.emails}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-semibold text-gray-900">
                          {formatBoardTypes(sch.boardTypes)}
                        </div>
                        <div className="text-[10px] text-gray-450 font-mono">
                          Progetto: {sch.clientProject === 'ALL' ? 'TUTTI' : sch.clientProject}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-gray-700">
                        {formatFrequency(sch.frequency, sch.freqDetails)}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-gray-600">
                        {sch.active && sch.nextRun
                          ? new Date(sch.nextRun).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'Sospeso'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Test Button */}
                          <button
                            onClick={() => handleTestRun(sch.id)}
                            disabled={isTestLoading !== null}
                            className="bg-[#11BCEC]/10 hover:bg-[#11BCEC]/20 text-[#004B97] border border-[#11BCEC]/20 hover:border-[#11BCEC]/30 font-bold px-2.5 py-1.5 rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Invia email di prova immediata"
                          >
                            {isTestLoading === sch.id ? (
                              <span className="h-3 w-3 border-2 border-[#004B97] border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                              'Test'
                            )}
                          </button>
                          
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(sch)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 border border-black/5 hover:border-black/10 rounded-lg transition-all text-gray-600 hover:text-black cursor-pointer"
                            title="Modifica schedulazione"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(sch.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-lg transition-all text-red-650 hover:text-red-700 cursor-pointer"
                            title="Elimina"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-black/[0.07] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-black/[0.05] bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Storico Log Invii Report</h2>
            <span className="bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
              ULTIMI 50 EVENTI
            </span>
          </div>

          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-xs font-mono text-gray-400 uppercase">
              <span className="h-6 w-6 border-2 border-[#004B97] border-t-transparent rounded-full animate-spin"></span>
              <span>Caricamento logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-gray-400 uppercase">
              Nessun log registrato. Gli eventi di invio appariranno qui.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.05] text-[10px] font-mono text-gray-400 uppercase bg-gray-50/20 select-none">
                    <th className="p-4">Data Invio</th>
                    <th className="p-4">Schedulazione</th>
                    <th className="p-4">Destinatari</th>
                    <th className="p-4">Esito</th>
                    <th className="p-4">Dettagli Errore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 text-[11px] text-gray-700 bg-white font-sans">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-black/[0.01] transition-colors">
                      <td className="p-3 font-mono">
                        {new Date(log.sentAt).toLocaleString('it-IT')}
                      </td>
                      <td className="p-3 font-semibold text-black">
                        {log.schedule?.name || 'Cancellata'}
                      </td>
                      <td className="p-3">
                        {log.recipient}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold font-mono text-[9px] ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 text-red-500 font-mono max-w-[350px] whitespace-normal break-all text-xs" title={log.error || ''}>
                        {log.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal - Create/Edit Schedule */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-black/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-gray-900">
            
            <div className="px-6 py-5 border-b border-black/[0.05] bg-gray-50 flex justify-between items-center">
              <div>
                <span className="font-mono text-[9px] text-[#004B97] tracking-widest uppercase block font-bold">
                  {editingSchedule ? '[ MODIFICA REPORT ]' : '[ NUOVO REPORT ]'}
                </span>
                <h3 className="text-base font-bold text-gray-900 uppercase">
                  {editingSchedule ? 'Modifica Schedulazione' : 'Crea Schedulazione'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-mono">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-gray-500 uppercase tracking-wider font-bold">Nome Report / Schedulazione *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="es. Report Settimanale Attività WMS"
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all font-sans text-xs"
                />
              </div>

              {/* Destination Emails */}
              <div className="space-y-1.5">
                <label className="block text-gray-500 uppercase tracking-wider font-bold">E-mail Destinatari (separate da virgola) *</label>
                <input
                  type="text"
                  required
                  value={formEmails}
                  onChange={(e) => setFormEmails(e.target.value)}
                  placeholder="pm@azienda.it, ivano.fiorito@logisticauno.com"
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all text-xs"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="block text-gray-500 uppercase tracking-wider font-bold">Pianifica Invii a Partire Da *</label>
                <input
                  type="datetime-local"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all text-xs"
                />
              </div>

              {/* Filters (Development boards selection) */}
              <div className="space-y-1.5">
                <label className="block text-gray-500 uppercase tracking-wider font-bold">Attività di sviluppo da includere *</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50/40 border border-black/[0.05] rounded-xl p-3 text-[11px] font-sans">
                  {['STARTUP', 'WMS', 'TMS', 'CROSS_DOCKING'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formBoardTypes.includes(type)}
                        onChange={() => toggleBoardType(type)}
                        className="accent-[#11BCEC]"
                      />
                      <span>
                        {type === 'STARTUP' ? 'Start Up' :
                         type === 'CROSS_DOCKING' ? 'Cross Docking' : type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Client/Project filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-gray-500 uppercase tracking-wider font-bold">Cliente / Progetto *</label>
                  <select
                    value={formClientProject}
                    onChange={(e) => setFormClientProject(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer text-xs"
                  >
                    <option value="ALL">Tutti i Progetti (Nessun filtro)</option>
                    {projectList.map((proj) => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                    <option value="CUSTOM">[ Specifica Cliente Personalizzato ]</option>
                  </select>
                </div>

                {formClientProject === 'CUSTOM' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-gray-500 uppercase tracking-wider font-bold">Nome Cliente Personalizzato *</label>
                    <input
                      type="text"
                      required
                      value={formCustomProject}
                      onChange={(e) => setFormCustomProject(e.target.value)}
                      placeholder="es. Cliente Beta"
                      className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all text-xs font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-3 pt-2 border-t border-black/[0.05]">
                <div className="grid grid-cols-3 gap-2">
                  {['giornaliera', 'settimanale', 'mensile'].map((f) => (
                    <label
                      key={f}
                      className={`flex items-center justify-center p-2 border rounded-xl cursor-pointer select-none text-[10px] uppercase font-bold transition-all ${
                        formFrequency === f
                          ? 'border-[#004B97] bg-[#004B97]/5 text-[#004B97]'
                          : 'border-black/10 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={f}
                        checked={formFrequency === f}
                        onChange={() => setFormFrequency(f)}
                        className="sr-only"
                      />
                      {f}
                    </label>
                  ))}
                </div>

                {/* Daily options (Days of week checkboxes) */}
                {formFrequency === 'giornaliera' && (
                  <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-black/[0.03] animate-fadeIn">
                    <label className="block text-gray-500 uppercase tracking-widest text-[9px] mb-1">Seleziona i giorni della settimana (Tutti se vuoto):</label>
                    <div className="flex flex-wrap gap-2 text-[10px] font-sans">
                      {[
                        { num: 1, label: 'L' },
                        { num: 2, label: 'M' },
                        { num: 3, label: 'M' },
                        { num: 4, label: 'G' },
                        { num: 5, label: 'V' },
                        { num: 6, label: 'S' },
                        { num: 0, label: 'D' },
                      ].map((day) => (
                        <button
                          type="button"
                          key={day.num}
                          onClick={() => toggleDailyDay(day.num)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold transition-all cursor-pointer ${
                            dailyDays.includes(day.num)
                              ? 'bg-[#004B97] text-white border-transparent'
                              : 'bg-white text-gray-500 border-black/10 hover:bg-gray-150'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly options (Select single day) */}
                {formFrequency === 'settimanale' && (
                  <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-black/[0.03] animate-fadeIn">
                    <label className="block text-gray-500 uppercase tracking-widest text-[9px]">Giorno della settimana:</label>
                    <select
                      value={weeklyDay}
                      onChange={(e) => setWeeklyDay(Number(e.target.value))}
                      className="w-full bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-black focus:outline-none transition-all cursor-pointer text-xs"
                    >
                      <option value="1">Lunedì</option>
                      <option value="2">Martedì</option>
                      <option value="3">Mercoledì</option>
                      <option value="4">Giovedì</option>
                      <option value="5">Venerdì</option>
                      <option value="6">Sabato</option>
                      <option value="0">Domenica</option>
                    </select>
                  </div>
                )}

                {/* Monthly options (Day of month input) */}
                {formFrequency === 'mensile' && (
                  <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-black/[0.03] animate-fadeIn">
                    <label className="block text-gray-500 uppercase tracking-widest text-[9px]">Giorno del mese (1-31):</label>
                    <select
                      value={monthlyDay}
                      onChange={(e) => setMonthlyDay(Number(e.target.value))}
                      className="w-full bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-black focus:outline-none transition-all cursor-pointer text-xs"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>Il giorno {d}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.05] text-xs font-mono font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-transparent hover:bg-black/5 border border-black/10 text-gray-500 hover:text-black px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="bg-[#004B97] hover:bg-[#003a75] text-white px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitLoading ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
      )}

    </main>
  );
}
