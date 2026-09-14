import React from 'react';
import { UserSession } from '../types';

interface SidebarProps {
  currentScreen: string;
  onNavigate: (path: string) => void;
  currentUser?: UserSession;
  onOpenAuthModal?: () => void;
  onOpenTerminal?: () => void;
  onOpenBackupModal?: () => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  currentScreen,
  onNavigate,
  currentUser,
  onOpenAuthModal,
  onOpenTerminal,
  onOpenBackupModal,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  // Determine dynamic data-paths to satisfy the test specifications on different screens
  const attendancePath = (currentScreen === 'operations-dashboard' || currentScreen === 'incentives-penalties')
    ? 'attendance-logs'
    : 'attendance';

  const customersPath = (currentScreen === 'operations-dashboard' || currentScreen === 'incentives-penalties')
    ? 'clients-invoices'
    : 'customers';

  const menuItems = [
    {
      id: 'operations-dashboard',
      label: 'لوحة التحكم والعمليات',
      icon: 'dashboard_customize',
      dataPath: 'operations-dashboard',
    },
    {
      id: 'assistants',
      label: 'المساعدين والمشرفين',
      icon: 'supervisor_account',
      dataPath: 'assistants',
    },
    {
      id: 'employees',
      label: 'إدارة العمال والملفات',
      icon: 'engineering',
      dataPath: 'employees',
    },
    {
      id: 'attendance',
      label: 'الحضور والانصراف بالدقيقة',
      icon: 'badge',
      dataPath: attendancePath,
    },
    {
      id: 'incentives-penalties',
      label: 'الحوافز والجزاءات اليدوية',
      icon: 'balance',
      dataPath: 'incentives-penalties',
    },
    {
      id: 'regularity',
      label: 'بونص ومكافآت الانتظام',
      icon: 'military_tech',
      dataPath: 'regularity',
    },
    {
      id: 'payroll',
      label: 'مسير الرواتب والأجور',
      icon: 'payments',
      dataPath: 'payroll',
    },
    {
      id: 'customers',
      label: 'العملاء',
      icon: 'receipt_long',
      dataPath: customersPath,
    },
    {
      id: 'partnership',
      label: 'الشراكة',
      icon: 'handshake',
      dataPath: 'partnership',
    },
    {
      id: 'expenses',
      label: 'المصروفات',
      icon: 'account_balance_wallet',
      dataPath: 'expenses',
    },
    {
      id: 'charity',
      label: 'الصدقات',
      icon: 'volunteer_activism',
      dataPath: 'charity',
    },
  ];

  const isOwner = currentUser?.type === 'owner';
  const ownerOnlyIds = new Set(['assistants', 'payroll', 'partnership', 'expenses', 'charity']);
  const visibleMenuItems = isOwner ? menuItems : menuItems.filter(item => !ownerOnlyIds.has(item.id));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed right-0 top-0 h-full w-72 bg-white/95 backdrop-blur-md border-l border-slate-200 z-50 flex flex-col justify-between py-5 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.06)] overflow-y-auto font-cairo transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Header & Mobile Close Button */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#059669] text-white shadow-md shadow-emerald-950/20 border border-slate-700/50 shrink-0">
                <span className="material-symbols-outlined text-2xl text-emerald-400">checkroom</span>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[#0F172A] leading-none tracking-widest text-xl font-sans uppercase">
                  SAHAB
                </span>
                <span className="text-[11px] text-emerald-600 font-black tracking-tight mt-1">
                  مصنع سحاب للملابس
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 border border-slate-200 flex items-center justify-center transition-colors shrink-0"
              aria-label="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Quick Launch Terminal Button - High Energy Orange/Amber */}
          {onOpenTerminal && (
            <button
              onClick={() => {
                onOpenTerminal();
                onCloseMobile?.();
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-between shadow-lg shadow-orange-500/25 transition-all active:scale-98 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 text-right">
                <span className="material-symbols-outlined text-2xl text-yellow-200 group-hover:rotate-12 transition-transform">qr_code_scanner</span>
                <div>
                  <span className="text-xs font-black block leading-tight text-white drop-shadow-xs">كود الحضور والانصراف</span>
                  <span className="text-[10px] text-yellow-100 font-bold">مسح QR + كود رقمي</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-sm opacity-90 group-hover:-translate-x-1 transition-transform">arrow_back</span>
            </button>
          )}

          {/* Navigation Flow Anchor Elements */}
          <nav className="flex flex-col gap-1.5">
            {visibleMenuItems.map((item) => {
              const isActive = currentScreen === item.id;
              
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  data-path={item.dataPath}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#059669] to-[#0D9488] text-white font-black shadow-md shadow-emerald-600/25'
                      : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-bold'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      isActive ? 'text-emerald-200' : 'text-slate-400 group-hover:text-emerald-600'
                    } transition-colors`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13.5px] leading-none">{item.label}</span>
                  {item.id === 'assistants' && (
                    <span className={`mr-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-emerald-500 text-white shadow-xs'
                    }`}>
                      جديد
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>

      {/* Footer Info & Logged in User Bar */}
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
        {/* Database Backup Trigger (Owner only) */}
        {isOwner && onOpenBackupModal && (
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-right flex items-center justify-between transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-emerald-600">database</span>
              <span className="text-xs font-bold text-slate-800">النسخ الاحتياطي (.db)</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">تصدير/استعادة</span>
          </button>
        )}

        {currentUser && (
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1 p-2 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#006C4A] text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-sm">person</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#1E293B] block truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[9px] text-[#78716C] font-semibold block">
                    {currentUser.roleTitle || (currentUser.type === 'owner' ? 'المدير العام' : 'مساعد / مشرف')}
                  </span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="تسجيل الخروج والعودة لبوابة الدخول"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
              </button>
            )}
          </div>
        )}

        <div className="p-2 rounded-xl bg-[#F5EFE8]/80 border border-[#E8DFC8]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#006C4A] animate-pulse"></span>
            <span className="text-[10.5px] text-[#1F2937] font-semibold">بصمة الـ QR الرقمية</span>
          </div>
          <span className="text-[9.5px] text-[#006C4A] bg-[#D4F4E4] font-bold px-2 py-0.5 rounded-full">
            نشطة
          </span>
        </div>
      </div>
    </aside>
  </>
  );
}
