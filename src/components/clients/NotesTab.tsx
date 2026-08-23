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
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === "ar" ? "ملاحظات الكباتن والمتابعة" : "Coach Notes"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === "ar" ? "الملاحظات الإدارية والفنية الخاصة بالكباتن" : "Private coach notes"}
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1 rtl:space-x-reverse cursor-pointer shadow-md shadow-purple-600/30"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{language === "ar" ? "إضافة ملاحظة" : "Add Note"}</span>
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          {language === "ar" ? "لا توجد ملاحظات مسجلة بعد." : "No notes yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white font-mono">{n.createdAt?.slice(0, 10)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 rtl:space-x-reverse ${
                  n.noteType === "PRIVATE_COACH"
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}>
                  {n.noteType === "PRIVATE_COACH" ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                  <span>{n.noteType === "PRIVATE_COACH" ? "خاصة بالكباتن" : "عامة للمتدرب"}</span>
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {n.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
