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

      // Successful login
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Si è verificato un errore.';
      setError(errorMessage);
      setShouldShake(true);
      // Reset shake animation after 500ms
      setTimeout(() => setShouldShake(false), 500);
    } finally {
      setIsLoading(false);
    }
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
          border-color: var(--error) !important;
        }
      `}} />

      <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#F5F0EB]">
        {/* Left Visual Panel: 70% width on large screens */}
        <section className="relative w-full md:w-[70%] bg-[#0D0D0D] flex flex-col justify-between p-8 md:p-16 overflow-hidden border-b-4 md:border-b-0 md:border-r-4 border-black">
          {/* Diagonal Industrial SVG Grid Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="diagonal-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 0 40 L 40 0 M 0 0 L 40 40" fill="none" stroke="#E85D04" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diagonal-grid)" />
            </svg>
          </div>

          {/* Absolute Accent Line */}
          <div className="absolute top-0 left-0 w-full h-2 bg-[#E85D04]"></div>

          {/* Top Logo area */}
          <div className="z-10 flex items-center gap-3 font-mono text-sm tracking-wider text-white">
            <span className="h-4 w-4 bg-[#E85D04] inline-block animate-pulse"></span>
            <span>SYSTEM OVERWATCH // IT INFRASTRUCTURE</span>
          </div>

          {/* Core Branding Text */}
          <div className="z-10 my-auto py-12 md:py-0">
            <span className="text-xs font-mono text-[#E85D04] tracking-widest block uppercase mb-2">
              [ SEGNALAZIONE E TRIAGE INCIDENTI ]
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter uppercase leading-none font-mono">
              PORTALE<br />
              <span className="text-[#E85D04]">TICKET</span><br />
              AZIENDALI
            </h1>
            <p className="mt-6 text-sm md:text-base text-gray-400 font-mono max-w-lg leading-relaxed">
              Sistema integrato per la risoluzione dei disservizi tecnici, tracciamento startup clienti e sviluppo nuove idee IT.
            </p>
          </div>

          {/* Footer Metadata */}
          <div className="z-10 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs text-gray-500 uppercase mt-auto">
            <div>LOGISTICA UNO EUROPE IT</div>
            <div>REV: 2026.1 // ON-PREMISE</div>
          </div>
        </section>

        {/* Right Form Panel: 30% width on large screens */}
        <section className="w-full md:w-[30%] bg-[#F5F0EB] flex flex-col justify-center p-8 md:p-12">
          <div className={`w-full max-w-sm mx-auto transition-transform ${shouldShake ? 'animate-shake' : ''}`}>
            
            {/* Form Title */}
            <div className="mb-8">
              <h2 className="text-2xl font-black uppercase text-[#0D0D0D] tracking-tight font-mono">
                AUTENTICAZIONE
              </h2>
              <div className="h-1 w-12 bg-[#E85D04] mt-2"></div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-white border-l-4 border-[#D62839] text-[#D62839] text-xs font-mono uppercase tracking-wider">
                <strong>[ERRORE AT]</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input Field */}
              <div className="relative border-2 border-black bg-white focus-within:border-[#E85D04] transition-colors duration-150 p-2">
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer w-full bg-transparent border-none text-[#0D0D0D] font-mono text-sm focus:outline-none p-1 pt-4 pb-1"
                  placeholder=" "
                  disabled={isLoading}
                />
                <label
                  htmlFor="email"
                  className="absolute left-3 top-2.5 text-xs text-gray-500 font-mono uppercase transition-all duration-150 origin-left
                    peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5
                    peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#E85D04]
                    peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-1"
                >
                  EMAIL AZIENDALE
                </label>
              </div>

              {/* Password Input Field */}
              <div className="relative border-2 border-black bg-white focus-within:border-[#E85D04] transition-colors duration-150 p-2 flex items-center justify-between">
                <div className="relative flex-grow">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="peer w-full bg-transparent border-none text-[#0D0D0D] font-mono text-sm focus:outline-none p-1 pt-4 pb-1"
                    placeholder=" "
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-1 top-2.5 text-xs text-gray-500 font-mono uppercase transition-all duration-150 origin-left
                      peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5
                      peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#E85D04]
                      peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-1"
                  >
                    PASSWORD
                  </label>
                </div>
                
                {/* Visual/occultamento password button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-mono font-bold uppercase text-[#0D0D0D] hover:text-[#E85D04] px-2 py-1 select-none transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showPassword ? "NASCONDI" : "MOSTRA"}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E85D04] hover:bg-[#C94E03] text-white font-mono font-bold uppercase py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>ATTENDI...</span>
                  </>
                ) : (
                  <span>ACCEDI AL SISTEMA</span>
                )}
              </button>

            </form>

            {/* Support info link */}
            <div className="mt-8 pt-6 border-t border-gray-300 flex flex-col gap-1 text-center font-mono text-xs text-gray-500 uppercase">
              <span>Difficoltà di accesso?</span>
              <span className="text-[#0D0D0D]">Contattare assistenza interna</span>
            </div>

          </div>
        </section>
      </main>
    </>
  );
}
