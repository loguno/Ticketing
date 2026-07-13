"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setShouldShake(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autenticazione fallita.');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setError(errorMessage);
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Autofill helper for demo/testing
  const handleAutofill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}} />

      <main className="relative min-h-screen w-full flex items-center justify-center bg-[#F5F0EB] text-[#0D0D0D] overflow-hidden px-4">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#11BCEC] opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#11BCEC] opacity-[0.015] blur-[100px] rounded-full pointer-events-none"></div>

        {/* Tech Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#000000" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Main Card Container */}
        <div className="relative z-10 w-full max-w-md">
          
          {/* Header branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#11BCEC]/30 bg-[#11BCEC]/5 text-xs text-[#004B97] font-mono tracking-wider uppercase mb-3 font-bold">
              <span className="h-2 w-2 rounded-full bg-[#11BCEC] animate-pulse"></span>
              PORTALE TICKET
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black uppercase font-sans">
              LOGISTICA UNO
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Gestione segnalazioni, attività startup e idee di sviluppo
            </p>
          </div>

          {/* Login Card */}
          <div 
            className={`bg-white border border-black/10 p-8 rounded-2xl shadow-xl transition-all duration-300 ${
              shouldShake ? 'animate-shake border-red-500' : ''
            }`}
          >
            <h2 className="text-xl font-bold text-black mb-6 font-sans">Accedi al sistema</h2>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                <strong>[ERRORE]</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Aziendale
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome.cognome@azienda.it"
                  className="w-full bg-white border border-black/10 rounded-lg px-4 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-black/10 rounded-lg pl-4 pr-12 py-3 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#11BCEC] focus:ring-1 focus:ring-[#11BCEC]/20 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-xs font-mono font-bold uppercase text-gray-450 hover:text-black transition-colors duration-150 select-none"
                    tabIndex={-1}
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#11BCEC] hover:bg-[#004B97] text-white font-semibold py-3 rounded-lg transition-all shadow-xs hover:shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Elaborazione in corso...</span>
                  </>
                ) : (
                  <span>Accedi</span>
                )}
              </button>

            </form>

            {/* DEMO ACCOUNTS QUICK-FILL SECTION */}
            <div className="mt-8 pt-6 border-t border-black/10">
              <span className="block text-xs font-mono text-[#004B97] tracking-widest uppercase mb-3 text-center font-bold">
                [ ACCESSO RAPIDO DEMO ]
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleAutofill('admin@azienda.it', 'AdminPass123!')}
                  className="w-full bg-black/5 hover:bg-black/10 text-gray-700 border border-black/10 rounded-lg py-2 px-3 text-xs font-mono transition-all flex justify-between items-center cursor-pointer"
                >
                  <span>Amministratore (ADMIN)</span>
                  <span className="text-gray-500 font-sans">Seleziona &rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofill('helpdesk-op@azienda.it', 'HelpdeskPass123!')}
                  className="w-full bg-black/5 hover:bg-black/10 text-gray-700 border border-black/10 rounded-lg py-2 px-3 text-xs font-mono transition-all flex justify-between items-center cursor-pointer"
                >
                  <span>Operatore (HELPDESK)</span>
                  <span className="text-gray-500 font-sans">Seleziona &rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAutofill('utente@azienda.it', 'UserPass123!')}
                  className="w-full bg-black/5 hover:bg-black/10 text-gray-700 border border-black/10 rounded-lg py-2 px-3 text-xs font-mono transition-all flex justify-between items-center cursor-pointer"
                >
                  <span>Utente Standard (STANDARD)</span>
                  <span className="text-gray-500 font-sans">Seleziona &rarr;</span>
                </button>
              </div>
            </div>

          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-gray-400 font-mono mt-6 uppercase">
            Sistema On-Premise // Logistica Uno Europe SRL
          </p>

        </div>
      </main>
    </>
  );
}
