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
      className="w-full bg-white hover:bg-black/5 text-[#0D0D0D] font-mono text-xs font-bold uppercase px-4 py-2.5 border border-black/10 hover:border-[#11BCEC]/50 rounded-lg shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 text-center"
    >
      {isLoggingOut ? 'Disconnessione...' : 'Disconnetti'}
    </button>
  );
}
