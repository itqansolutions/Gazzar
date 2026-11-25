"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const POLL_MS = 120_000;

/**
 * Detects a new deploy while a tab is open. When the server build id differs from the one this
 * page was built with: reload automatically on the next navigation, and show a Refresh banner meanwhile.
 */
export default function VersionWatcher({ buildId }: { buildId: string }) {
  const CURRENT = buildId;
  const [stale, setStale] = useState(false);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && data?.buildId && CURRENT !== "dev" && data.buildId !== CURRENT) setStale(true);
      } catch {
        /* offline: try again later */
      }
    };
    check();
    const t = setInterval(check, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (stale) {
      // reload at most once per new build (never loop)
      try {
        if (sessionStorage.getItem("gx_reloaded_for") === String(CURRENT)) return;
        sessionStorage.setItem("gx_reloaded_for", String(CURRENT));
      } catch {}
      window.location.reload();
    }
  }, [pathname, stale]);

  if (!stale) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-2xl bg-slate-900 text-white border border-brand-crimson/50 px-4 py-2.5 shadow-2xl text-xs font-bold">
      <span>A new version is available</span>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 rounded-lg bg-brand-crimson hover:bg-[#FF2D3B] text-white"
      >
        Refresh
      </button>
    </div>
  );
}
