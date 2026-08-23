"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { Dumbbell, Shield, UserCheck, Users, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t, language, dir } = useLanguage();
  const { loginAsRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleDemoLogin = (role: UserRole) => {
    loginAsRole(role);
    router.push("/dashboard");
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsRole("ADMIN");
    router.push("/dashboard");
  };

  const demoRoles: { role: UserRole; title: string; subtitle: string; icon: any; color: string; email: string }[] = [
    {
      role: "ADMIN",
      title: language === "ar" ? "مدير الأكاديمية (Admin)" : "System Admin",
      subtitle: language === "ar" ? "رؤية كاملة، إدارة الكباتن، الصلاحيات والتقارير" : "Full access, coaches management & analytics",
      icon: Shield,
      color: "from-purple-600 to-indigo-700",
      email: "admin@gazzar.com"
    },
    {
      role: "HEAD_COACH",
      title: language === "ar" ? "كبير المدربين (Head Coach)" : "Head Coach",
      subtitle: language === "ar" ? "إشراف على جميع الكباتن والمشتركين والبرامج" : "Supervise all coaches, athletes & programs",
      icon: UserCheck,
      color: "from-blue-600 to-cyan-700",
      email: "headcoach@gazzar.com"
    },
    {
      role: "COACH",
      title: language === "ar" ? "كابتن تدريب (Coach)" : "Personal Coach",
      subtitle: language === "ar" ? "رؤية متدربيه فقط، تعيين التمارين، وتسجيل القياسات" : "Assigned athletes, workout assignments & progress",
      icon: Dumbbell,
      color: "from-emerald-600 to-teal-700",
      email: "ali@gazzar.com"
    },
    {
      role: "CLIENT",
      title: language === "ar" ? "مشترك / لاعب (Client)" : "Client Athlete",
      subtitle: language === "ar" ? "تمرين اليوم، مسجل الأداء الحي، وتتبع الأهداف" : "Today workout, live logging & goal tracking",
      icon: Users,
      color: "from-amber-600 to-orange-700",
      email: "mohamed@gmail.com"
    }
  ];

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="max-w-md w-full text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-600 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 mx-auto mb-4">
          <Dumbbell className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {language === "ar" ? "أكاديمية الجزار للتدريب الرياضي" : "Gazzar Sports Academy"}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {language === "ar" ? "بوابة تسجيل الدخول واختبار الصلاحيات" : "Sign in & Role-Based Access Portal"}
        </p>
      </div>

      {/* Demo Quick 1-Click Role Login */}
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>{language === "ar" ? "الدخول الفوري بنقرة واحدة (حسابات تجريبية):" : "1-Click Demo Quick Login:"}</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {demoRoles.map(dr => {
            const Icon = dr.icon;
            return (
              <button
                key={dr.role}
                onClick={() => handleDemoLogin(dr.role)}
                className="group relative flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 hover:border-emerald-500/50 transition-all text-start"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dr.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{dr.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{dr.subtitle}</p>
                  </div>
                </div>
                {dir === "rtl" ? <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-1 transition-all" /> : <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Login Form */}
      <form onSubmit={handleCustomLogin} className="max-w-md w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {language === "ar" ? "أو تسجيل الدخول بالبريد الإلكتروني:" : "Or sign in with email:"}
        </h3>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@gazzar.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            {language === "ar" ? "كلمة المرور" : "Password"}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all"
        >
          {language === "ar" ? "دخول النظام" : "Sign In"}
        </button>
      </form>
    </div>
  );
}