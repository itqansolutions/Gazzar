"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import GXLogo from "@/components/brand/GXLogo";
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Email address is required");
      return;
    }
    if (!password) {
      setErrorMessage("Password is required");
      return;
    }

    setLoading(true);

    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      router.push("/dashboard");
    } else {
      const displayMsg =
        res.message === "بيانات الدخول غير صحيحة"
          ? "Invalid login credentials"
          : res.message || "Invalid login credentials";
      setErrorMessage(displayMsg);
    }
  };

  return (
    <div className="atmo min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-[#0A0A0B] text-slate-100">
      {/* Texture hatch background */}
      <div className="texture-hatch" />

      {/* Hero Visual Panel (Coach Abdullah) */}
      <div className="relative flex-1 min-h-[420px] lg:min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10">
        {/* Coach Photo Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/login_hero.jpg"
            alt="Coach Abdullah Elgazzar"
            fill
            priority
            className="object-cover object-[62%_14%] filter contrast-[1.05]"
          />
          {/* Multi-layered cinematic athletic gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/30 via-[#0A0A0B]/60 to-[#0A0A0B]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/75 to-transparent lg:via-[#0A0A0B]/40" />
          <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_0%_0%,rgba(240,20,37,0.42),transparent_65%)]" />
        </div>

        {/* Dynamic Athletic Slashes */}
        <div
          className="slash-accent hidden lg:block opacity-85 z-[1]"
          style={{ left: "62%", top: "-40px", width: "120px", height: "540px" }}
        />
        <div
          className="slash-accent hidden lg:block opacity-60 z-[1]"
          style={{ left: "74%", top: "-40px", width: "26px", height: "460px" }}
        />

        {/* Top Header inside Hero */}
        <div className="relative z-10">
          <GXLogo size="xl" priority />
        </div>

        {/* Hero Title & Caption */}
        <div className="relative z-10 max-w-lg mt-auto pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-crimson mb-2">
            GX Fitness Academy
          </p>
          <h1 className="font-title italic font-black uppercase text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.9] tracking-tight mb-4 text-white">
            MANAGE<br />
            TRAIN<br />
            <span className="text-brand-crimson drop-shadow-[0_0_25px_rgba(240,20,37,0.6)]">TRACK</span><br />
            PERFORM
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md">
            One platform for athletes, coaches, programs and memberships. Directed by Coach Abdullah Elgazzar.
          </p>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="flex-1 lg:max-w-[560px] flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[420px] bg-[#141416]/95 border border-[#26262A] rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-brand-crimson mb-2">
            Academy portal
          </p>
          <h2 className="font-title italic font-black uppercase text-3xl sm:text-4xl text-white mb-2 leading-none">
            Welcome back
          </h2>
          <p className="text-xs text-slate-400 mb-8">
            Sign in to manage your academy.
          </p>

          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold flex items-center space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-brand-crimson" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCredentialsLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                EMAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="coach@gxfitness.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-[#1C1C1F] border border-[#26262A] text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson focus:ring-1 focus:ring-brand-crimson transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 text-xs rounded-xl bg-[#1C1C1F] border border-[#26262A] text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson focus:ring-1 focus:ring-brand-crimson transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded bg-[#1C1C1F] border-[#26262A] accent-[#F01425] cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-brand-crimson hover:text-red-400 font-semibold text-xs transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-brand-crimson hover:bg-[#FF2D3B] text-white font-bold text-sm shadow-[0_0_24px_rgba(240,20,37,0.4)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-4"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-8">
            Need access? Contact your academy admin.
          </p>
        </div>
      </div>
    </div>
  );
}
