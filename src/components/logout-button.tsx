"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Errore durante il logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-mono text-xs font-bold uppercase px-4 py-2.5 border border-white/15 hover:border-white/30 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 text-center"
    >
      {isLoggingOut ? 'Disconnessione...' : '⎋ Disconnetti'}
    </button>
  );
}
