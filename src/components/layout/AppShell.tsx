"use client";

import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex-1 flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 lg:ms-64 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>
      <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}