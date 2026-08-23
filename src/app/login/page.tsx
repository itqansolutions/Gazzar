"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  Dumbbell,
  Shield,
  Lock,
  Mail,
  CheckCircle,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t, language, dir } = useLanguage();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("admin@gazzar.com");
  const [password, setPassword] = useState("A@123456");
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
    setLoading(true);

    const res = await login(email.trim(), password.trim());
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

  const handleFillAdmin = () => {
    setEmail("admin@gazzar.com");
    setPassword("A@123456");
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4">
      {/* Brand Header */}
      <div className="max-w-md w-full text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mx-auto mb-4 scale-100 hover:scale-105 transition-transform">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {language === "ar" ? "أكاديمية الجزار للتدريب الرياضي" : "Gazzar Sports Academy"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {language === "ar" ? "نظام إدارة التدريب الرياضي والكباتن والمشتركين" : "Sports Coaching & Academy Management System"}
        </p>
      </div>

      <div className="max-w-md w-full">
        {/* Email & Password Login Form */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تسجيل الدخول للنظام" : "Sign In to System"}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === "ar" ? "أدخل البريد الإلكتروني وكلمة المرور للمتابعة" : "Enter your email & password to continue"}
              </p>
            </div>
            <Lock className="w-5 h-5 text-emerald-500" />
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
                <Mail className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@gazzar.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === "ar" ? "كلمة المرور" : "Password"}
                </label>
                <button
                  type="button"
                  onClick={handleFillAdmin}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1 rtl:space-x-reverse"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{language === "ar" ? "بيانات الأدمن" : "Admin credentials"}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute top-3 start-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 rtl:space-x-reverse">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>{language === "ar" ? "حساب مدير النظام الرئيسي:" : "Default Admin Account:"}</span>
              </p>
              <div className="flex items-center justify-between font-mono text-[11px] pt-0.5">
                <span>Email: <strong className="text-emerald-600 dark:text-emerald-400">admin@gazzar.com</strong></span>
                <span>Pass: <strong className="text-emerald-600 dark:text-emerald-400">A@123456</strong></span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 rtl:space-x-reverse disabled:opacity-50 cursor-pointer"
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
