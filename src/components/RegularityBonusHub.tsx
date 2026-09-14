import React, { useState } from 'react';
import { Worker, AttendanceLog, IncentivePenalty, Expense } from '../types';
import {
  calculateWorkerMonthlyRegularity,
  calculateWeeklyRegularity,
  getPreviousWeekRange,
  getCurrentWeekRange,
} from '../utils/regularityEngine';
import { generateUniqueId } from '../utils/idGenerator';

interface RegularityBonusHubProps {
  workers: Worker[];
  setWorkers?: React.Dispatch<React.SetStateAction<Worker[]>>;
  attendanceLogs: AttendanceLog[];
  incentivePenalties: IncentivePenalty[];
  setIncentivePenalties?: React.Dispatch<React.SetStateAction<IncentivePenalty[]>>;
  expenses?: Expense[];
  setExpenses?: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function RegularityBonusHub({
  workers,
  setWorkers,
  attendanceLogs,
  incentivePenalties,
  setIncentivePenalties,
  expenses,
  setExpenses,
}: RegularityBonusHubProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  // Weekly Date Range State (default to previous week)
  const [weekRangeMode, setWeekRangeMode] = useState<'previous' | 'current' | 'custom'>('previous');
  const prevWeek = getPreviousWeekRange();
  const currWeek = getCurrentWeekRange();

  const [customWeekStart, setCustomWeekStart] = useState<string>(prevWeek.startDate);
  const [customWeekEnd, setCustomWeekEnd] = useState<string>(prevWeek.endDate);

  const selectedWeekStart =
    weekRangeMode === 'previous'
      ? prevWeek.startDate
      : weekRangeMode === 'current'
      ? currWeek.startDate
      : customWeekStart;

  const selectedWeekEnd =
    weekRangeMode === 'previous'
      ? prevWeek.endDate
      : weekRangeMode === 'current'
      ? currWeek.endDate
      : customWeekEnd;

  // Monthly State (default to current month or previous month)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Weekly Calculation
  const weeklyResult = calculateWeeklyRegularity(
    workers,
    attendanceLogs,
    incentivePenalties,
    selectedWeekStart,
    selectedWeekEnd
  );

  // Monthly Calculation
  const monthlyList = workers
    .filter((w) => w.status !== 'inactive' && !w.isArchived)
    .map((worker) =>
      calculateWorkerMonthlyRegularity(worker, attendanceLogs, selectedYear, selectedMonth)
    );

  // Filtered Monthly
  const filteredMonthly = monthlyList.filter((item) => {
    const matchesSearch =
      item.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shortCode.includes(searchQuery) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Monthly Totals
  const monthlyFullCount = monthlyList.filter((m) => m.status === 'full_100').length;
  const monthlyHalfCount = monthlyList.filter((m) => m.status === 'half_50').length;
  const monthlyDeductCount = monthlyList.filter((m) => m.status === 'deduct_50').length;
  const monthlyCanceledCount = monthlyList.filter((m) => m.status === 'canceled').length;
  const totalMonthlyBonus = monthlyList.reduce((sum, m) => sum + m.finalBonus, 0);

  // Disbursement Next Month Date
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
  const disburseDateFormatted = `20 / ${nextMonth < 10 ? '0' + nextMonth : nextMonth} / ${nextYear}`;

  // Disburse Weekly Bonus to Treasury with Idempotency Guard
  const [localDisbursedWeeks, setLocalDisbursedWeeks] = useState<Set<string>>(new Set());
  const expectedReceiptRef = `REG-WK-${selectedWeekStart}`;
  const isAlreadyDisbursedInExpenses = Boolean(
    expenses?.some((e) => e.receiptRef === expectedReceiptRef || e.id === `EXP-${expectedReceiptRef}`)
  );
  const isWeeklyDisbursed = isAlreadyDisbursedInExpenses || localDisbursedWeeks.has(selectedWeekStart);

  const handleDisburseWeeklyBonus = () => {
    if (isWeeklyDisbursed) {
      alert('تم بالفعل اعتماد وصرف مكافأة الانتظام لهذا الأسبوع في سجلات الخزينة.');
      return;
    }

    if (weeklyResult.winners.length === 0) {
      alert('لا يوجد عمال مؤهلين للفوز في هذا الأسبوع.');
      return;
    }

    const totalAmount = weeklyResult.totalBonusDisbursed;
    const confirmDisburse = window.confirm(
      `هل أنت متأكد من اعتماد وصرف مكافأة الانتظام الأسبوعي بقيمة ${totalAmount} ج.م نقداً لأول ${weeklyResult.winners.length} عمال منتظمين؟\nسيتم تسجيل قيد صرف رسمي في الخزينة العامة.`
    );
    if (!confirmDisburse) return;

    if (setExpenses) {
      const winnerNames = weeklyResult.winners.map((w) => `${w.workerName} (#${w.shortCode})`).join('، ');
      const newExpense: Expense = {
        id: `EXP-${expectedReceiptRef}`,
        title: `صرف بونص الانتظام الأسبوعي (100 ج × ${weeklyResult.winners.length})`,
        amount: totalAmount,
        type: 'out',
        category: 'رواتب وأجور العمال',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        receiptRef: expectedReceiptRef,
        party: `أول 4 عمال منتظمين: ${winnerNames}`,
        recordedBy: 'إدارة الموارد البشرية والمالية',
        notes: `صرف بونص الانتظام الأسبوعي للفترة من ${selectedWeekStart} إلى ${selectedWeekEnd} لعدم وجود أي تأخير أو خصومات.`,
      };

      setExpenses((prev) => [newExpense, ...prev.filter((e) => e.id !== newExpense.id && e.receiptRef !== expectedReceiptRef)]);
    }

    setLocalDisbursedWeeks((prev) => new Set(prev).add(selectedWeekStart));
    alert(`تم بنجاح اعتماد وصرف مبلغ ${totalAmount} ج.م في الخزينة وتوثيق الفائزين!`);
  };

  return (
    <div id="screen-regularity-bonus" className="flex flex-col gap-6 pb-12 w-full text-right font-readex">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
            <span className="material-symbols-outlined text-2xl font-black">military_tech</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              منظومة بونص ومكافآت الانتظام (أسبوعي وشهري)
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              قواعد الانضباط والحوافز التشجيعية المعتمدة لمصنع سحاب للملابس الجاهزة
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'weekly'
                ? 'bg-amber-400 text-slate-950 shadow-sm scale-102'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">timer</span>
            <span>الانتظام الأسبوعي (الـ 4 الأوائل 100 ج)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-emerald-600 text-white shadow-sm scale-102'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>الانتظام الشهري (صرف يوم 20)</span>
          </button>
        </div>
      </div>

      {/* 2. Business Rules Reference Accordion / Notice */}
      <div className="bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 p-5 rounded-2xl border border-amber-200/60 shadow-xs text-xs font-medium text-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">verified</span>
          <div>
            <h4 className="font-black text-slate-900 text-sm">
              {activeTab === 'weekly'
                ? 'قواعد الانتظام الأسبوعي (100 ج لأول 4 منتظمين)'
                : 'قواعد الانتظام الشهري (يُصرف يوم 20 من الشهر التالي)'}
            </h4>
            <p className="text-slate-600 text-[11.5px] mt-1 leading-relaxed">
              {activeTab === 'weekly'
                ? 'يُصرف كل يوم خميس أو سبت للأسبوع المنقضي، بمبلغ 100 جنيه لأول 4 عمال محققين لشرط: (0 دقيقة تأخير طوال الأسبوع) و(0 جزاءات أو خصومات) مع أعلى التزام بساعات العمل.'
                : 'يُصرف يوم 20 من الشهر التالي للشهر المستحق. التأخير أول مرة (من دقيقة لـ 4 ساعات) لا يُسقط الانتظام (100%). التأخير ثانياً يُعطي 50%. التأخير ثالثاً: إن كان دقيقة واحدة يُخصم 50 ج فقط؛ وإن زاد عن دقيقة يُلغى الانتظام. الجزاءات الإدارية لا تُسقط الانتظام الشهري.'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY REGULARITY */}
      {/* ========================================================================= */}
      {activeTab === 'weekly' && (
        <div className="flex flex-col gap-6">
          {/* Week Selection Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">الفترة الأسبوعية:</span>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWeekRangeMode('previous')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    weekRangeMode === 'previous'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الأسبوع المنقضي
                </button>
                <button
                  type="button"
                  onClick={() => setWeekRangeMode('current')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    weekRangeMode === 'current'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الأسبوع الحالي
                </button>
                <button
                  type="button"
                  onClick={() => setWeekRangeMode('custom')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    weekRangeMode === 'custom'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تاريخ مخصص
                </button>
              </div>

              {weekRangeMode === 'custom' && (
                <div className="flex items-center gap-2 mr-2">
                  <input
                    type="date"
                    value={customWeekStart}
                    onChange={(e) => setCustomWeekStart(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                  <span className="text-xs text-slate-400">إلى</span>
                  <input
                    type="date"
                    value={customWeekEnd}
                    onChange={(e) => setCustomWeekEnd(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                الفترة من <strong className="text-slate-900">{selectedWeekStart}</strong> إلى{' '}
                <strong className="text-slate-900">{selectedWeekEnd}</strong>
              </span>

              <button
                type="button"
                onClick={handleDisburseWeeklyBonus}
                disabled={isWeeklyDisbursed || weeklyResult.winners.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">payments</span>
                <span>
                  {isWeeklyDisbursed
                    ? 'تم اعتماد وصرف بونص الأسبوع ✅'
                    : `صرف بونص الأسبوع (${weeklyResult.totalBonusDisbursed} ج.م)`}
                </span>
              </button>
            </div>
          </div>

          {/* Top 4 Podium Cards */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="text-amber-500 text-base">🏆</span>
                <span>نجوم الانضباط الأسبوعي الفائزون بمكافأة 100 ج.م (أول 4 عمال منتظمين)</span>
              </h3>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                إجمالي المكافأة: {weeklyResult.totalBonusDisbursed} ج.م
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {weeklyResult.winners.map((winner, idx) => {
                const medalEmojis = ['🥇', '🥈', '🥉', '🎖️'];
                const rankLabels = ['المركز الأول', 'المركز الثاني', 'المركز الثالث', 'المركز الرابع'];
                const borderGlows = [
                  'border-amber-400 bg-gradient-to-b from-amber-50/80 to-white shadow-amber-500/10',
                  'border-slate-300 bg-gradient-to-b from-slate-50/80 to-white shadow-slate-400/10',
                  'border-amber-600/40 bg-gradient-to-b from-amber-50/50 to-white shadow-amber-700/10',
                  'border-emerald-300 bg-gradient-to-b from-emerald-50/50 to-white shadow-emerald-500/10',
                ];

                return (
                  <div
                    key={winner.workerId}
                    className={`relative p-5 rounded-3xl border-2 shadow-md flex flex-col justify-between transition-all hover:-translate-y-1 ${borderGlows[idx]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{medalEmojis[idx]}</span>
                        <div>
                          <span className="text-[11px] font-black text-amber-800 tracking-wider">
                            {rankLabels[idx]}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5">{winner.workerName}</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-300 rounded-lg text-xs font-black font-mono">
                        #{winner.shortCode}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col gap-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>القسم والخط:</span>
                        <strong className="text-slate-900">{winner.line || winner.department}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>أيام الحضور:</span>
                        <strong className="text-emerald-700">{winner.daysPresent} أيام عمل</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>ساعات العمل الفعلية:</span>
                        <strong className="text-slate-900">{winner.totalWorkedHours} ساعة</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>التأخير والخصومات:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[11px]">
                          0 دقيقة | 0 جزاء
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-500">المكافأة المستحقة:</span>
                      <span className="text-base font-black text-emerald-600 font-mono">
                        +{winner.bonusAmount} ج.م
                      </span>
                    </div>
                  </div>
                );
              })}

              {weeklyResult.winners.length < 4 && (
                <div className="p-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center text-xs text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">person_add</span>
                  <span>لا يوجد مرشح رابع مؤهل (0 تأخير و0 جزاءات)</span>
                </div>
              )}
            </div>
          </div>

          {/* Full Weekly Candidates Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800">
                سجل انضباط كافة عمال المصنع خلال الأسبوع ({weeklyResult.candidates.length} عامل)
              </h4>
              <span className="text-xs font-bold text-slate-500">
                المؤهلون للانتظام (0 تأخير و0 جزاء):{' '}
                <strong className="text-emerald-600 font-black">
                  {weeklyResult.candidates.filter((c) => c.isQualified).length}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">كود</th>
                    <th className="py-3 px-4">اسم العامل</th>
                    <th className="py-3 px-4">القسم / الخط</th>
                    <th className="py-3 px-4">أيام الحضور</th>
                    <th className="py-3 px-4">ساعات العمل</th>
                    <th className="py-3 px-4">دقائق التأخير</th>
                    <th className="py-3 px-4">الجزاءات</th>
                    <th className="py-3 px-4">حالة الاستحقاق الأسبوعي</th>
                    <th className="py-3 px-4 text-center">المكافأة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyResult.candidates.map((c) => (
                    <tr
                      key={c.workerId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.isWinner ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{c.shortCode}</td>
                      <td className="py-3 px-4 font-black text-slate-900">{c.workerName}</td>
                      <td className="py-3 px-4 text-slate-600">{c.line || c.department}</td>
                      <td className="py-3 px-4 text-slate-700 font-bold">{c.daysPresent} يوم</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{c.totalWorkedHours} س</td>
                      <td className="py-3 px-4">
                        {c.totalDelayMinutes === 0 ? (
                          <span className="text-emerald-700 font-black">0 دقيقة</span>
                        ) : (
                          <span className="text-rose-600 font-bold">+{c.totalDelayMinutes} د</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.totalPenaltiesCount === 0 ? (
                          <span className="text-emerald-700 font-black">0 جزاء</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{c.totalPenaltiesCount} جزاء</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.isWinner ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-[11px] border border-amber-300">
                            <span>⭐</span> فائز (المركز {c.rank})
                          </span>
                        ) : c.isQualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 font-bold text-[11px]">
                            مؤهل كامل (قائمة الشرف)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[11px]">
                            غير مؤهل {c.totalDelayMinutes > 0 ? '(تأخير)' : '(جزاء)'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black">
                        {c.isWinner ? (
                          <span className="text-emerald-600 text-sm">+100 ج.م</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY REGULARITY */}
      {/* ========================================================================= */}
      {activeTab === 'monthly' && (
        <div className="flex flex-col gap-6">
          {/* Monthly Controls & Date Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-700">الشهر المستهدف:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    شهر {m} ({new Date(2026, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long' })})
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            {/* Next Disbursement Notice Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-black shadow-2xs">
              <span className="material-symbols-outlined text-sm text-emerald-600">event_available</span>
              <span>موعد صرف انتظام شهر {selectedMonth}:</span>
              <span className="text-emerald-700 font-mono font-black">{disburseDateFormatted}</span>
            </div>
          </div>

          {/* Monthly KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">مستحق كامل (100%)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-emerald-600 font-mono">{monthlyFullCount}</span>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                  0 أو 1 تأخير
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">مستحق النصف (50%)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-amber-600 font-mono">{monthlyHalfCount}</span>
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
                  2 تأخير
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">خصم 50 ج.م فقط</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-orange-600 font-mono">{monthlyDeductCount}</span>
                <span className="text-[11px] text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-md">
                  3 تأخير (دقيقة 1)
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">ملغي (0 ج.م)</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-rose-600 font-mono">{monthlyCanceledCount}</span>
                <span className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">
                  &gt; 3 تأخير
                </span>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="البحث باسم العامل أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">الحالة:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كافة الحالات</option>
                <option value="full_100">مستحق كامل (100%)</option>
                <option value="half_50">مستحق النصف (50%)</option>
                <option value="deduct_50">مستحق بخصم 50 ج</option>
                <option value="canceled">ملغي (0 ج.م)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-bold text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span>إجمالي بونص الشهر المستحق:</span>
              <strong className="text-emerald-700 font-mono font-black text-sm">
                {totalMonthlyBonus.toLocaleString()} ج.م
              </strong>
            </div>
          </div>

          {/* Monthly Regularity Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3.5 px-4">كود</th>
                    <th className="py-3.5 px-4">اسم العامل</th>
                    <th className="py-3.5 px-4">القسم / الخط</th>
                    <th className="py-3.5 px-4">قيمة الانتظام الأساسية</th>
                    <th className="py-3.5 px-4">عدد مرات التأخير</th>
                    <th className="py-3.5 px-4">تدرج القرار والقاعدة المطبقة</th>
                    <th className="py-3.5 px-4">حالة الاستحقاق</th>
                    <th className="py-3.5 px-4 text-center">الصافي المستحق</th>
                    <th className="py-3.5 px-4">تاريخ الصرف المقبول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonthly.map((m) => (
                    <tr key={m.workerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">#{m.shortCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{m.workerName}</div>
                        <div className="text-[11px] text-slate-400">{m.role}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{m.line || m.department}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 font-bold">
                        {m.baseBonus.toLocaleString()} ج.م
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black font-mono text-xs px-2 py-0.5 rounded-md ${
                            m.delaysCount === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.delaysCount <= 2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.delaysCount} تأخير
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[280px]">
                        <span className="text-[11.5px] leading-tight block">{m.explanation}</span>
                        {m.delaysList.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {m.delaysList.map((d, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono"
                              >
                                {d.date}: {d.delayMinutes}د
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.status === 'full_100' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 font-black text-[11px]">
                            🟢 كامل (100%)
                          </span>
                        )}
                        {m.status === 'half_50' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-[11px]">
                            🟡 النصف (50%)
                          </span>
                        )}
                        {m.status === 'deduct_50' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-950 font-black text-[11px]">
                            🟠 خصم 50 ج.م
                          </span>
                        )}
                        {m.status === 'canceled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-black text-[11px]">
                            🔴 ملغي (0 ج)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black">
                        {m.finalBonus > 0 ? (
                          <span className="text-emerald-600 text-sm">+{m.finalBonus.toLocaleString()} ج.م</span>
                        ) : (
                          <span className="text-slate-400">0 ج.م</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-xs font-bold">
                        {m.disbursementDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
