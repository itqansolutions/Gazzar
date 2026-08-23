"use client";

import React from "react";
import { ClientNote } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { FileText, PlusCircle, Lock, Globe } from "lucide-react";

interface NotesTabProps {
  notes: ClientNote[];
  onOpenModal: () => void;
}

export default function NotesTab({ notes, onOpenModal }: NotesTabProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {language === "ar" ? "سجل الملاحظات (خاصة بالكباتن / عامة للمتدرب)" : "Notes History (Private & Public)"}
        </h3>
        <button
          onClick={onOpenModal}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse shadow-md"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>إضافة ملاحظة</span>
        </button>
      </div>

      <div className="space-y-3">
        {notes?.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            لا توجد ملاحظات مسجلة حتى الآن.
          </div>
        ) : (
          notes?.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border shadow-lg space-y-1.5 transition-all ${
                n.noteType === "PRIVATE_COACH"
                  ? "bg-purple-950/20 border-purple-500/30"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 rtl:space-x-reverse ${
                  n.noteType === "PRIVATE_COACH"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}>
                  {n.noteType === "PRIVATE_COACH" ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>خاصة بالكباتن والإدارة فقط</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>عامة يراها المشترك</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">{n.createdAt.slice(0, 10)}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed pt-1">{n.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}