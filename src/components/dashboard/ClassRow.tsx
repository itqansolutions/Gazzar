import React from "react";
import Link from "next/link";
import { Dumbbell, ChevronRight } from "lucide-react";

export interface ClassRowProps {
  id: string;
  title: string;
  time: string;
  members: string;
  href?: string;
  icon?: React.ReactNode;
}

export function ClassRow({
  id,
  title,
  time,
  members,
  href = "/calendar",
  icon,
}: ClassRowProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[64px] items-center justify-between gap-3 rounded-control border border-line/60 bg-raised px-4 py-3 transition-all duration-200 hover:border-brand/40 hover:bg-raised/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand transition-transform duration-200 group-hover:scale-105">
          {icon || <Dumbbell className="h-4 w-4" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg group-hover:text-brand transition-colors">
            {title}
          </p>
          <p className="truncate text-xs text-muted mt-0.5">
            {time} · {members}
          </p>
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 flex-shrink-0 text-muted transition-all duration-200 group-hover:text-brand group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export default ClassRow;
