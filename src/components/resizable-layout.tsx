'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './sidebar';

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface ResizableLayoutProps {
  user: UserInfo;
  children: React.ReactNode;
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 256;

export default function ResizableLayout({ user, children }: ResizableLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    // On SSR, window is not available, default to 256
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT;
    const saved = localStorage.getItem('sidebar-width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= SIDEBAR_MIN && parsed <= SIDEBAR_MAX) return parsed;
    }
    return SIDEBAR_DEFAULT;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Window-level mouse handlers for drag — fired even when cursor leaves the handle
  const handleWindowMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX));
    setSidebarWidth(newWidth);
    localStorage.setItem('sidebar-width', String(newWidth));
  }, []);

  const handleWindowMouseUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const effectiveSidebarWidth = isMobile ? 0 : sidebarWidth;

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#F5F0EB]">
      {/* Sidebar */}
      {!isMobile && (
        <Sidebar user={user} width={sidebarWidth} />
      )}

      {/* Mobile sidebar (full width, stacked) */}
      {isMobile && (
        <Sidebar user={user} width={undefined} />
      )}

      {/* Drag handle — desktop only */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          title="Trascina per ridimensionare"
          style={{ left: `${sidebarWidth}px` }}
          className={`fixed top-0 bottom-0 z-40 w-1.5 cursor-col-resize transition-colors select-none group ${
            isDragging
              ? 'bg-[#004B97]'
              : 'bg-black/10 hover:bg-[#11BCEC]'
          }`}
        >
          {/* Visual grip dots */}
          <div className="absolute inset-y-0 left-0 right-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-0.5 h-4 bg-white/60 rounded-full" />
          </div>
        </div>
      )}

      {/* Main content — offset by sidebar width on desktop */}
      <div
        className="flex-grow flex flex-col min-w-0"
        style={{ paddingLeft: isMobile ? 0 : `${effectiveSidebarWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}
