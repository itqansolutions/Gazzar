"use client";

import React from "react";
import { ClientCoachAssignment } from "@/types";
import { PlusCircle, Trash2 } from "lucide-react";

interface CoachesTabProps {
  assignments: ClientCoachAssignment[];
  onOpenModal: () => void;
  onUnassign?: (coachId: string) => void;
  isClient?: boolean;
}

export default function CoachesTab({ assignments, onOpenModal, onUnassign, isClient }: CoachesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Assigned Coaches & Specialists
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isClient
              ? "Your dedicated coaching team"
              : "Coaches assigned to this athlete"}
          </p>
        </div>

        {!isClient && (
          <button
            onClick={onOpenModal}
            className="px-3.5 py-1.5 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-xs flex items-center space-x-1 cursor-pointer shadow-md shadow-[0_0_20px_rgba(240,20,37,0.38)]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Assign Coach</span>
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
          No coaches assigned yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {assignments.map(ca => (
            <div
              key={ca.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-brand-crimson text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
                  {ca.coach?.user?.name ? ca.coach.user.name.slice(0, 2) : "CO"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ca.coach?.user?.name || "Coach"}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{ca.coach?.specialties?.join(", ") || "Fitness & Coaching"}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{ca.assignedAt?.slice(0, 10)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  ca.role === "PRIMARY"
                    ? "bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30"
                    : ca.role === "NUTRITIONIST"
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                    : ca.role === "PHYSIOTHERAPIST"
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}>
                  {ca.role === "PRIMARY" ? "Primary" :
                   ca.role === "NUTRITIONIST" ? "Nutritionist" :
                   ca.role === "PHYSIOTHERAPIST" ? "Physio" :
                   "Assistant"}
                </span>

                {!isClient && onUnassign && (
                  <button
                    onClick={() => onUnassign(ca.coachId)}
                    title="Unassign"
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
