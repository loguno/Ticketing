'use client';

import React, { useState } from 'react';

type Role = 'ADMIN' | 'HELPDESK' | 'STANDARD';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

interface Props {
  users: User[];
  currentUserId: string;
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN:    'bg-red-100 text-red-800 border-red-200',
  HELPDESK: 'bg-blue-100 text-blue-800 border-blue-200',
  STANDARD: 'bg-gray-100 text-gray-700 border-gray-200',
};

type ModalType = 'create' | 'edit' | 'reset' | 'delete' | null;

export default function UsersClient({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<Role>('STANDARD');
  const [formPassword, setFormPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => {
    setFormName(''); setFormEmail(''); setFormRole('STANDARD'); setFormPassword('');
    setModal('create');
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setFormName(u.name); setFormEmail(u.email); setFormRole(u.role); setFormPassword('');
    setModal('edit');
  };

  const openReset = (u: User) => {
    setSelectedUser(u); setFormPassword('');
    setModal('reset');
  };

  const openDelete = (u: User) => {
    setSelectedUser(u);
    setModal('delete');
  };

  const closeModal = () => { setModal(null); setSelectedUser(null); };

  // --- API calls ---
  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setFormLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Errore creazione', 'err'); return; }
      setUsers(prev => [...prev, data.user].sort((a, b) => a.name.localeCompare(b.name)));
      showToast(`Utente "${data.user.name}" creato con successo.`);
      closeModal();
    } finally { setFormLoading(false); }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, role: formRole }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Errore modifica', 'err'); return; }
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? data.user : u));
      showToast('Utente aggiornato con successo.');
      closeModal();
    } finally { setFormLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !formPassword) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: formPassword }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Errore reset', 'err'); return; }
      showToast(`Password di "${selectedUser.name}" reimpostata con successo.`);
      closeModal();
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Errore eliminazione', 'err'); return; }
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      showToast(`Utente "${selectedUser.name}" eliminato.`);
      closeModal();
    } finally { setFormLoading(false); }
  };

  return (
    <main className="flex-grow p-6 md:p-10 font-sans bg-[#F8FAFC] min-h-screen">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-sm font-semibold transition-all ${
          toast.type === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{toast.type === 'ok' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#004B97] uppercase tracking-widest mb-1">Gestione</p>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestione Utenti</h1>
            <p className="text-sm text-gray-500 mt-1">{users.length} utenti registrati nel sistema</p>
          </div>
          <button
            id="btn-nuovo-utente"
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#004B97] hover:bg-[#003a75] text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Utente
          </button>
        </div>

        {/* Role summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs uppercase">
          {(['ADMIN', 'HELPDESK', 'STANDARD'] as Role[]).map(r => {
            const count = users.filter(u => u.role === r).length;
            const borderCol = r === 'ADMIN' ? '#EF4444' : r === 'HELPDESK' ? '#004B97' : '#9ca3af';
            const labelBg = r === 'ADMIN' ? '#EF444420' : r === 'HELPDESK' ? '#004B9720' : '#9ca3af20';
            const labelText = r === 'ADMIN' ? '#dc2626' : r === 'HELPDESK' ? '#004B97' : '#4b5563';
            return (
              <div key={r} className="bg-white rounded-2xl border border-black/[0.07] p-6 flex flex-col items-center justify-between min-h-[110px] shadow-xs hover:shadow-sm transition-all border-l-4"
                style={{ borderLeftColor: borderCol }}>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-full">{r}</span>
                <div className="flex items-center justify-center gap-3 mt-3 w-full">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">{count}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0"
                    style={{ background: labelBg, color: labelText }}>
                    UTENTI
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-black/[0.07] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">Lista Utenti</h2>
            <span className="text-xs text-gray-400">{users.length} risultati</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-xs uppercase text-gray-500 tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5 text-left">Utente</th>
                  <th className="px-6 py-3.5 text-left">Email</th>
                  <th className="px-6 py-3.5 text-left">Ruolo</th>
                  <th className="px-6 py-3.5 text-left">Registrato</th>
                  <th className="px-6 py-3.5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#11BCEC] to-[#004B97] flex items-center justify-center text-white font-black text-xs uppercase select-none shrink-0">
                          {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{u.name}</span>
                          {u.id === currentUserId && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Tu</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                      {new Date(u.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit */}
                        <button
                          id={`btn-edit-${u.id}`}
                          onClick={() => openEdit(u)}
                          title="Modifica"
                          className="p-2 rounded-lg text-gray-400 hover:text-[#004B97] hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Reset Password */}
                        <button
                          id={`btn-reset-${u.id}`}
                          onClick={() => openReset(u)}
                          title="Reset Password"
                          className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        {u.id !== currentUserId && (
                          <button
                            id={`btn-delete-${u.id}`}
                            onClick={() => openDelete(u)}
                            title="Elimina"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === MODALS === */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-black/10 overflow-hidden">

            {/* Create / Edit modal */}
            {(modal === 'create' || modal === 'edit') && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-black/[0.06]">
                  <h3 className="text-lg font-black text-gray-900">
                    {modal === 'create' ? 'Nuovo Utente' : `Modifica: ${selectedUser?.name}`}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nome completo</label>
                    <input
                      id="input-nome"
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Mario Rossi"
                      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/40 focus:border-[#11BCEC] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      id="input-email"
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="mario.rossi@logisticauno.com"
                      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/40 focus:border-[#11BCEC] bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Ruolo</label>
                    <select
                      id="input-ruolo"
                      value={formRole}
                      onChange={e => setFormRole(e.target.value as Role)}
                      className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/40 focus:border-[#11BCEC] bg-gray-50"
                    >
                      <option value="STANDARD">STANDARD</option>
                      <option value="HELPDESK">HELPDESK</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  {modal === 'create' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Password iniziale</label>
                      <input
                        id="input-password"
                        type="password"
                        value={formPassword}
                        onChange={e => setFormPassword(e.target.value)}
                        placeholder="Minimo 8 caratteri"
                        className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/40 focus:border-[#11BCEC] bg-gray-50"
                      />
                    </div>
                  )}
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={closeModal} className="flex-1 border border-black/10 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    Annulla
                  </button>
                  <button
                    id={modal === 'create' ? 'btn-confirm-create' : 'btn-confirm-edit'}
                    onClick={modal === 'create' ? handleCreate : handleEdit}
                    disabled={formLoading}
                    className="flex-1 bg-[#004B97] hover:bg-[#003a75] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    {formLoading ? 'Salvataggio...' : modal === 'create' ? 'Crea Utente' : 'Salva Modifiche'}
                  </button>
                </div>
              </>
            )}

            {/* Reset Password modal */}
            {modal === 'reset' && (
              <>
                <div className="px-6 pt-6 pb-4 border-b border-black/[0.06]">
                  <h3 className="text-lg font-black text-gray-900">Reset Password</h3>
                  <p className="text-sm text-gray-500 mt-1">Per: <strong>{selectedUser?.name}</strong></p>
                </div>
                <div className="p-6">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nuova Password</label>
                  <input
                    id="input-new-password"
                    type="password"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="Minimo 8 caratteri"
                    className="w-full border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#11BCEC]/40 focus:border-[#11BCEC] bg-gray-50"
                  />
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={closeModal} className="flex-1 border border-black/10 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    Annulla
                  </button>
                  <button
                    id="btn-confirm-reset"
                    onClick={handleResetPassword}
                    disabled={formLoading || formPassword.length < 8}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    {formLoading ? 'Salvataggio...' : 'Reimposta Password'}
                  </button>
                </div>
              </>
            )}

            {/* Delete confirmation modal */}
            {modal === 'delete' && (
              <>
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Elimina Utente</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Questa azione è irreversibile.</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 bg-red-50 border border-red-100 rounded-xl p-4">
                    Stai per eliminare definitivamente l&apos;account di <strong>{selectedUser?.name}</strong> ({selectedUser?.email}). I ticket a lui assegnati rimarranno nel sistema.
                  </p>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={closeModal} className="flex-1 border border-black/10 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    Annulla
                  </button>
                  <button
                    id="btn-confirm-delete"
                    onClick={handleDelete}
                    disabled={formLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    {formLoading ? 'Eliminazione...' : 'Sì, Elimina'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
