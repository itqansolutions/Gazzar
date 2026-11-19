"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Clock, ExternalLink } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=15");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data || []);
          setUnreadCount(json.unreadCount || 0);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("[NotificationBell] Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("[NotificationBell] Error marking all read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 sm:p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 bg-brand-crimson text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0c0f17] shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#1f2937] bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-crimson/15 text-brand-crimson border border-brand-crimson/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-brand-crimson hover:underline flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {loading ? "Loading notifications..." : "No notifications yet."}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                    !n.read ? "bg-red-500/5 dark:bg-red-950/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between space-x-2 rtl:space-x-reverse">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-crimson flex-shrink-0" />
                        )}
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {n.title}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => {
                              handleMarkRead(n.id);
                              setOpen(false);
                            }}
                            className="text-brand-crimson hover:underline flex items-center space-x-0.5 rtl:space-x-reverse font-bold"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
