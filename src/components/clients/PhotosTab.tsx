"use client";

import React from "react";
import { ClientProgressPhoto } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { Camera, Calendar } from "lucide-react";

interface PhotosTabProps {
  photos: ClientProgressPhoto[];
}

export default function PhotosTab({ photos }: PhotosTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {language === "ar" ? "معرض صور التطور والمقارنة (Before / After)" : "Progress Photos Gallery"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {photos?.map(p => (
          <div key={p.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{p.date}</span>
              </span>
              <span className="text-xs font-bold text-emerald-400">{p.weightAtTime} KG</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 relative group">
                <img src={p.frontImageUrl || ""} alt="Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute bottom-1.5 inset-x-1.5 py-0.5 bg-slate-950/80 rounded text-[9px] font-bold text-center text-white">
                  أمام / Front
                </span>
              </div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 relative group">
                <img src={p.sideImageUrl || ""} alt="Side" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute bottom-1.5 inset-x-1.5 py-0.5 bg-slate-950/80 rounded text-[9px] font-bold text-center text-white">
                  جانب / Side
                </span>
              </div>
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 relative group">
                <img src={p.backImageUrl || ""} alt="Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute bottom-1.5 inset-x-1.5 py-0.5 bg-slate-950/80 rounded text-[9px] font-bold text-center text-white">
                  خلف / Back
                </span>
              </div>
            </div>

            {p.notes && <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">💡 {p.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}