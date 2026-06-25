'use client';

import React, { useState, useEffect } from 'react';

interface TicketFiltersProps {
  onFilterChange: (filters: {
    status: string;
    priority: string;
    category: string;
    search: string;
  }) => void;
  showStatusFilter?: boolean;
}

export default function TicketFilters({ onFilterChange, showStatusFilter = true }: TicketFiltersProps) {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  // Debounce search input to prevent excessive API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onFilterChange({ status, priority, category, search });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [status, priority, category, search, onFilterChange]);

  return (
    <div className="bg-white/80 backdrop-blur-md border border-black/10 rounded-xl p-4 gap-4 flex flex-col md:flex-row md:flex-wrap items-stretch md:items-end text-xs font-mono text-black shadow-sm">
      {/* Search Input */}
      <div className="flex-grow min-w-[200px]">
        <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ CERCA ]</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per numero, oggetto o testo..."
          className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] transition-all"
        />
      </div>

      {/* Status Select */}
      {showStatusFilter && (
        <div className="w-full md:w-[150px] shrink-0">
          <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ STATO ]</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
          >
            <option value="">Tutti</option>
            <option value="NUOVO">Da valutare</option>
            <option value="IN_VALUTAZIONE">In Valutazione</option>
            <option value="RISPOSTO">Risposto</option>
            <option value="RISOLTO">Risolto</option>
            <option value="CHIUSO">Chiuso</option>
            <option value="NON_RISOLVIBILE">Non Risolvibile</option>
            <option value="ANNULLATO">Annullato</option>
            <option value="SOSPESO">Sospeso</option>
          </select>
        </div>
      )}

      {/* Priority Select */}
      <div className="w-full md:w-[150px] shrink-0">
        <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ PRIORITÀ ]</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
        >
          <option value="">Tutte</option>
          <option value="BASSA">Bassa</option>
          <option value="MEDIA">Media</option>
          <option value="ALTA">Alta</option>
          <option value="CRITICA">Critica</option>
        </select>
      </div>

      {/* Category Select */}
      <div className="w-full md:w-[150px] shrink-0">
        <label className="block text-gray-400 uppercase tracking-widest text-[9px] mb-1.5">[ CATEGORIA ]</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-black focus:outline-none focus:border-[#11BCEC] transition-all cursor-pointer"
        >
          <option value="">Tutte</option>
          <option value="TMS">TMS</option>
          <option value="WMS">WMS</option>
          <option value="AMMINISTRATIVO">Amministrativo</option>
          <option value="ALTRO">Altro</option>
        </select>
      </div>

      {/* Reset Button */}
      <div className="w-full md:w-auto shrink-0 flex items-end">
        <button
          onClick={() => {
            setStatus('');
            setPriority('');
            setCategory('');
            setSearch('');
          }}
          className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 border border-black/10 rounded-lg px-4 py-2 text-gray-600 hover:text-black transition-all cursor-pointer uppercase font-bold text-[10px]"
        >
          Azzera
        </button>
      </div>
    </div>
  );
}
