"use client";

import React from "react";
import { MessageCircle } from "lucide-react";

interface FloatingWhatsAppProps {
  whatsappNumber?: string;
  defaultMessage?: string;
}

export default function FloatingWhatsApp({
  whatsappNumber = "",
  defaultMessage = "Hello GX Fitness Academy, I would like to inquire about memberships and academy programs."
}: FloatingWhatsAppProps) {
  const cleanNumber = (whatsappNumber || "").replace(/[^0-9]/g, "");
  if (!cleanNumber) return null;

  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <aside
      aria-label="Direct WhatsApp Contact"
      className="fixed bottom-6 right-6 z-50 flex items-center group"
    >
      {/* Tooltip / Label on Hover */}
      <div className="hidden sm:block mr-3 px-3 py-1.5 rounded-xl bg-[#141724]/95 text-white text-xs font-bold border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        Chat with Admissions
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="relative w-14 h-14 min-w-[48px] min-h-[48px] rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(16,185,129,0.45)] hover:scale-110 active:scale-95 transition-all duration-300"
      >
        {/* Animated Radar Pulse Effect */}
        <span className="absolute -inset-1 rounded-full bg-emerald-500/40 animate-ping pointer-events-none" />

        <MessageCircle className="w-7 h-7 fill-white text-emerald-500 relative z-10" />
      </a>
    </aside>
  );
}
