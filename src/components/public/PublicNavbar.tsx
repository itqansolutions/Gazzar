"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GXLogo from "@/components/brand/GXLogo";
import { Menu, X, ArrowRight, Phone, Mail } from "lucide-react";

interface PublicNavbarProps {
  whatsappNumber?: string;
}

export default function PublicNavbar({ whatsappNumber = "" }: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Sports", href: "#sports" },
    { label: "Championships", href: "#championships" },
    { label: "Coaches", href: "#coaches" },
    { label: "Memberships", href: "#packages" },
    { label: "Offers", href: "#offers" },
    { label: "Contact", href: "#contact" }
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        setMobileMenuOpen(false);
      }
    }
  };

  const cleanWhatsApp = (whatsappNumber || "").replace(/[^0-9]/g, "");
  const hasWhatsApp = Boolean(cleanWhatsApp);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#09090f]/90 backdrop-blur-md border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-gradient-to-b from-[#09090f]/90 via-[#09090f]/60 to-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none py-2">
            <GXLogo size="md" priority forceTheme="dark" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons (Desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            {hasWhatsApp ? (
              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                  "Hello GX Fitness Academy, I have an inquiry about memberships and training programs."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all min-h-[44px]"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            ) : (
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all min-h-[44px]"
              >
                <Mail className="w-3.5 h-3.5 text-muted" />
                <span>Contact</span>
              </a>
            )}

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_2px_16px_rgba(225,29,72,0.35)] transition-all min-h-[44px]"
            >
              <span>Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger & Login Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Login
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0e0e16] border-b border-white/[0.08] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 pt-1 pb-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[44px] flex items-center"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-2">
            {hasWhatsApp && (
              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(
                  "Hello GX Fitness Academy, I have an inquiry about memberships and training programs."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                <span>Contact via WhatsApp</span>
              </a>
            )}

            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-[0_2px_16px_rgba(225,29,72,0.35)] min-h-[44px]"
            >
              <span>Athlete Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
