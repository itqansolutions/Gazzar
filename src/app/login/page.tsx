"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Sun,
  Moon
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get("theme");
      if (urlTheme === "dark" || urlTheme === "light") {
        if (theme !== urlTheme) {
          setTheme(urlTheme);
        }
      }
    }
  }, [theme, setTheme]);

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
      const displayMsg = res.message || "Invalid login credentials";
      setErrorMessage(displayMsg);
    }
  };

  const currentTheme = mounted ? theme : "dark";
  const isDark = currentTheme === "dark";

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden transition-colors duration-300 ${
        isDark ? "bg-[#090A0F] text-white" : "bg-[#F4F5F7] text-slate-900"
      }`}
    >
      {/* ======================================================== */}
      {/* FULL-BLEED BACKGROUND COMPOSITION                        */}
      {/* ======================================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <Image
          src={isDark ? "/gx-background-dark.png" : "/gx-background-light.png"}
          alt="GX Fitness Academy"
          fill
          priority
          sizes="100vw"
          className={`transition-opacity duration-300 ${
            // On desktop, pin to left-top to anchor logo; on mobile position to show logo + coach
            isDark
              ? "object-cover object-[24%_top] lg:object-left-top"
              : "object-cover object-[32%_top] lg:object-left-top"
          }`}
        />

        {/* Desktop atmospheric dark mask to conceal extraneous landing pills */}
        {isDark && (
          <div
            className="hidden lg:block absolute left-0 bottom-0 pointer-events-none"
            style={{
              top: "29%",
              bottom: 0,
              width: "360px",
              background: "linear-gradient(to right, #090A0F 85%, rgba(9,10,15,0) 100%)"
            }}
          />
        )}
      </div>

      {/* Theme Toggle Button (Top Right) */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={`p-2.5 rounded-full transition-all duration-200 backdrop-blur-md shadow-lg cursor-pointer ${
            isDark
              ? "bg-black/50 hover:bg-black/70 text-amber-300 border border-white/10"
              : "bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-md"
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* ======================================================== */}
      {/* MAIN CONTENT / LOGIN CARD CONTAINER                      */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-start px-4 sm:px-6 lg:px-0 py-6 sm:py-8 lg:py-0">
        {/* Responsive spacer to position the card right beneath the GX logo signature */}
        {/* On mobile: ~42vh (~290px); On desktop: ~37vh (~330px) */}
        <div className="h-[38vh] sm:h-[40vh] min-h-[250px] max-h-[300px] lg:h-[37vh] lg:min-h-[330px] lg:max-h-[380px] flex-shrink-0" />

        {/* Card wrapper: centered on mobile with comfortable margins, positioned under logo on desktop */}
        <div className="w-full max-w-[390px] sm:max-w-[410px] mx-auto lg:mx-0">
          <div className="lg:ml-[130px] xl:ml-[150px] 2xl:ml-[170px]">
            {/* LOGIN CARD */}
            <div
              className={`w-full rounded-3xl p-6 sm:p-8 transition-all duration-300 backdrop-blur-xl ${
                isDark
                  ? "bg-[#0E1117]/92 border border-[#F01425]/35 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_24px_rgba(240,20,37,0.18)] text-white"
                  : "bg-white/96 border border-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.03)] text-slate-900"
              }`}
            >
              {/* Heading */}
              <div className="mb-6 sm:mb-7">
                <h1 className="text-2xl sm:text-[26px] font-black tracking-tight leading-tight">
                  Welcome{" "}
                  <span className="text-[#F01425] italic font-black">
                    Back
                  </span>
                </h1>
                <p
                  className={`mt-1 text-xs sm:text-sm font-medium ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Your performance starts here
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  className={`mb-5 p-3 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in duration-200 ${
                    isDark
                      ? "bg-red-500/15 border-red-500/30 text-red-300"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#F01425]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                {/* Email Address */}
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      isDark ? "text-slate-400" : "text-slate-400"
                    }`}
                  >
                    <Mail className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl transition-all duration-200 outline-none ${
                      isDark
                        ? "bg-[#181C26]/90 border border-[#2A3142] text-white placeholder-slate-400 focus:border-[#F01425] focus:ring-1 focus:ring-[#F01425]"
                        : "bg-[#F3F4F7] border border-[#DCE0E7] text-slate-900 placeholder-slate-400 focus:border-[#F01425] focus:ring-1 focus:ring-[#F01425]"
                    }`}
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                      isDark ? "text-slate-400" : "text-slate-400"
                    }`}
                  >
                    <Lock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-11 py-3 text-xs sm:text-sm rounded-xl transition-all duration-200 outline-none ${
                      isDark
                        ? "bg-[#181C26]/90 border border-[#2A3142] text-white placeholder-slate-400 focus:border-[#F01425] focus:ring-1 focus:ring-[#F01425]"
                        : "bg-[#F3F4F7] border border-[#DCE0E7] text-slate-900 placeholder-slate-400 focus:border-[#F01425] focus:ring-1 focus:ring-[#F01425]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors cursor-pointer ${
                      isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4 stroke-[1.8]" />
                    ) : (
                      <EyeOff className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </button>
                </div>

                {/* Remember me & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                  <label
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center space-x-2.5 cursor-pointer select-none group"
                  >
                    <div
                      className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all ${
                        rememberMe
                          ? "bg-[#F01425] text-white border border-[#F01425]"
                          : isDark
                          ? "border border-[#384156] bg-[#181C26]/60 group-hover:border-slate-400"
                          : "border border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`font-medium ${
                        isDark
                          ? "text-slate-300 group-hover:text-white"
                          : "text-slate-700 group-hover:text-slate-900"
                      }`}
                    >
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("Please contact your academy administrator to reset your password.");
                    }}
                    className="text-[#F01425] hover:text-red-400 dark:hover:text-red-400 light:hover:text-red-600 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#D60A17] via-[#E61021] to-[#F01425] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-[0_4px_24px_rgba(240,20,37,0.38)] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer mt-3"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* System & Design Attribution */}
        <div className="pt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          <span>Powered & Designed by </span>
          <a
            href="https://itqansolutions.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Itqan Solutions
          </a>
        </div>

        {/* Bottom spacing before viewport edge */}
        <div className="h-6 sm:h-8 flex-shrink-0" />
      </div>
    </div>
  );
}
