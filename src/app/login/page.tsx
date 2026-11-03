"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Dumbbell,
  Lock,
  Mail,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t, language, dir } = useLanguage();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage(language === "ar" ? "البريد الإلكتروني مطلوب" : "Email is required");
      return;
    }
    if (!password) {
      setErrorMessage(language === "ar" ? "كلمة المرور مطلوبة" : "Password is required");
      return;
    }

    setLoading(true);

    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      setSuccessMessage(language === "ar" ? "تم تسجيل الدخول بنجاح! جاري التوجيه..." : "Logged in successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 400);
    } else {
      setErrorMessage(res.message || (language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid login credentials"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4">
      {/* Brand Header */}
      <div className="max-w-md w-full text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 flex items-center justify-center shadow-xl shadow-red-600/20 mx-auto mb-4 scale-100 hover:scale-105 transition-transform">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          GX Academy
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar" ? "نظام إدارة التدريب الرياضي والكباتن والمشتركين" : "Sports Coaching & Academy Management System"}
        </p>
      </div>

      <div className="max-w-md w-full">
        {/* Email & Password Login Form */}
        <div className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-[#1f2937] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-[#1f2937] pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تسجيل الدخول للنظام" : "Sign In to System"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === "ar" ? "أدخل البريد الإلكتروني وكلمة المرور للمتابعة" : "Enter your email & password to continue"}
              </p>
            </div>
            <Lock className="w-5 h-5 text-red-500" />
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-300 font-bold flex items-center space-x-2 rtl:space-x-reverse animate-in fade-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute top-3 start-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={language === "ar" ? "أدخل بريدك الإلكتروني" : "name@example.com"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {language === "ar" ? "كلمة المرور" : "Password"}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute top-3 start-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full ps-9 pe-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#161c28] border border-slate-200 dark:border-[#1f2937] text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-2.5 end-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{language === "ar" ? "جاري التحقق..." : "Signing in..."}</span>
              ) : (
                <>
                  <span>{language === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
                  {dir === "rtl" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
