'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './logout-button';

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface SidebarProps {
  user: UserInfo;
  /** Width in px. If undefined the sidebar is full width (mobile). */
  width?: number;
}

export default function Sidebar({ user, width }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    ...(user.role !== 'STANDARD' ? [{
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    }] : []),
    {
      name: 'Ticket IT',
      href: '/dashboard/tickets',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    ...(user.role !== 'STANDARD' ? [{
      name: 'Start Up',
      href: '/dashboard/startup',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    }] : []),
  ];

  return (
    <aside
      className="flex flex-col justify-between shrink-0 font-sans bg-white border-r border-black/10"
      style={
        width !== undefined
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${width}px`,
              zIndex: 30,
              overflowY: 'auto',
            }
          : {
              width: '100%',
            }
      }
    >
      {/* Upper section */}
      <div>
        {/* Brand Area */}
        <div className="px-5 py-5 border-b border-black/5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#11BCEC] flex items-center justify-center text-white font-black text-sm shadow-sm select-none shrink-0">
            L1
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-black tracking-tight uppercase leading-none truncate">
              Logistica Uno
            </h2>
            <span className="text-[10px] font-mono text-gray-400 tracking-widest uppercase mt-1 block">
              PORTALE IT
            </span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="p-3 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#11BCEC]/10 text-[#004B97] font-bold border border-[#11BCEC]/20'
                    : 'text-gray-500 hover:text-black hover:bg-black/5 border border-transparent'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-[#004B97]' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profile and Logout Section */}
      <div className="p-4 border-t border-black/5 bg-black/[0.015] space-y-3">
        {/* User Card */}
        <div className="flex items-center gap-3 p-2 bg-white border border-black/5 rounded-xl shadow-xs">
          {/* Avatar with Initials */}
          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs border border-black/5 uppercase select-none shrink-0">
            {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-grow">
            <span className="block text-xs font-bold text-black truncate leading-tight">
              {user.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="bg-[#11BCEC]/10 text-[#004B97] text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#11BCEC]/10 uppercase leading-none">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Logout Button wrapper */}
        <div className="flex justify-center w-full">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
