import React, { useState, useEffect, useRef } from 'react';
import { UserSession } from '../types';

interface HeaderProps {
  currentUser?: UserSession;
  dbConnected?: boolean;
  isSaving?: boolean;
  onOpenAuthModal?: () => void;
  onOpenTerminal?: () => void;
  onOpenBackupModal?: () => void;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  currentUser,
  dbConnected = true,
  isSaving = false,
  onOpenAuthModal,
  onOpenTerminal,
  onOpenBackupModal,
  onLogout,
  onToggleMobileMenu,
}: HeaderProps) {
  const [time, setTime] = useState(() => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  });

  const [dateFormatted, setDateFormatted] = useState(() => {
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'بصمة الوردية الصباحية',
      description: 'تم تسجيل حضور عمال الوردية الصباحية بنجاح عبر المشرفين والـ QR',
      time: 'منذ 10 دقائق',
      unread: true,
      icon: 'badge',
      color: 'text-[#006C4A] bg-[#E8FAF1]'
    },
    {
      id: 2,
      title: 'إيداع خامات جديد',
      description: 'تم توثيق إيصال استلام خامات في الخزينة بمبلغ 15,000 ج.م',
      time: 'منذ ساعة',
      unread: true,
      icon: 'receipt_long',
      color: 'text-[#1D4ED8] bg-[#EFF6FF]'
    },
    {
      id: 3,
      title: 'استحقاق صرف أرباح',
      description: 'اكتملت موازنة توزيع أرباح الشركاء وجاهزة للمراجعة',
      time: 'منذ ساعتين',
      unread: false,
      icon: 'handshake',
      color: 'text-[#B45309] bg-[#FFFBEB]'
    }
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Live factory clock and date ticks
    const updateDateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = hours.toString().padStart(2, '0');
      setTime(`${formattedHours}:${minutes}:${seconds} ${ampm}`);

      setDateFormatted(
        new Intl.DateTimeFormat('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleDismiss = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const user = currentUser || {
    type: 'owner',
    id: 'OWNER-01',
    name: 'محمد صلاح',
    username: 'admin',
    roleTitle: 'المدير العام',
    phone: '01098452103',
  };

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 sm:h-18 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 px-3 sm:px-6 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.03)] font-cairo">
      {/* Right Side: Hamburger Button (Mobile) + Brand Logo (Mobile) + Status Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Drawer Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="فتح القائمة الجانبية"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
        )}

        {/* Mobile Brand Logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#059669] text-white flex items-center justify-center shadow-xs border border-slate-700/40">
            <span className="material-symbols-outlined text-lg text-emerald-400">checkroom</span>
          </div>
          <span className="font-black text-slate-900 tracking-wider text-base font-sans uppercase">
            SAHAB
          </span>
        </div>

        {/* Desktop Status Badges & Quick Action */}
        {/* Desktop Status Badges & Quick Action */}
        <button
          type="button"
          onClick={currentUser?.type === 'owner' ? onOpenBackupModal : undefined}
          title={currentUser?.type === 'owner' ? "انقر لعرض تفاصيل قاعدة البيانات ومزامنة السحابة" : "حالة الاتصال السحابي"}
          className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black transition-all ${currentUser?.type === 'owner' ? 'cursor-pointer hover:scale-102 active:scale-98' : 'cursor-default'} shadow-2xs ${
            dbConnected
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:bg-emerald-100/90'
              : 'bg-amber-50/90 border-amber-300 text-amber-950 hover:bg-amber-100/90'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dbConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                dbConnected ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            ></span>
          </span>
          <span>
            {dbConnected
              ? 'قاعدة البيانات السحابية (Supabase)'
              : 'الوضع المحلي الآمن (Offline Ready)'}
          </span>
          <span className={dbConnected ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>|</span>
          <span className={dbConnected ? 'text-emerald-800 font-bold' : 'text-amber-800 font-bold'}>
            {isSaving ? 'جارِ المزامنة السحابية...' : dbConnected ? 'سحابية متزامنة اللحظة' : 'محفوظ محلياً بنجاح'}
          </span>
          {currentUser?.type === 'owner' && (
            <span className="material-symbols-outlined text-xs text-slate-500">settings</span>
          )}
        </button>

        {onOpenTerminal && (
          <button
            onClick={onOpenTerminal}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500/30 text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-slate-950">qr_code_scanner</span>
            <span>كود الحضور والانصراف</span>
          </button>
        )}

        {currentUser?.type === 'owner' && onOpenBackupModal && (
          <button
            onClick={onOpenBackupModal}
            className="hidden xl:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-black transition-all cursor-pointer"
            title="تحميل نسخة احتياطية من قاعدة البيانات JSON"
          >
            <span className="material-symbols-outlined text-sm text-emerald-600">database</span>
            <span>نسخ احتياطي</span>
          </button>
        )}
      </div>

      {/* Clock & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Central clock and date */}
        <div className="hidden md:flex flex-col text-right pl-3 border-l border-slate-200">
          <span className="text-xs text-slate-900 font-black">{dateFormatted}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 justify-end">
            <span className="material-symbols-outlined text-[13px] text-emerald-600">schedule</span>
            <span className="font-mono font-bold text-slate-700">{time}</span>
          </div>
        </div>

        {/* Industrial Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            aria-label="التنبيهات الصناعية"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">notifications_active</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-orange-600 ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden text-right animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-600">notifications</span>
                  <span className="text-xs font-black text-slate-900">إشعارات وتنبيهات المصنع</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black shadow-xs">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    تعيين الكل كمقروء
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-semibold">
                    لا توجد إشعارات جديدة حالياً
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3.5 flex items-start gap-3 transition-colors ${
                        n.unread ? 'bg-amber-50/40' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                        <span className="material-symbols-outlined text-base">{n.icon}</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{n.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismiss(n.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="حذف الإشعار"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card (Profile Status Badge) */}
        <div
          className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl bg-slate-50 border border-slate-200 select-none"
        >
          <div className="flex flex-col text-right">
            <span className="text-xs text-slate-900 font-black">
              {user.name}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">{user.roleTitle}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#059669] to-[#0D9488] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-600/20">
            <span className="material-symbols-outlined text-lg">person</span>
          </div>
        </div>

        {/* Dedicated Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer hover:shadow-xs active:scale-95"
            title="تسجيل الخروج والعودة لبوابة الدخول"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
