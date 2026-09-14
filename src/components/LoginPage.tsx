import React, { useState } from 'react';
import { Assistant, UserSession } from '../types';
import { authService } from '../services/authService';

interface LoginPageProps {
  assistants: Assistant[];
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginPage({
  onLoginSuccess,
}: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId) {
      setErrorMessage('يرجى إدخال اسم المستخدم، البريد، أو رقم الهاتف.');
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('يرجى إدخال كلمة المرور.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Authenticate via Supabase Auth & Database
      const result = await authService.login(trimmedId, trimmedPass);

      if (result.success && result.user) {
        if (rememberMe) {
          localStorage.setItem('smart_forge_remember_user', 'true');
        }
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } catch (err: any) {
      setErrorMessage('تعذر الاتصال بخادم المصادقة: ' + (err.message || 'خطأ غير متوقع'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen vibrant-mesh-bg flex flex-col justify-between font-readex relative selection:bg-emerald-600 selection:text-white overflow-hidden">
      {/* Dynamic Ambient Glowing Lights */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Background Decorative Grid Pattern */}
      <div className="absolute inset-0 vibrant-dot-pattern opacity-60 pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#059669] text-white flex items-center justify-center shadow-md border border-slate-700/40">
            <span className="material-symbols-outlined text-2xl text-emerald-400">checkroom</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none tracking-widest font-sans uppercase">
              SAHAB
            </h1>
            <p className="text-[11px] font-black text-emerald-700 mt-1">مصنع سحاب للملابس الجاهزة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>بوابة تشغيل سحابية آمنة</span>
          </div>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-right flex flex-col gap-6">
          {/* Brand & Title */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-600/30">
              <span className="material-symbols-outlined text-3xl">lock_person</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">بوابة تسجيل الدخول</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                نظام الإدارة والتشغيل السحابي - مصنع سحاب
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Identifier Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>اسم المستخدم أو رقم الهاتف:</span>
                <span className="text-[10px] text-slate-400">مطلوب</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="أدخل اسم المستخدم أو رقم الهاتف"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-3 pr-10 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all"
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-lg text-slate-400">
                  account_circle
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>كلمة المرور:</span>
                <span className="text-[10px] text-slate-400">مطلوب</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:bg-white outline-none transition-all"
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-lg text-slate-400">
                  lock
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember me option */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span>تذكر بيانات الجلسة على هذا المتصفح</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 mt-2 ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جارِ التحقق عبر Supabase Auth...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer System Status */}
      <footer className="relative z-10 w-full py-3 px-6 border-t border-slate-200 bg-white/60 text-center text-xs text-slate-500 font-semibold flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>مصنع سحاب © 2026 - نظام إدارة وتشغيل سحابي متكامل</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-emerald-600">shield</span>
            تشفير وحماية الجلسات
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-emerald-600">cloud_done</span>
            اتصال سحابي مباشر
          </span>
        </div>
      </footer>
    </div>
  );
}
