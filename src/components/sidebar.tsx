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
  width?: number;
}

type NavSection = {
  sectionLabel?: string;
  items: NavItem[];
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: { name: string; href: string }[];
};

const iconTicket = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);
const iconDashboard = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const iconStartup = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const iconUsers = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const iconTms = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zM13 16h2m0-9h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16h-5v-9z" />
  </svg>
);
const iconWms = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const iconCrossdocking = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);
const iconIdeas = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 113.536 0V21h-2v-2.121z" />
  </svg>
);
const iconSchedule = (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);


export default function Sidebar({ user, width }: SidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      sectionLabel: 'PRINCIPALE',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: iconDashboard,
          roles: ['ADMIN', 'HELPDESK'],
        },
      ],
    },
    {
      sectionLabel: 'SEGNALAZIONI UTENTI',
      items: [
        {
          name: 'Ticket',
          href: '/dashboard/tickets',
          icon: iconTicket,
        },
        {
          name: 'Nuove Idee',
          href: '/dashboard/ideas',
          icon: iconIdeas,
          roles: ['ADMIN', 'HELPDESK'],
        },
      ],
    },
    {
      sectionLabel: 'ATTIVITÀ DI SVILUPPO',
      items: [
        {
          name: 'Start Up',
          href: '/dashboard/startup',
          icon: iconStartup,
          roles: ['ADMIN', 'HELPDESK'],
        },
        {
          name: 'TMS',
          href: '/dashboard/tms',
          icon: iconTms,
          roles: ['ADMIN', 'HELPDESK'],
        },
        {
          name: 'WMS',
          href: '/dashboard/wms',
          icon: iconWms,
          roles: ['ADMIN', 'HELPDESK'],
        },
        {
          name: 'Cross Docking',
          href: '/dashboard/crossdocking',
          icon: iconCrossdocking,
          roles: ['ADMIN', 'HELPDESK'],
        },
      ],
    },
    {
      sectionLabel: 'SISTEMA',
      items: [
        {
          name: 'Gestione Utenti',
          href: '/dashboard/users',
          icon: iconUsers,
          roles: ['ADMIN'],
        },
        {
          name: 'Pianificazione Report',
          href: '/dashboard/admin/schedules',
          icon: iconSchedule,
          roles: ['ADMIN'],
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <aside
      className={`flex flex-col shrink-0 font-sans bg-gradient-to-br from-[#003a75] via-[#004B97] to-[#0062b8] ${
        width !== undefined
          ? 'fixed top-0 left-0 bottom-0 z-30 overflow-y-auto'
          : 'w-full'
      }`}
      style={{
        width: width !== undefined ? `${width}px` : undefined,
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-white font-black text-sm shadow select-none shrink-0 border border-white/20">
            L1
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase leading-none truncate">
              Logistica Uno
            </h2>
            <span className="text-[10px] font-mono text-white/50 tracking-widest uppercase mt-0.5 block">
              PORTALE
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-grow px-3 py-4 space-y-1">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            item => !item.roles || item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.sectionLabel} className="mb-2">
              {section.sectionLabel && (
                <p className="px-3 py-1.5 text-[9px] font-bold text-white/35 uppercase tracking-[0.15em] select-none">
                  {section.sectionLabel}
                </p>
              )}
              {visibleItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer mb-0.5 ${
                      active
                        ? 'bg-white/20 text-white shadow-sm border border-white/20'
                        : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <span className={active ? 'text-white' : 'text-white/50'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.name}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#11BCEC] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/10">
          <div className="h-8 w-8 rounded-lg bg-[#11BCEC]/30 border border-[#11BCEC]/40 flex items-center justify-center font-black text-white text-xs uppercase select-none shrink-0">
            {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-grow">
            <span className="block text-xs font-bold text-white truncate leading-tight">{user.name}</span>
            <span className="block text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">{user.role}</span>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
