import React, { useState } from 'react';
import { Worker, AttendanceLog } from '../types';

interface AttendanceLogsProps {
  workers: Worker[];
  attendanceLogs: AttendanceLog[];
  setAttendanceLogs: React.Dispatch<React.SetStateAction<AttendanceLog[]>>;
  onNavigate: (path: string) => void;
  onOpenWorkerCard?: (worker: Worker) => void;
}

export default function AttendanceLogs({
  workers,
  attendanceLogs,
  setAttendanceLogs,
  onNavigate,
  onOpenWorkerCard,
}: AttendanceLogsProps) {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State for Registering Excuse / Sick Leave / Permissions
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState<boolean>(false);
  const [excuseWorkerId, setExcuseWorkerId] = useState<string>(workers[0]?.id || '');
  const [excuseType, setExcuseType] = useState<string>('إجازة مرضية معتمدة (تقرير طبي)');
  const [excuseNotes, setExcuseNotes] = useState<string>('');

  // Open modal with specific worker pre-selected
  const handleOpenExcuseModal = (workerId?: string) => {
    if (workerId) {
      setExcuseWorkerId(workerId);
    } else if (workers.length > 0 && !excuseWorkerId) {
      setExcuseWorkerId(workers[0].id);
    }
    setIsExcuseModalOpen(true);
  };

  // Handle registering an excuse (resets deduction to 0 and updates status)
  const handleRegisterExcuse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseWorkerId) return;

    setAttendanceLogs(prev => {
      // Check if log exists for this worker
      const exists = prev.some(log => log.workerId === excuseWorkerId);
      if (exists) {
        return prev.map(log => {
          if (log.workerId === excuseWorkerId) {
            return {
              ...log,
              status: 'permitted',
              isPermitted: true,
              permitType: `${excuseType} (${excuseNotes || 'معتمد رسمياً من الإدارة والمشرف'})`,
              deductionAmount: 0.0 // reset deduction dynamically
            };
          }
          return log;
        });
      } else {
        // If not present in today's log, create a permitted log entry
        const newLog: AttendanceLog = {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          workerId: excuseWorkerId,
          date: new Date().toISOString().split('T')[0],
          checkIn: '—',
          checkOut: '—',
          status: 'permitted',
          delayMinutes: 0,
          deductionAmount: 0,
          isPermitted: true,
          permitType: `${excuseType} (${excuseNotes || 'معتمد رسمياً'})`,
          workedHours: 8,
          gate: 'البوابة الرئيسية 1'
        };
        return [newLog, ...prev];
      }
    });

    // Reset Form & Close
    setExcuseNotes('');
    setIsExcuseModalOpen(false);
  };

  // Stats
  const totalPresent = attendanceLogs.filter(l => l.status === 'present').length;
  const totalLate = attendanceLogs.filter(l => l.status === 'late').length;
  const totalPermitted = attendanceLogs.filter(l => l.status === 'permitted').length;
  const totalAbsent = attendanceLogs.filter(l => l.status === 'absent').length;
  const totalDeductions = attendanceLogs.reduce((sum, item) => sum + item.deductionAmount, 0);

  // Filter logs
  const filteredLogs = attendanceLogs.filter(log => {
    const worker = workers.find(w => w.id === log.workerId);
    const matchesSearch =
      (worker?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (worker?.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (worker?.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="screen-attendance-logs" className="flex flex-col gap-6 pb-12 w-full">
      {/* Title block with main Action buttons */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm w-full">
        <div className="flex flex-col gap-1 text-right">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0D9488] text-2xl">timer</span>
            <h1 className="text-2xl font-black text-[#1E293B] font-readex">حضور وانصراف العمال والخصم بالدقيقة</h1>
          </div>
          <p className="text-xs text-[#78716C] font-semibold">
            متابعة البصمة الحية وجداول الحضور والغياب للوردية الحالية، واحتساب الخصومات آلياً بدقة الدقيقة وفق الراتب.
          </p>
        </div>

        {/* Top Actions: Add Excuse / Navigate to Terminal / Navigate to Incentives */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('quick-attendance')}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-black text-black bg-amber-400 hover:bg-amber-500 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">qr_code_scanner</span>
            كود الحضور والانصراف (QR)
          </button>

          <button
            type="button"
            onClick={() => handleOpenExcuseModal()}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-black text-white bg-[#1D4ED8] hover:bg-[#1E40AF] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">medical_services</span>
            تسجيل إجازة مرضية / مأذونية غياب
          </button>

          <button
            type="button"
            title="إجراء مسير الحوافز والجزاءات"
            onClick={() => onNavigate('incentives-penalties')}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-sm border border-[#006C4A] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">balance</span>
            مسير الحوافز والجزاءات
          </button>
        </div>
      </div>

      {/* KPI Cards across full width */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#78716C]">الحاضرون بالوردية</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-black text-[#0D9488] font-readex">{totalPresent}</span>
            <span className="text-xs text-[#78716C] font-bold">عمال</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#78716C]">المتأخرون لليوم</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-black text-[#C2410C] font-readex">{totalLate}</span>
            <span className="text-xs text-[#78716C] font-bold">حالات</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#78716C]">المأذونون والمجازون</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-black text-[#1D4ED8] font-readex">{totalPermitted}</span>
            <span className="text-xs text-[#78716C] font-bold">إذن معتمد</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#78716C]">الغياب الفعلي</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-black text-[#DC2626] font-readex">{totalAbsent}</span>
            <span className="text-xs text-[#78716C] font-bold">دون عذر</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-[#78716C]">إجمالي خصم التأخير</span>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-3xl font-black text-[#C2410C] font-readex">{totalDeductions.toLocaleString()}</span>
            <span className="text-xs text-[#78716C] font-bold">ج.م</span>
          </div>
        </div>
      </div>

      {/* Main Full-Width Table Container */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-5 w-full">
        {/* Table Header Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
          <div className="flex flex-col gap-0.5 text-right">
            <h3 className="text-base font-black text-[#1E293B]">سجل الدخول والمغادرة لليوم الجاري</h3>
            <p className="text-xs text-[#78716C] font-semibold">
              فحص أوقات البصمة، احتساب الخصومات بالدقيقة، وإمكانية تسجيل الأعذار مباشرة
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                placeholder="ابحث باسم الموظف أو وظيفته..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] outline-none"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-lg text-[#78716C]">search</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] outline-none"
            >
              <option value="all">جميع الحالات الانضباطية</option>
              <option value="present">حاضر في الموعد</option>
              <option value="late">تأخير بالدقائق</option>
              <option value="permitted">مأذون / بعذر معتمد</option>
              <option value="early-exit">مغادرة مبكرة</option>
              <option value="absent">غياب غير مبرر</option>
            </select>
          </div>
        </div>

        {/* Full Width Responsive Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                <th className="py-3.5 px-4">العامل / الموظف</th>
                <th className="py-3.5 px-3 text-center">وقت البصمة</th>
                <th className="py-3.5 px-3 text-center">المغادرة الفعلي</th>
                <th className="py-3.5 px-3 text-center">دقائق التأخير</th>
                <th className="py-3.5 px-3">نوع المأذونية والعذر المعتمد</th>
                <th className="py-3.5 px-3 text-left">مجموع الخصم بالدقيقة</th>
                <th className="py-3.5 px-3 text-center">الحالة الانضباطية</th>
                <th className="py-3.5 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE8]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm font-bold text-[#78716C]">
                    لا توجد سجلات مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const targetWorker = workers.find(w => w.id === log.workerId);
                  return (
                    <tr key={log.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                      {/* Name and Role */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-[#1E293B] text-xs md:text-sm">{targetWorker?.name || "عامل مسجل"}</span>
                            {targetWorker?.shortCode && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-black font-mono font-black text-[10px]">
                                #{targetWorker.shortCode}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#78716C] font-semibold">{targetWorker?.role} - {targetWorker?.department}</span>
                          {log.recordedBy && (
                            <span className="text-[9px] text-[#006C4A] font-bold flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-[11px]">verified_user</span>
                              بواسطة: {log.recordedBy} ({log.method === 'qr' ? 'QR كود' : log.method === 'manual_code' ? 'كود رقمي' : 'يدوي'})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-4 px-3 text-center font-bold text-[#1F2937] font-mono">
                        {log.checkIn || "—"}
                      </td>

                      {/* Check-Out */}
                      <td className="py-4 px-3 text-center font-bold text-[#1F2937] font-mono">
                        {log.checkOut || "قيد التشغيل"}
                      </td>

                      {/* Delay Minutes */}
                      <td className="py-4 px-3 text-center font-black">
                        {log.status === 'absent' ? (
                          <span className="text-[#DC2626]">٤٨٠ دقيقة (يوم كامل)</span>
                        ) : log.delayMinutes > 0 ? (
                          <span className="text-[#C2410C] font-readex">{log.delayMinutes} دقيقة</span>
                        ) : (
                          <span className="text-[#0D9488] font-semibold">منضبط</span>
                        )}
                      </td>

                      {/* Permit notes */}
                      <td className="py-4 px-3 text-xs font-semibold text-[#57534E] max-w-xs">
                        {log.permitType ? (
                          <span className="inline-flex items-center gap-1 text-[#1D4ED8] bg-[#EFF6FF] px-2 py-1 rounded-lg border border-[#BFDBFE]">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            {log.permitType}
                          </span>
                        ) : (
                          <span className="text-[#A8A29E]">بدون استئذان رسمي</span>
                        )}
                      </td>

                      {/* Deduction amount */}
                      <td className="py-4 px-3 text-left font-black text-sm">
                        {(Number(log.deductionAmount) || 0) > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[#DC2626] font-readex text-sm font-black">
                              -{(Number(log.deductionAmount) || 0).toFixed(2)} ج.م
                            </span>
                            {targetWorker && (
                              <span className="text-[10px] text-[#78716C] font-semibold">
                                (الدقيقة: {(Number(targetWorker.minuteRate) || 0).toFixed(3)} ج.م)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#0D9488] font-bold">0.00 ج.م</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          log.status === 'present' ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]' :
                          log.status === 'late' ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]' :
                          log.status === 'permitted' ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]' :
                          log.status === 'early-exit' ? 'bg-[#F3E8FF] text-[#6B21A8] border border-[#D8B4FE]' :
                          'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                        }`}>
                          {log.status === 'present' ? 'منتظم ومثالي' :
                           log.status === 'late' ? 'تأخر بالبصمة' :
                           log.status === 'permitted' ? 'مأذون ومستند رسمي' :
                           log.status === 'early-exit' ? 'مغادرة مستأذنة' : 'غياب غير مبرر'}
                        </span>
                      </td>

                      {/* Row Action to excuse & print QR card */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenWorkerCard && targetWorker && (
                            <button
                              type="button"
                              onClick={() => onOpenWorkerCard(targetWorker)}
                              className="p-1.5 rounded-lg bg-[#E8FAF1] hover:bg-[#D1FAE5] text-[#006C4A] border border-[#A7F3D0] text-xs font-bold transition-all"
                              title="عرض وطباعة بطاقة الـ QR والباركود"
                            >
                              <span className="material-symbols-outlined text-base">qr_code_2</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenExcuseModal(log.workerId)}
                            className="px-3 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#EFF6FF] text-[#1D4ED8] hover:text-[#1E40AF] border border-[#D6CEBF] hover:border-[#1D4ED8] text-xs font-bold transition-all inline-flex items-center gap-1"
                            title="تسجيل أو تعديل عذر / مأذونية لهذا العامل"
                          >
                            <span className="material-symbols-outlined text-xs">edit_calendar</span>
                            إذن / عذر
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTER EXCUSE / SICK LEAVE / PERMISSIONS */}
      {/* ========================================================================= */}
      {isExcuseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-lg w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">medical_services</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-black text-[#1E293B]">
                    تسجيل إجازة مرضية أو مأذونية طارئة
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    اعتماد العذر الرسمي وإلغاء خصومات التأخير والغياب بالدقيقة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExcuseModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterExcuse} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-right">
                <label className="text-xs font-bold text-[#1E293B]">اختر الموظف / العامل:</label>
                <select
                  value={excuseWorkerId}
                  onChange={(e) => setExcuseWorkerId(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#1D4ED8] outline-none"
                  required
                >
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} — ({w.role} / {w.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <label className="text-xs font-bold text-[#1E293B]">نوع الاستئذان أو الإجازة المعتمدة:</label>
                <select
                  value={excuseType}
                  onChange={(e) => setExcuseType(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#1D4ED8] outline-none"
                >
                  <option value="إجازة مرضية معتمدة (تقرير طبي)">إجازة مرضية معتمدة (تقرير طبي معتمد)</option>
                  <option value="مأذونية عيادة المصنع">مأذونية عيادة المصنع (كشف طارئ)</option>
                  <option value="عذر تأخر مروري طارئ مصدق">عذر تأخر مروري طارئ (مصدق)</option>
                  <option value="مأذونية عائلية معتمدة">مأذونية عائلية معتمدة</option>
                  <option value="مأمورية عمل خارجية رسمية">مأمورية عمل خارجية رسمية</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <label className="text-xs font-bold text-[#1E293B]">تفاصيل ومبررات الاستئذان / رقم التقرير:</label>
                <textarea
                  rows={3}
                  placeholder="رقم التذكرة الطبية، سبب الاستئذان، أو اعتماد المشرف المباشر..."
                  value={excuseNotes}
                  onChange={(e) => setExcuseNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs text-[#1E293B] font-semibold outline-none focus:border-[#1D4ED8] resize-none"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[11px] text-[#166534] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                سيتم تحويل حالة العامل إلى «مأذون رسمياً» وتصفير الخصم المالي لليوم تلقائياً.
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#1D4ED8] hover:bg-[#1E40AF] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  اعتماد العذر وإلغاء خصومات التأخير
                </button>
                <button
                  type="button"
                  onClick={() => setIsExcuseModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
