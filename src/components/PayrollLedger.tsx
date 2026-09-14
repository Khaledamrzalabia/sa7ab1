import React, { useState } from 'react';
import { Worker, AttendanceLog, IncentivePenalty, Expense } from '../types';
import { calculateWorkerMonthlyRegularity } from '../utils/regularityEngine';
import { generateUniqueId } from '../utils/idGenerator';

interface PayrollLedgerProps {
  workers: Worker[];
  setWorkers?: React.Dispatch<React.SetStateAction<Worker[]>>;
  attendanceLogs: AttendanceLog[];
  incentivePenalties: IncentivePenalty[];
  setIncentivePenalties?: React.Dispatch<React.SetStateAction<IncentivePenalty[]>>;
  expenses?: Expense[];
  onDisbursePayroll?: (totalNetPayroll: number, workersCount: number, periodStr: string, payrollRef: string) => void;
}

export default function PayrollLedger({
  workers,
  setWorkers,
  attendanceLogs,
  incentivePenalties,
  setIncentivePenalties,
  expenses,
  onDisbursePayroll,
}: PayrollLedgerProps) {
  // Period Selection (Month & Year) for accurate monthly accounting
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'has_bonus' | 'has_penalty'>('all');

  // Batch Approval State with Idempotency check against actual expenses
  const [localApprovedPeriod, setLocalApprovedPeriod] = useState<string | null>(null);
  const currentPayrollRef = `PAYROLL-${selectedYear}-${selectedMonth}`;
  const existingPayrollExpense = expenses?.find(
    (e) => e.receiptRef === currentPayrollRef || e.id === `EXP-${currentPayrollRef}`
  );
  const isPayrollApproved = Boolean(existingPayrollExpense) || localApprovedPeriod === currentPayrollRef;
  const [approvedDate, setApprovedDate] = useState<string>('');
  const effectiveApprovedDate = existingPayrollExpense?.date || approvedDate;

  // Individual Worker Payslip Modal State (مفردات المرتب)
  const [selectedWorkerForPayslip, setSelectedWorkerForPayslip] = useState<Worker | null>(null);

  // Individual Approved Worker IDs (for individual payout toggles)
  const [individualApprovedIds, setIndividualApprovedIds] = useState<Set<string>>(new Set());

  // Quick Add Bonus/Deduction Modal State
  const [isQuickItemModalOpen, setIsQuickItemModalOpen] = useState<boolean>(false);
  const [quickTargetWorker, setQuickTargetWorker] = useState<Worker | null>(null);
  const [quickItemType, setQuickItemType] = useState<'incentive' | 'penalty'>('incentive');
  const [quickItemCategory, setQuickItemCategory] = useState<string>('مكافأة إنتاج وتميز');
  const [quickItemAmount, setQuickItemAmount] = useState<number>(0);
  const [quickItemNotes, setQuickItemNotes] = useState<string>('');
  const [quickItemDate, setQuickItemDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Active workers only
  const activeWorkers = workers.filter((w) => !w.isArchived);

  // Batch Approve handler
  const handleApproveAllPayroll = () => {
    if (isPayrollApproved) {
      alert(`مسير رواتب هذا الشهر (${selectedMonth}/${selectedYear}) معتمد ومسجل مسبقاً في الخزينة العامة بقيمة ${existingPayrollExpense?.amount.toLocaleString()} ج.م.`);
      return;
    }

    setLocalApprovedPeriod(currentPayrollRef);
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    setApprovedDate(today);
    // Mark active workers as approved
    setIndividualApprovedIds(new Set(activeWorkers.map((w) => w.id)));

    // Calculate total net payroll disbursed for active non-archived workers ONLY
    const totalNetDisbursed = activeWorkers.reduce((sum, w) => sum + getPayrollDetails(w).net, 0);
    if (onDisbursePayroll && totalNetDisbursed > 0) {
      onDisbursePayroll(totalNetDisbursed, activeWorkers.length, today, currentPayrollRef);
    }
  };

  // Toggle individual payout
  const handleToggleIndividualApproval = (workerId: string) => {
    setIndividualApprovedIds(prev => {
      const updated = new Set(prev);
      if (updated.has(workerId)) {
        updated.delete(workerId);
      } else {
        updated.add(workerId);
      }
      return updated;
    });
  };

  // Open Quick Modal to Add Bonus or Deduction
  const handleOpenQuickModal = (worker: Worker, type: 'incentive' | 'penalty') => {
    setQuickTargetWorker(worker);
    setQuickItemType(type);
    if (type === 'incentive') {
      setQuickItemCategory('مكافأة إنتاج إضافي');
      setQuickItemAmount(0);
    } else {
      setQuickItemCategory('خصم جزاء إداري');
      setQuickItemAmount(0);
    }
    setQuickItemNotes('');
    setQuickItemDate(new Date().toISOString().split('T')[0]);
    setIsQuickItemModalOpen(true);
  };

  // Submit Quick Bonus or Deduction
  const handleSaveQuickItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTargetWorker || quickItemAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح.');
      return;
    }

    if (setIncentivePenalties) {
      const newItemId = generateUniqueId('IP');
      const newItem: IncentivePenalty = {
        id: newItemId,
        workerId: quickTargetWorker.id,
        type: quickItemType,
        category: quickItemCategory,
        amount: quickItemAmount,
        calcMode: 'fixed',
        calcValue: quickItemAmount,
        notes: quickItemNotes.trim() || (quickItemType === 'incentive' ? `مكافأة مسجلة: ${quickItemCategory}` : `خصم مسجل: ${quickItemCategory}`),
        date: quickItemDate,
        status: 'approved-added'
      };

      setIncentivePenalties(prev => [newItem, ...prev]);
    }

    setIsQuickItemModalOpen(false);
  };

  // Delete an individual bonus or deduction item
  const handleDeleteIncentivePenalty = (itemId: string) => {
    if (setIncentivePenalties) {
      setIncentivePenalties(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Helper to compute individual worker payroll details for the selected period
  const getPayrollDetails = (worker: Worker) => {
    const base = Number(worker.baseSalary) || 0;
    const dailyRate = Number(worker.dailyRate) || (base > 0 ? base / 30 : 0);
    const allowances = Math.round(base * 0.10); // 10% standard transportation & meal allowance

    const monthStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    const monthPrefix = `${selectedYear}-${monthStr}`;

    // All approved & recorded bonuses from incentivePenalties list FOR THIS MONTH
    const workerIncentivesList = incentivePenalties.filter(
      ip => ip.workerId === worker.id && ip.type === 'incentive' && (ip.date ? ip.date.startsWith(monthPrefix) : true)
    );
    const moduleIncentivesTotal = workerIncentivesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Direct bonus from worker record (avoid double counting if already synced in workerIncentivesList)
    const hasProfileIncentive = workerIncentivesList.some(ip => ip.notes?.includes('من ملف الموظف'));
    const directBonus = hasProfileIncentive ? 0 : (Number(worker.manualBonus) || 0);

    // Monthly Regularity Bonus (Calculated for previous month, disbursed on day 20)
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const regularity = calculateWorkerMonthlyRegularity(worker, attendanceLogs, prevYear, prevMonth);
    const regularityBonus = regularity.finalBonus;

    const totalIncentives = moduleIncentivesTotal + directBonus + regularityBonus;

    // All approved & recorded penalties from incentivePenalties list FOR THIS MONTH
    const workerPenaltiesList = incentivePenalties.filter(
      ip => ip.workerId === worker.id && ip.type === 'penalty' && (ip.date ? ip.date.startsWith(monthPrefix) : true)
    );
    const modulePenaltiesTotal = workerPenaltiesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    // Attendance delay / absent deductions FOR THIS MONTH ONLY
    const workerAttendanceLogs = attendanceLogs.filter(
      al => al.workerId === worker.id && (al.date ? al.date.startsWith(monthPrefix) : true)
    );
    const attendanceDeductions = workerAttendanceLogs.reduce((sum, item) => sum + (Number(item.deductionAmount) || 0), 0);
    const totalLateMinutes = workerAttendanceLogs.reduce((sum, item) => sum + (item.delayMinutes || 0), 0);
    const daysAbsent = workerAttendanceLogs.filter(al => al.status === 'absent').length;
    const absenceDeduction = Math.round(daysAbsent * dailyRate);

    // Direct discount from worker profile (avoid double counting if already synced in workerPenaltiesList)
    const hasProfilePenalty = workerPenaltiesList.some(ip => ip.notes?.includes('من ملف الموظف'));
    const directDiscount = hasProfilePenalty ? 0 : (Number(worker.manualDiscount) || 0);
    const totalPenalties = modulePenaltiesTotal + attendanceDeductions + absenceDeduction + directDiscount;

    // Final Net Payable Salary (صافي الراتب النهائي المقبوض) - Zero-Floor Protected
    const net = Math.max(0, base + allowances + totalIncentives - totalPenalties);

    return {
      base,
      allowances,
      workerIncentivesList,
      moduleIncentivesTotal,
      directBonus,
      regularity,
      regularityBonus,
      totalIncentives,
      incentivesCount: workerIncentivesList.length + (directBonus > 0 ? 1 : 0) + (regularityBonus > 0 ? 1 : 0),
      workerPenaltiesList,
      modulePenaltiesTotal,
      attendanceDeductions,
      totalLateMinutes,
      directDiscount,
      totalPenalties,
      penaltiesCount: workerPenaltiesList.length + (directDiscount > 0 ? 1 : 0) + (attendanceDeductions > 0 ? 1 : 0),
      net
    };
  };

  // Filter list (Active workers only)
  const filteredWorkers = activeWorkers.filter((worker) => {
    const payroll = getPayrollDetails(worker);
    const matchesSearch =
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (worker.nationalId || '').includes(searchQuery);

    const matchesDept = departmentFilter === 'all' || worker.department === departmentFilter;

    let matchesStatus = true;
    const isApproved = isPayrollApproved || individualApprovedIds.has(worker.id);
    if (statusFilter === 'approved') matchesStatus = isApproved;
    if (statusFilter === 'pending') matchesStatus = !isApproved;
    if (statusFilter === 'has_bonus') matchesStatus = payroll.totalIncentives > 0;
    if (statusFilter === 'has_penalty') matchesStatus = payroll.totalPenalties > 0;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Global calculations for the visible pool
  const totals = filteredWorkers.reduce((acc, worker) => {
    const detail = getPayrollDetails(worker);
    return {
      base: acc.base + detail.base,
      allowances: acc.allowances + detail.allowances,
      incentives: acc.incentives + detail.totalIncentives,
      penalties: acc.penalties + detail.totalPenalties,
      net: acc.net + detail.net
    };
  }, { base: 0, allowances: 0, incentives: 0, penalties: 0, net: 0 });

  // List of departments for filtering
  const allDepartments = Array.from(new Set(activeWorkers.map(w => w.department).filter(Boolean)));

  return (
    <div id="screen-payroll-ledger" className="flex flex-col gap-6 pb-12 w-full text-right">
      
      {/* Title Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
              مسير الرواتب الشهرية والأجور
            </h1>
            <p className="text-xs text-[#78716C] font-semibold">
              حساب دقيق لصافي المقبوضات مع هندلة تعدد المكافآت والاستقطاعات مع الحفاظ الكامل على الراتب الأساسي الثابت
            </p>
          </div>
        </div>

        {/* Release Action Controls & Period Selector */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 mr-1">شهر:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setLocalApprovedPeriod(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white text-xs font-black text-slate-800 border border-slate-200 shadow-2xs outline-none"
            >
              {[
                { m: 1, name: 'يناير (01)' },
                { m: 2, name: 'فبراير (02)' },
                { m: 3, name: 'مارس (03)' },
                { m: 4, name: 'أبريل (04)' },
                { m: 5, name: 'مايو (05)' },
                { m: 6, name: 'يونيو (06)' },
                { m: 7, name: 'يوليو (07)' },
                { m: 8, name: 'أغسطس (08)' },
                { m: 9, name: 'سبتمبر (09)' },
                { m: 10, name: 'أكتوبر (10)' },
                { m: 11, name: 'نوفمبر (11)' },
                { m: 12, name: 'ديسمبر (12)' },
              ].map(({ m, name }) => (
                <option key={m} value={m}>{name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setLocalApprovedPeriod(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white text-xs font-black text-slate-800 border border-slate-200 shadow-2xs outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleApproveAllPayroll}
            disabled={isPayrollApproved}
            className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
              isPayrollApproved
                ? 'bg-[#006C4A] cursor-default'
                : 'bg-[#0D9488] hover:bg-[#0A7368] cursor-pointer'
            }`}
          >
            <span className="material-symbols-outlined text-base">task_alt</span>
            {isPayrollApproved ? 'تم اعتماد وصرف كشوف الرواتب' : 'اعتماد وصرف كشوف الرواتب'}
          </button>
        </div>
      </div>

      {/* State Feedback Banner */}
      {isPayrollApproved && (
        <div className="p-4 rounded-xl bg-[#D4F4E4] border border-[#006C4A]/30 text-[#006C4A] text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">verified</span>
            <div>
              <span>تم تحويل واعتماد الرواتب بنجاح إلى الحسابات البنكية وكشوف القبض.</span>
              <p className="text-[11px] text-[#0A7368] font-semibold mt-0.5">تاريخ الاعتماد: {approvedDate} | بواسطة المفوض المالي والإداري</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-lg bg-white text-[#006C4A] border border-[#006C4A]/40 text-xs font-bold hover:bg-[#E8FAF1] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            طباعة الكشف العام
          </button>
        </div>
      )}

      {/* Aggregate Financial Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">الرواتب الأساسية الثابتة</span>
            <span className="material-symbols-outlined text-sm text-[#78716C]">lock</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1E293B] font-readex">{totals.base.toLocaleString()}</span>
            <span className="text-xs font-bold text-[#78716C]">ج.م</span>
          </div>
          <span className="text-[10px] text-[#A8A29E] mt-1">عقود العمل (ثابتة لا تتغير)</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#78716C]">البدلات الثابتة (10%)</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#1E293B] font-readex">{totals.allowances.toLocaleString()}</span>
            <span className="text-xs font-bold text-[#78716C]">ج.م</span>
          </div>
          <span className="text-[10px] text-[#A8A29E] mt-1">انتقال وإعاشة صناعية</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#0D9488]">مجموع كل المكافآت (+)</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#0D9488] font-readex">+{totals.incentives.toLocaleString()}</span>
            <span className="text-xs font-bold text-[#0D9488]">ج.م</span>
          </div>
          <span className="text-[10px] text-[#0D9488] mt-1">بونص وحوافز إنتاجية متعددة</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-[#DC2626]">مجموع كل الخصومات (-)</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#DC2626] font-readex">-{totals.penalties.toLocaleString()}</span>
            <span className="text-xs font-bold text-[#DC2626]">ج.م</span>
          </div>
          <span className="text-[10px] text-[#DC2626] mt-1">تأخير بالدقيقة وجزاءات متعددة</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#334155] text-white shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-[#94A3B8]">صافي الرواتب المصروفة الفعلي</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-white font-readex">{totals.net.toLocaleString()}</span>
            <span className="text-xs font-medium text-[#94A3B8]">ج.م</span>
          </div>
          <span className="text-[10px] text-[#38BDF8] mt-1">المعادلة: الأساسي+البدلات+المكافآت-الخصومات</span>
        </div>
      </div>

      {/* Main Ledger Table Container (Full Width) */}
      <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-5 w-full">
        {/* Table Top Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-[#1E293B]">كشف حسابات الكوادر والرواتب النهائية</h3>
            <p className="text-xs text-[#78716C] font-semibold">
              يمكنك إضافة عدة مكافآت وعدة استقطاعات لنفس العامل، وستنعكس فوراً على الصافي مع بقاء الراتب الأساسي ثابتاً
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="ابحث بالاسم أو الوظيفة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] outline-none"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-lg text-[#78716C]">search</span>
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
            >
              <option value="all">جميع الأقسام</option>
              {allDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="approved">تم التحويل والاعتماد</option>
              <option value="pending">بانتظار الصرف</option>
              <option value="has_bonus">لديه مكافآت وبونص</option>
              <option value="has_penalty">عليه خصومات أو تأخير</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                <th className="py-3.5 px-4">الموظف / العامل</th>
                <th className="py-3.5 px-3">القسم والوردية</th>
                <th className="py-3.5 px-3 text-left">
                  <div className="flex items-center gap-1">
                    <span>الراتب الأساسي</span>
                    <span className="material-symbols-outlined text-xs text-[#78716C]" title="الراتب الأساسي التعاقدي الثابت مبني على عدد الساعات">lock</span>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-left">البدلات (١٠٪)</th>
                <th className="py-3.5 px-3 text-left text-[#0D9488]">المكافآت المتعددة (+)</th>
                <th className="py-3.5 px-3 text-left text-[#DC2626]">الخصومات والاستقطاعات (-)</th>
                <th className="py-3.5 px-3 text-left font-black">الصافي النهائي المقبوض</th>
                <th className="py-3.5 px-3 text-center">حالة الصرف</th>
                <th className="py-3.5 px-4 text-center">الإجراءات السريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE8]">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm font-bold text-[#78716C]">
                    لا توجد بيانات مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const payroll = getPayrollDetails(worker);
                  const isApproved = isPayrollApproved || individualApprovedIds.has(worker.id);

                  return (
                    <tr key={worker.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                      {/* Name & Role */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-black text-[#1E293B] text-sm">{worker.name}</span>
                          <span className="text-[11px] text-[#78716C] font-semibold">{worker.role}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-3 text-xs font-semibold text-[#57534E]">
                        <div>{worker.department}</div>
                        <span className="text-[10px] text-[#78716C]">{worker.line}</span>
                      </td>

                      {/* Base Salary (Intact & Fixed) */}
                      <td className="py-4 px-3 text-left font-bold text-[#1E293B] font-readex">
                        <div className="flex flex-col items-end">
                          <span>{payroll.base.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span></span>
                          <span className="text-[9px] text-[#059669] font-medium">({(Number(worker.minuteRate) || 0).toFixed(2)} ج/دقيقة)</span>
                        </div>
                      </td>

                      {/* Allowances */}
                      <td className="py-4 px-3 text-left font-semibold text-[#78716C] font-readex">
                        +{payroll.allowances.toLocaleString()} <span className="text-[10px]">ج.م</span>
                      </td>

                      {/* Multiple Incentives */}
                      <td className="py-4 px-3 text-left font-bold text-[#0D9488] font-readex">
                        {payroll.totalIncentives > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-black">+{payroll.totalIncentives.toLocaleString()} ج.م</span>
                            <span className="text-[10px] text-[#0D9488] font-semibold bg-[#E6F4F1] px-1.5 py-0.5 rounded">
                              {payroll.incentivesCount} مكافأة مضافة
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#A8A29E] font-normal">—</span>
                        )}
                      </td>

                      {/* Multiple Deductions */}
                      <td className="py-4 px-3 text-left font-bold text-[#DC2626] font-readex">
                        {payroll.totalPenalties > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-black">-{(Number(payroll.totalPenalties) || 0).toFixed(2)} ج.م</span>
                            <div className="flex items-center gap-1 text-[10px] text-[#C2410C] font-semibold">
                              {payroll.totalLateMinutes > 0 && (
                                <span>{payroll.totalLateMinutes} د تأخير | </span>
                              )}
                              <span>{payroll.penaltiesCount} استقطاع</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#0D9488] font-normal">0 ج.م</span>
                        )}
                      </td>

                      {/* Net Final Wage */}
                      <td className="py-4 px-3 text-left font-black text-sm text-[#1E293B] font-readex bg-[#FAF9F5]">
                        <div className="flex flex-col items-end">
                          <span className="text-base text-[#0F172A]">{(Number(payroll.net) || 0).toFixed(2)} <span className="text-[10px] font-bold">ج.م</span></span>
                          <span className="text-[9px] text-[#64748B]">المقبوض النهائي</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleIndividualApproval(worker.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                            isApproved
                              ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                              : 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A]'
                          }`}
                          title="اضغط لتغيير حالة الصرف"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isApproved ? 'check_circle' : 'pending'}
                          </span>
                          {isApproved ? 'معتمد ومحوّل' : 'بانتظار الصرف'}
                        </button>
                      </td>

                      {/* Quick Actions (Add Bonus / Add Penalty / Full Payslip) */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickModal(worker, 'incentive')}
                            className="p-1.5 rounded-lg bg-[#E6F4F1] hover:bg-[#CCECE5] text-[#0D9488] text-xs font-bold transition-all"
                            title="إضافة مكافأة / بونص جديد لهذا العامل"
                          >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenQuickModal(worker, 'penalty')}
                            className="p-1.5 rounded-lg bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-xs font-bold transition-all"
                            title="إضافة خصم / جزاء جديد لهذا العامل"
                          >
                            <span className="material-symbols-outlined text-sm">remove_circle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedWorkerForPayslip(worker)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold transition-all flex items-center gap-1"
                            title="عرض وتفصيل مفردات المرتب الكاملة"
                          >
                            <span className="material-symbols-outlined text-xs">receipt_long</span>
                            مفردات المرتب
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
      {/* MODAL 1: QUICK ADD BONUS OR DEDUCTION MODAL */}
      {/* ========================================================================= */}
      {isQuickItemModalOpen && quickTargetWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-md w-full p-6 text-right flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-2xl ${
                  quickItemType === 'incentive' ? 'text-[#0D9488]' : 'text-[#DC2626]'
                }`}>
                  {quickItemType === 'incentive' ? 'add_circle' : 'remove_circle'}
                </span>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">
                    {quickItemType === 'incentive' ? 'إضافة مكافأة / بونص جديد' : 'إضافة خصم / استقطاع جديد'}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">للعامل: {quickTargetWorker.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickItemModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickItem} className="flex flex-col gap-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#FAF9F5] border border-[#EBE3D8]">
                <button
                  type="button"
                  onClick={() => {
                    setQuickItemType('incentive');
                    setQuickItemCategory('مكافأة إنتاج إضافي');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    quickItemType === 'incentive'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  + مكافأة / بونص (إضافة)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickItemType('penalty');
                    setQuickItemCategory('خصم جزاء إداري');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    quickItemType === 'penalty'
                      ? 'bg-[#DC2626] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  - خصم / استقطاع (حسم)
                </button>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#57534E]">السبب / التصنيف</label>
                <input
                  type="text"
                  value={quickItemCategory}
                  onChange={(e) => setQuickItemCategory(e.target.value)}
                  placeholder="مثال: مكافأة جودة، بونص وردية، خصم تلف، جزاء انضباط..."
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] outline-none"
                  required
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#57534E]">المبلغ (ج.م)</label>
                  <input
                    type="number"
                    min="1"
                    value={quickItemAmount}
                    onChange={(e) => setQuickItemAmount(Number(e.target.value))}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#57534E]">تاريخ المعاملة</label>
                  <input
                    type="date"
                    value={quickItemDate}
                    onChange={(e) => setQuickItemDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#57534E]">ملاحظات وتفاصيل إضافية (اختياري)</label>
                <input
                  type="text"
                  value={quickItemNotes}
                  onChange={(e) => setQuickItemNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظة توثيقية..."
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#EBE3D8] text-[11px] text-[#78716C] leading-relaxed">
                💡 <span className="font-bold text-[#1E293B]">ملاحظة هامة:</span> هذا البند يضاف كبند منفصل ويدخل في حساب صافي المرتب النهائي دون أي مساس بالراتب الأساسي التعاقدي ({quickTargetWorker.baseSalary} ج.م).
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F5EFE8]">
                <button
                  type="button"
                  onClick={() => setIsQuickItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-black text-white ${
                    quickItemType === 'incentive'
                      ? 'bg-[#0D9488] hover:bg-[#0A7368]'
                      : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  }`}
                >
                  {quickItemType === 'incentive' ? 'حفظ وإضافة المكافأة' : 'حفظ وإضافة الخصم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: WORKER PAYSLIP (مفردات المرتب التفصيلية الشاملة لجميع البنود) */}
      {/* ========================================================================= */}
      {selectedWorkerForPayslip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-3xl w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1E293B]">
                    إشعار مفردات الراتب الشهري: {selectedWorkerForPayslip.name}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    {selectedWorkerForPayslip.role} - {selectedWorkerForPayslip.department} | الوردية: {selectedWorkerForPayslip.shiftStart} إلى {selectedWorkerForPayslip.shiftEnd}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkerForPayslip(null)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Rates Reference Bar (Fixed Base Metrics) */}
            <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#FAF9F5] border border-[#EBE3D8] text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716C] font-bold">الراتب الأساسي الثابت</span>
                <span className="font-black text-[#1E293B] font-readex mt-0.5">{(Number(selectedWorkerForPayslip.baseSalary) || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716C] font-bold">أجر اليوم (٣٠ يوم)</span>
                <span className="font-black text-[#1E293B] font-readex mt-0.5">{(Number(selectedWorkerForPayslip.dailyRate) || 0).toFixed(2)} ج.م</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716C] font-bold">أجر الساعة (٨ ساعات)</span>
                <span className="font-black text-[#1E293B] font-readex mt-0.5">{(Number(selectedWorkerForPayslip.hourlyRate) || 0).toFixed(2)} ج.م</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[#78716C] font-bold">أجر الدقيقة (ثابت)</span>
                <span className="font-black text-[#0D9488] font-readex mt-0.5">{(Number(selectedWorkerForPayslip.minuteRate) || 0).toFixed(3)} ج.م</span>
              </div>
            </div>

            {/* Detailed Itemized Earnings vs Deductions Breakdown */}
            {(() => {
              const p = getPayrollDetails(selectedWorkerForPayslip);
              const isApproved = isPayrollApproved || individualApprovedIds.has(selectedWorkerForPayslip.id);

              return (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* ======================================================= */}
                    {/* COLUMN 1: EARNINGS & MULTIPLE BONUSES (+) */}
                    {/* ======================================================= */}
                    <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-3 justify-between">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-[#DCFCE7] pb-2">
                          <h4 className="text-xs font-black text-[#166534] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            الاستحقاقات والمكافآت المضافة (+)
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickModal(selectedWorkerForPayslip, 'incentive')}
                            className="text-[10px] font-black text-[#0D9488] bg-white border border-[#0D9488]/30 px-2 py-0.5 rounded hover:bg-[#E6F4F1] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            إضافة مكافأة
                          </button>
                        </div>

                        {/* Base Contractual Salary */}
                        <div className="flex justify-between text-xs text-[#1E293B] py-1 border-b border-[#DCFCE7]/60">
                          <div>
                            <span className="font-bold">الراتب الأساسي التعاقدي:</span>
                            <span className="text-[10px] text-[#78716C] block">ثابت مبني على ساعات العمل</span>
                          </div>
                          <span className="font-bold font-readex">{p.base.toLocaleString()} ج.م</span>
                        </div>

                        {/* Allowances */}
                        <div className="flex justify-between text-xs text-[#1E293B] py-1 border-b border-[#DCFCE7]/60">
                          <div>
                            <span className="font-bold">بدل انتقال وإعاشة (١٠٪):</span>
                            <span className="text-[10px] text-[#78716C] block">بدل شهري ثابت</span>
                          </div>
                          <span className="font-bold font-readex text-[#166534]">+{p.allowances.toLocaleString()} ج.م</span>
                        </div>

                        {/* Monthly Regularity Bonus */}
                        <div className="flex justify-between text-xs text-[#1E293B] py-1 border-b border-[#DCFCE7]/60">
                          <div>
                            <span className="font-bold">مكافأة الانتظام الشهري (صرف يوم 20):</span>
                            <span className="text-[10px] text-[#78716C] block">{p.regularity.explanation}</span>
                          </div>
                          <span className={`font-bold font-readex ${p.regularityBonus > 0 ? 'text-[#166534]' : 'text-slate-400'}`}>
                            {p.regularityBonus > 0 ? `+${p.regularityBonus.toLocaleString()} ج.م` : '0 ج.م'}
                          </span>
                        </div>

                        {/* Direct Profile Bonus (if any) */}
                        {p.directBonus > 0 && (
                          <div className="flex justify-between text-xs text-[#166534] py-1 border-b border-[#DCFCE7]/60 bg-white/70 p-2 rounded">
                            <div>
                              <span className="font-bold">بونص ملف الموظف:</span>
                              <span className="text-[10px] text-[#78716C] block">{selectedWorkerForPayslip.bonusNotes || 'مكافأة مباشرة'}</span>
                            </div>
                            <span className="font-bold font-readex">+{p.directBonus.toLocaleString()} ج.م</span>
                          </div>
                        )}

                        {/* Itemized list of all incentive records */}
                        {p.workerIncentivesList.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-[#166534]">المكافآت الإضافية المسجلة ({p.workerIncentivesList.length}):</span>
                            {p.workerIncentivesList.map((inc) => (
                              <div key={inc.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-[#DCFCE7] shadow-2xs">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#1E293B]">{inc.category}</span>
                                  <span className="text-[10px] text-[#78716C]">{inc.notes || inc.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold font-readex text-[#166534]">+{inc.amount.toLocaleString()} ج.م</span>
                                  {setIncentivePenalties && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteIncentivePenalty(inc.id)}
                                      className="text-[#991B1B] hover:text-[#DC2626] p-0.5 rounded"
                                      title="حذف هذه المكافأة"
                                    >
                                      <span className="material-symbols-outlined text-xs">delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Total Gross / Earnings */}
                      <div className="flex justify-between text-xs font-black text-[#166534] pt-2 border-t border-[#BBF7D0] mt-2">
                        <span>إجمالي الاستحقاقات والمكافآت:</span>
                        <span className="font-readex text-sm">{(p.base + p.allowances + p.totalIncentives).toLocaleString()} ج.م</span>
                      </div>
                    </div>

                    {/* ======================================================= */}
                    {/* COLUMN 2: DEDUCTIONS & MULTIPLE PENALTIES (-) */}
                    {/* ======================================================= */}
                    <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col gap-3 justify-between">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-[#FEE2E2] pb-2">
                          <h4 className="text-xs font-black text-[#991B1B] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">remove_circle</span>
                            الاستقطاعات والخصومات والتأخير (-)
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickModal(selectedWorkerForPayslip, 'penalty')}
                            className="text-[10px] font-black text-[#DC2626] bg-white border border-[#DC2626]/30 px-2 py-0.5 rounded hover:bg-[#FEE2E2] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">add</span>
                            إضافة خصم
                          </button>
                        </div>

                        {/* Attendance Delays & Absence */}
                        <div className="flex justify-between text-xs text-[#1E293B] py-1 border-b border-[#FEE2E2]/60">
                          <div>
                            <span className="font-bold">خصومات التأخير والغياب بالدقيقة:</span>
                            <span className="text-[10px] text-[#78716C] block">
                              {p.totalLateMinutes > 0 ? `(${p.totalLateMinutes} دقيقة تأخير × أجر الدقيقة الأساسي)` : 'سجل حضور تام (0 تأخير)'}
                            </span>
                          </div>
                          <span className="font-bold font-readex text-[#DC2626]">-{(Number(p.attendanceDeductions) || 0).toFixed(2)} ج.م</span>
                        </div>

                        {/* Direct Profile Discount */}
                        {p.directDiscount > 0 && (
                          <div className="flex justify-between text-xs text-[#991B1B] py-1 border-b border-[#FEE2E2]/60 bg-white/70 p-2 rounded">
                            <div>
                              <span className="font-bold">خصم ملف الموظف:</span>
                              <span className="text-[10px] text-[#78716C] block">{selectedWorkerForPayslip.discountNotes || 'خصم مباشر'}</span>
                            </div>
                            <span className="font-bold font-readex">-{p.directDiscount.toLocaleString()} ج.م</span>
                          </div>
                        )}

                        {/* Itemized list of all penalties */}
                        {p.workerPenaltiesList.length > 0 && (
                          <div className="flex flex-col gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-[#991B1B]">الجزاءات والاستقطاعات المسجلة ({p.workerPenaltiesList.length}):</span>
                            {p.workerPenaltiesList.map((pen) => (
                              <div key={pen.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-[#FECACA] shadow-2xs">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[#1E293B]">{pen.category}</span>
                                  <span className="text-[10px] text-[#78716C]">{pen.notes || pen.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold font-readex text-[#DC2626]">-{pen.amount.toLocaleString()} ج.م</span>
                                  {setIncentivePenalties && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteIncentivePenalty(pen.id)}
                                      className="text-[#991B1B] hover:text-[#DC2626] p-0.5 rounded"
                                      title="حذف هذا الخصم"
                                    >
                                      <span className="material-symbols-outlined text-xs">delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {p.totalPenalties === 0 && (
                          <div className="p-3 bg-white/60 rounded-lg text-center text-xs font-semibold text-[#0D9488]">
                            ✨ سجل نظيف تماماً - لا توجد أي خصومات أو جزاءات مسجلة على هذا العامل
                          </div>
                        )}
                      </div>

                      {/* Total Deductions */}
                      <div className="flex justify-between text-xs font-black text-[#991B1B] pt-2 border-t border-[#FECACA] mt-2">
                        <span>إجمالي الاستقطاعات والخصومات:</span>
                        <span className="font-readex text-sm">-{(Number(p.totalPenalties) || 0).toFixed(2)} ج.م</span>
                      </div>
                    </div>

                  </div>

                  {/* ======================================================= */}
                  {/* CALCULATION FORMULA & NET PAYABLE SALARY BANNER */}
                  {/* ======================================================= */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#334155] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8] font-bold">معادلة الحساب الإجمالي الشامل:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-readex font-bold text-[#E2E8F0]">
                        <span className="bg-white/10 px-2 py-1 rounded">الأساسي: {p.base.toLocaleString()} ج.م</span>
                        <span>+</span>
                        <span className="bg-white/10 px-2 py-1 rounded">البدلات: {p.allowances.toLocaleString()} ج.م</span>
                        <span>+</span>
                        <span className="bg-[#0D9488]/30 text-[#2DD4BF] px-2 py-1 rounded">المكافآت ({p.incentivesCount}): +{p.totalIncentives.toLocaleString()} ج.م</span>
                        <span>-</span>
                        <span className="bg-[#EF4444]/30 text-[#FCA5A5] px-2 py-1 rounded">الخصومات ({p.penaltiesCount}): -{(Number(p.totalPenalties) || 0).toFixed(2)} ج.م</span>
                      </div>
                      <span className="text-[11px] text-[#38BDF8] font-semibold">
                        🔒 الراتب الأساسي التعاقدي لم يتأثر بإضافة المكافآت أو الخصومات، وتم حساب أجر الساعة والدقيقة على الأساسي الأصلي.
                      </span>
                    </div>

                    <div className="flex flex-col items-end border-t md:border-t-0 md:border-r border-white/15 pt-3 md:pt-0 md:pr-4">
                      <span className="text-xs text-[#94A3B8] font-bold">صافي الراتب المستحق للصرف النهائي:</span>
                      <span className="text-3xl font-black text-white font-readex mt-0.5">
                        {(Number(p.net) || 0).toFixed(2)} <span className="text-xs font-normal text-[#94A3B8]">ج.م</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black mt-1 ${
                        isApproved
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        {isApproved ? 'معتمد وجاهز للتحويل' : 'بانتظار الاعتماد المالي'}
                      </span>
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F5EFE8]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleIndividualApproval(selectedWorkerForPayslip.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          isApproved
                            ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
                            : 'bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isApproved ? 'cancel' : 'check_circle'}
                        </span>
                        {isApproved ? 'إلغاء الاعتماد' : 'اعتماد وصرف هذا المرتب'}
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#D6CEBF] text-[#1E293B] text-xs font-bold hover:bg-[#F5EFE8] flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        طباعة قسيمة الراتب
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedWorkerForPayslip(null)}
                      className="py-2.5 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF]"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
