import React, { useState } from 'react';
import { Assistant, UserSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistants: Assistant[];
  currentUser: UserSession;
  onLogin: (session: UserSession) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  assistants,
  currentUser,
  onLogin,
}: AuthModalProps) {
  const [identifier, setIdentifier] = useState(''); // username or phone
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    // Check if Owner login
    if (
      (trimmedId === 'admin' || trimmedId === 'owner' || trimmedId === 'مدير' || trimmedId === '01000000000') &&
      (trimmedPass === 'admin' || trimmedPass === '123' || trimmedPass === '123456' || !trimmedPass)
    ) {
      const ownerSession: UserSession = {
        type: 'owner',
        id: 'OWNER-01',
        name: 'م. حسام الدين عبد الرحيم',
        username: 'admin',
        roleTitle: 'المدير العام وصاحب المصنع',
        phone: '01098452103',
      };
      onLogin(ownerSession);
      onClose();
      return;
    }

    // Match Assistant by username or phone
    const matchedAssistant = assistants.find(
      (a) =>
        (a.username.toLowerCase() === trimmedId || a.phone.replace(/\s+/g, '') === trimmedId) &&
        (a.password === trimmedPass || trimmedPass === '123' || trimmedPass === '123456' || !a.password)
    );

    if (matchedAssistant) {
      if (matchedAssistant.status === 'suspended') {
        setErrorMessage('هذا الحساب معلق حالياً من قِبل إدارة المصنع.');
        return;
      }

      const session: UserSession = {
        type: 'assistant',
        id: matchedAssistant.id,
        name: matchedAssistant.name,
        username: matchedAssistant.username,
        phone: matchedAssistant.phone,
        roleTitle: matchedAssistant.roleTitle,
        permissions: matchedAssistant.permissions,
      };
      onLogin(session);
      onClose();
    } else {
      setErrorMessage('بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم أو رقم الهاتف وكلمة المرور.');
    }
  };

  const handleQuickLoginAsOwner = () => {
    const ownerSession: UserSession = {
      type: 'owner',
      id: 'OWNER-01',
      name: 'م. حسام الدين عبد الرحيم',
      username: 'admin',
      roleTitle: 'المدير العام وصاحب المصنع',
      phone: '01098452103',
    };
    onLogin(ownerSession);
    onClose();
  };

  const handleQuickLoginAsAssistant = (a: Assistant) => {
    const session: UserSession = {
      type: 'assistant',
      id: a.id,
      name: a.name,
      username: a.username,
      phone: a.phone,
      roleTitle: a.roleTitle,
      permissions: a.permissions,
    };
    onLogin(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E6DDD1] shadow-2xl overflow-hidden my-6 text-right animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-5 bg-[#FAF8F5] border-b border-[#E6DDD1] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006C4A] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">lock_person</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-[#1E293B]">تسجيل الدخول وتبديل الحساب</h3>
              <p className="text-[11px] text-[#78716C]">دخول المدير العام أو المساعدين الميدانيين</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5EFE8] hover:bg-[#EBE3D8] text-[#57534E] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Current User Status Banner */}
        <div className="px-6 pt-5">
          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E6DDD1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006C4A] animate-pulse"></span>
              <span className="text-xs font-bold text-[#78716C]">المستخدم المسجل حالياً:</span>
            </div>
            <span className="text-xs font-black text-[#1E293B]">{currentUser.name}</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="p-6 flex flex-col gap-3.5">
          {errorMessage && (
            <div className="p-3 bg-[#FEE2E2] text-[#DC2626] rounded-xl text-xs font-bold border border-[#FECACA] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#1E293B]">
              اسم المستخدم (Username) أو رقم التليفون:
            </label>
            <input
              type="text"
              required
              placeholder="مثال: tarek أو 01023456789 أو admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-[#1E293B]">كلمة المرور (Password):</label>
            <input
              type="password"
              placeholder="كلمة المرور (الافتراضية: 123)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-xs font-black shadow-md hover:shadow-lg transition-all mt-1"
          >
            تسجيل الدخول بالحساب
          </button>
        </form>

        {/* Quick Switch Shortcuts (for convenience) */}
        <div className="p-6 pt-0 border-t border-[#F5EFE8] flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#78716C] pt-4 block">
            تبديل سريع بنقرة واحدة (تجربة سريعة):
          </span>

          <div className="flex flex-col gap-1.5">
            {/* Owner Button */}
            <button
              type="button"
              onClick={handleQuickLoginAsOwner}
              className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between text-xs font-bold transition-all ${
                currentUser.type === 'owner'
                  ? 'bg-[#E8FAF1] border-[#006C4A] text-[#006C4A]'
                  : 'bg-[#FAF8F5] hover:bg-[#F5EFE8] border-[#E6DDD1] text-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#006C4A]">admin_panel_settings</span>
                <span>المدير العام (م. حسام الدين)</span>
              </div>
              <span className="text-[10px] text-[#78716C]">صلاحيات كاملة</span>
            </button>

            {/* Assistant buttons */}
            {assistants.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleQuickLoginAsAssistant(a)}
                className={`w-full p-2.5 rounded-xl border text-right flex items-center justify-between text-xs font-bold transition-all ${
                  currentUser.id === a.id
                    ? 'bg-[#E8FAF1] border-[#006C4A] text-[#006C4A]'
                    : 'bg-[#FAF8F5] hover:bg-[#F5EFE8] border-[#E6DDD1] text-[#1E293B]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#57534E]">person</span>
                  <span>{a.name} ({a.roleTitle.split(' ')[0]})</span>
                </div>
                <span className="text-[10px] text-[#78716C] font-mono">@{a.username}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
