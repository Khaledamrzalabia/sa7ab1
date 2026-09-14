import React, { useState } from 'react';
import { Assistant, AssistantPermissions, UserSession } from '../types';

interface AssistantsManagementProps {
  assistants: Assistant[];
  onAddAssistant: (assistant: Assistant) => void;
  onUpdateAssistant: (assistant: Assistant) => void;
  onDeleteAssistant: (id: string) => void;
  currentUser: UserSession;
  onOpenTerminal?: () => void;
}

export default function AssistantsManagement({
  assistants,
  onAddAssistant,
  onUpdateAssistant,
  onDeleteAssistant,
  currentUser,
  onOpenTerminal
}: AssistantsManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [roleTitle, setRoleTitle] = useState('مشرف وردية وتحضير');
  const [shift, setShift] = useState('الوردية الصباحية (08:00 ص - 04:00 م)');
  const [gateOrLocation, setGateOrLocation] = useState('بوابة أفراد (أ) - عنبر الماكينات');
  const [notes, setNotes] = useState('');
  const [permissions, setPermissions] = useState<AssistantPermissions>({
    canCheckIn: true,
    canCheckOut: true,
    canRecordPermissions: true,
    canAddManualPenalties: true,
    canViewDailySummary: true,
    canPrintCards: true,
  });

  const handleOpenAdd = () => {
    setEditingAssistant(null);
    setName('');
    setUsername('');
    setPhone('');
    setPassword('123456');
    setRoleTitle('مشرف وردية وتحضير');
    setShift('الوردية الصباحية (08:00 ص - 04:00 م)');
    setGateOrLocation('بوابة أفراد (أ) - عنبر الماكينات');
    setNotes('');
    setPermissions({
      canCheckIn: true,
      canCheckOut: true,
      canRecordPermissions: true,
      canAddManualPenalties: true,
      canViewDailySummary: true,
      canPrintCards: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setName(assistant.name);
    setUsername(assistant.username);
    setPhone(assistant.phone);
    setPassword(assistant.password || '123456');
    setRoleTitle(assistant.roleTitle);
    setShift(assistant.shift);
    setGateOrLocation(assistant.gateOrLocation);
    setNotes(assistant.notes || '');
    setPermissions(assistant.permissions);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !phone.trim()) {
      alert('يرجى كتابة اسم المساعد واسم المستخدم ورقم الهاتف');
      return;
    }

    if (editingAssistant) {
      const updated: Assistant = {
        ...editingAssistant,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || '123456',
        roleTitle,
        shift,
        gateOrLocation,
        notes,
        permissions,
      };
      onUpdateAssistant(updated);
    } else {
      const newAssistant: Assistant = {
        id: `AST-${String(assistants.length + 1).padStart(2, '0')}`,
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim() || '123456',
        roleTitle,
        shift,
        gateOrLocation,
        status: 'active',
        permissions,
        createdAt: new Date().toISOString().split('T')[0],
        operationsCount: 0,
        notes,
      };
      onAddAssistant(newAssistant);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = (assistant: Assistant) => {
    const updated: Assistant = {
      ...assistant,
      status: assistant.status === 'active' ? 'suspended' : 'active'
    };
    onUpdateAssistant(updated);
  };

  const handleRolePresetChange = (selectedRole: string) => {
    setRoleTitle(selectedRole);
    if (selectedRole.includes('المدير العام') || selectedRole.includes('مدير')) {
      setPermissions({
        canCheckIn: true,
        canCheckOut: true,
        canRecordPermissions: true,
        canAddManualPenalties: true,
        canViewDailySummary: true,
        canPrintCards: true,
      });
      setShift('كل الورديات والعمليات');
      setGateOrLocation('الإدارة العامة / كافة العنابر');
    }
  };

  const filteredAssistants = assistants.filter(a => {
    const matchSearch = a.name.includes(searchQuery) || a.username.includes(searchQuery) || a.phone.includes(searchQuery) || a.roleTitle.includes(searchQuery);
    const matchShift = filterShift === 'all' || a.shift.includes(filterShift);
    return matchSearch && matchShift;
  });

  const totalOperations = assistants.reduce((acc, a) => acc + (a.operationsCount || 0), 0);
  const activeCount = assistants.filter(a => a.status === 'active').length;

  return (
    <div className="flex flex-col gap-6 text-right font-cairo">
      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-[#EBE3D8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#006C4A] text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-2xl">supervisor_account</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#1E293B]">إدارة المساعدين والمشرفين الميدانيين</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#006C4A]/10 text-[#006C4A] text-xs font-black">
                {assistants.length} حساب
              </span>
            </div>
            <p className="text-xs text-[#78716C] font-semibold">
              إنشاء وتعيين حسابات المشرفين بالاسم أو رقم الهاتف وكلمة المرور للتحضير السريع للعمال
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="px-4 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-sm text-amber-400">qr_code_scanner</span>
              <span>كود الحضور والانصراف</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>إضافة مساعد / مشرف جديد</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-[#EBE3D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#78716C] block mb-1">المشرفين النشطين</span>
            <span className="text-2xl font-black text-[#006C4A] font-readex">{activeCount} من {assistants.length}</span>
            <span className="text-[10px] font-bold text-[#0D9488] block mt-1">مفوضون بالتحضير الميداني</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E8FAF1] text-[#006C4A] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#EBE3D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#78716C] block mb-1">إجمالي البصمات الموثقة</span>
            <span className="text-2xl font-black text-[#1E293B] font-readex">{totalOperations.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-[#57534E] block mt-1">عملية حضور وانصراف وأذونات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F5EFE8] text-[#57534E] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">fact_check</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#EBE3D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#78716C] block mb-1">المستخدم الحالي المسجل</span>
            <span className="text-base font-black text-[#1E293B] truncate block max-w-[170px]">{currentUser.name}</span>
            <span className="text-[10px] font-bold text-[#C2410C] block mt-1">{currentUser.roleTitle}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#EBE3D8]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المساعد، اسم المستخدم، رقم التليفون، أو المسمى..."
            className="w-full p-2.5 pr-9 pl-4 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
          />
          <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-base text-[#78716C]">
            search
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#78716C]">تصفية بالوردية:</span>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="p-2 px-3 rounded-xl bg-[#FAF8F5] border border-[#D6CEBF] text-xs font-bold text-[#1E293B] outline-none"
          >
            <option value="all">كل الورديات والعنابر</option>
            <option value="الصباحية">الوردية الصباحية</option>
            <option value="المسائية">الوردية المسائية</option>
          </select>
        </div>
      </div>

      {/* Assistants Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssistants.map((assistant) => {
          const isCurrent = currentUser.id === assistant.id;

          return (
            <div
              key={assistant.id}
              className={`p-5 rounded-3xl bg-white border-2 transition-all shadow-sm hover:shadow-md flex flex-col justify-between gap-4 ${
                isCurrent ? 'border-[#006C4A] bg-[#F4FAF6]/50' : 'border-[#EBE3D8]'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#006C4A]/10 text-[#006C4A] border-2 border-[#006C4A]/20 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-2xl">supervisor_account</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-black text-[#1E293B]">{assistant.name}</h3>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded-md bg-[#006C4A] text-white text-[9px] font-black">
                            الحالي
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-[#006C4A]">{assistant.roleTitle}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      assistant.status === 'active'
                        ? 'bg-[#006C4A]/10 text-[#006C4A]'
                        : 'bg-[#FEE2E2] text-[#DC2626]'
                    }`}
                  >
                    {assistant.status === 'active' ? 'حساب مفعل' : 'معلق'}
                  </span>
                </div>

                {/* Login Credentials Box */}
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E6DDD1] flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C] font-semibold">اسم المستخدم:</span>
                    <span className="font-mono font-black text-[#1E293B] bg-white px-2 py-0.5 rounded border border-[#E2D9CC]">
                      {assistant.username}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C] font-semibold">رقم الهاتف للدخول:</span>
                    <span className="font-mono font-bold text-[#1E293B]">{assistant.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#78716C] font-semibold">كلمة المرور:</span>
                    <span className="font-mono text-[#78716C]">•••••••• (مشفرة)</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#E6DDD1]/60">
                    <span className="text-[#78716C] font-semibold">الموقع المكلف به:</span>
                    <span className="font-bold text-[#57534E] text-[11px] truncate max-w-[160px]">
                      {assistant.gateOrLocation}
                    </span>
                  </div>
                </div>

                {/* Permissions Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {assistant.permissions.canCheckIn && (
                    <span className="px-2 py-0.5 rounded-md bg-[#E8FAF1] text-[#006C4A] text-[10px] font-bold">
                      ✓ تسجيل حضور
                    </span>
                  )}
                  {assistant.permissions.canCheckOut && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D4ED8] text-[10px] font-bold">
                      ✓ تسجيل انصراف
                    </span>
                  )}
                  {assistant.permissions.canRecordPermissions && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[10px] font-bold">
                      ✓ أذونات نصف اليوم
                    </span>
                  )}
                  {assistant.permissions.canPrintCards && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F5EFE8] text-[#57534E] text-[10px] font-bold">
                      ✓ طباعة البطاقات
                    </span>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-[#F5EFE8] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(assistant)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 transition-all"
                    title="تعديل البيانات والصلاحيات"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span>تعديل</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(assistant)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      assistant.status === 'active'
                        ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title={assistant.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {assistant.status === 'active' ? 'block' : 'check_circle'}
                    </span>
                    <span>{assistant.status === 'active' ? 'تعطيل' : 'تفعيل'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف حساب (${assistant.name}) نهائياً؟`)) {
                        onDeleteAssistant(assistant.id);
                      }
                    }}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700"
                    title="حذف الحساب"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>

                <div className="text-[10px] text-[#78716C] font-bold">
                  {assistant.operationsCount || 0} بصمة
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Assistant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-[#EBE3D8] shadow-2xl overflow-hidden my-6 text-right animate-in fade-in zoom-in-95">
            <div className="p-5 bg-[#FAF8F5] border-b border-[#E6DDD1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006C4A]">person_add</span>
                <h3 className="text-base font-black text-[#1E293B]">
                  {editingAssistant ? 'تعديل بيانات وصلاحيات المستخدم' : 'إضافة مستخدم أو مدير جديد'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F5EFE8] hover:bg-[#EBE3D8] text-[#57534E] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {/* Quick Role Selection Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">نوع الحساب / الدور السريع:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRolePresetChange('المدير العام (General Manager)')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all border text-center ${
                      roleTitle.includes('المدير العام')
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    المدير العام
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRolePresetChange('المدير التنفيذي والحسابات')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all border text-center ${
                      roleTitle.includes('التنفيذي')
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مدير تنفيذي
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRolePresetChange('مشرف وردية وتحضير')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all border text-center ${
                      roleTitle.includes('مشرف وردية')
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مشرف وردية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRolePresetChange('مسؤول مخازن وتوريد')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all border text-center ${
                      roleTitle.includes('مخازن')
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    مسؤول مخازن
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">الاسم الكامل:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد عبد الله"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">المسمى الوظيفي والمسؤولية:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المدير العام"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">اسم المستخدم (Username):</label>
                  <input
                    type="text"
                    required
                    placeholder="tarek"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] font-mono outline-none focus:border-[#006C4A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">رقم التليفون للدخول:</label>
                  <input
                    type="text"
                    required
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] font-mono outline-none focus:border-[#006C4A]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">كلمة المرور (Password):</label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] font-mono outline-none focus:border-[#006C4A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">الوردية المسؤول عنها:</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="الوردية الصباحية (08:00 ص - 04:00 م)">الوردية الصباحية (08:00 ص - 04:00 م)</option>
                    <option value="الوردية المسائية (04:00 م - 12:00 ص)">الوردية المسائية (04:00 م - 12:00 ص)</option>
                    <option value="الوردية الليلية (12:00 ص - 08:00 ص)">الوردية الليلية (12:00 ص - 08:00 ص)</option>
                    <option value="كل الورديات والعمليات">كل الورديات والعمليات</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">البوابة أو العنبر المكلف به:</label>
                  <input
                    type="text"
                    placeholder="بوابة أفراد (أ) - عنبر الماكينات"
                    value={gateOrLocation}
                    onChange={(e) => setGateOrLocation(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none"
                  />
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6DDD1]">
                <label className="text-xs font-bold text-[#1E293B] block mb-2.5">
                  صلاحيات المساعد داخل النظام:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={permissions.canCheckIn}
                      onChange={(e) => setPermissions({ ...permissions, canCheckIn: e.target.checked })}
                      className="rounded text-[#006C4A]"
                    />
                    <span>تسجيل حضور العمال (Check In)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={permissions.canCheckOut}
                      onChange={(e) => setPermissions({ ...permissions, canCheckOut: e.target.checked })}
                      className="rounded text-[#006C4A]"
                    />
                    <span>تسجيل انصراف العمال (Check Out)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={permissions.canRecordPermissions}
                      onChange={(e) => setPermissions({ ...permissions, canRecordPermissions: e.target.checked })}
                      className="rounded text-[#006C4A]"
                    />
                    <span>تسجيل أذونات واستقطاعات نصف اليوم</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#57534E]">
                    <input
                      type="checkbox"
                      checked={permissions.canPrintCards}
                      onChange={(e) => setPermissions({ ...permissions, canPrintCards: e.target.checked })}
                      className="rounded text-[#006C4A]"
                    />
                    <span>استعراض وطباعة بطاقات الـ QR للعمال</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] border-t border-[#E6DDD1] flex items-center justify-end gap-2 -mx-6 -mb-6 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#D6CEBF] text-xs font-bold text-[#57534E]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-xs font-black shadow-md"
                >
                  {editingAssistant ? 'حفظ التعديلات' : 'إنشاء الحساب الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
