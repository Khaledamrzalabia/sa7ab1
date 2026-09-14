import React, { useState } from 'react';
import { Worker, IncentivePenalty } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

interface IncentivesPenaltiesProps {
  workers: Worker[];
  incentivePenalties: IncentivePenalty[];
  setIncentivePenalties: React.Dispatch<React.SetStateAction<IncentivePenalty[]>>;
}

export default function IncentivesPenalties({
  workers,
  incentivePenalties,
  setIncentivePenalties,
}: IncentivesPenaltiesProps) {
  // Local state for the decision form
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.id || '');

  React.useEffect(() => {
    if ((!selectedWorkerId || !workers.some(w => w.id === selectedWorkerId)) && workers.length > 0) {
      setSelectedWorkerId(workers[0].id);
    }
  }, [workers, selectedWorkerId]);

  const [decisionType, setDecisionType] = useState<'incentive' | 'penalty'>('incentive');
  const [category, setCategory] = useState<string>('حافز إنتاج إضافي');
  const [calcMode, setCalcMode] = useState<'fixed' | 'days' | 'hours'>('fixed');
  const [calcValue, setCalcValue] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [decisionDate, setDecisionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'incentive' | 'penalty'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved-added' | 'cancelled'>('all');

  // Selected worker details
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);

  // Dynamic calculation based on mode
  const calculatedAmount = (() => {
    if (calcMode === 'fixed') return customAmount;
    if (!selectedWorker) return 0;

    const dailyRate = selectedWorker.dailyRate || 0;
    const hourlyRate = selectedWorker.hourlyRate || 0;

    if (calcMode === 'days') {
      return Math.round(dailyRate * calcValue);
    }
    if (calcMode === 'hours') {
      return Math.round(hourlyRate * calcValue);
    }
    return 0;
  })();

  // Handle submit
  const handleAddDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) return;

    const newDecision: IncentivePenalty = {
      id: generateUniqueId('IP'),
      workerId: selectedWorkerId,
      type: decisionType,
      category: category,
      amount: calculatedAmount,
      calcMode: calcMode,
      calcValue: calcValue,
      notes: notes || `قرار يدوي - ${category}`,
      date: decisionDate,
      status: 'pending'
    };

    setIncentivePenalties([newDecision, ...incentivePenalties]);
    // Reset Form
    setNotes('');
    setCalcValue(0);
    setCustomAmount(0);
  };

  // Toggle decision status
  const handleUpdateStatus = (id: string, newStatus: IncentivePenalty['status']) => {
    setIncentivePenalties(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  // Delete decision
  const handleDeleteDecision = (id: string) => {
    setIncentivePenalties(prev => prev.filter(item => item.id !== id));
  };

  // Stats calculation for SVG charts & summary cards
  const totalIncentives = incentivePenalties
    .filter(p => p.type === 'incentive')
    .reduce((sum, current) => sum + current.amount, 0);

  const totalPenalties = incentivePenalties
    .filter(p => p.type === 'penalty')
    .reduce((sum, current) => sum + current.amount, 0);

  const netAmount = totalIncentives - totalPenalties;

  // Pie chart calculation
  const totalVolume = totalIncentives + totalPenalties;
  const incentivesPercentage = totalVolume > 0 ? (totalIncentives / totalVolume) * 100 : 0;
  const penaltiesPercentage = totalVolume > 0 ? (totalPenalties / totalVolume) * 100 : 0;

  // Filter decisions
  const filteredDecisions = incentivePenalties.filter(item => {
    const worker = workers.find(w => w.id === item.workerId);
    const matchesSearch =
      (worker?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.workerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType =
      typeFilter === 'all' ||
      item.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div id="screen-incentives-penalties" className="flex flex-col gap-8 pb-12">
      {/* Title Header Block */}
      <div className="flex flex-col gap-1 text-right">
        <h1 className="text-2xl font-black text-[#1E293B] font-readex">إدارة الحوافز والجزاءات اليدوية</h1>
        <p className="text-sm text-[#78716C] font-semibold">
          صياغة قرارات الحوافز الإنتاجية والجزاءات الانضباطية المباشرة للعمال وتأثيرها اللحظي على مسير الأجور والرواتب.
        </p>
      </div>

      {/* Breakdown Visualization & Input Form Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Statistics & SVG Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-6 justify-between">
          <div className="border-b border-[#F5EFE8] pb-3">
            <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#0D9488] text-lg">donut_large</span>
              الموازنة الداخلية لاستحقاقات العمال
            </h3>
            <p className="text-[11px] text-[#78716C] font-medium">قرارات إدارية معلقة تُسوّى حصراً في مسير الرواتب الشهري (لا تمس حركة الخزينة النقدية مباشرة)</p>
          </div>

          {/* Custom SVG Donut Component */}
          <div className="relative flex items-center justify-center h-48 bg-[#FAF8F5]/50 rounded-xl border border-[#EDE8E0]/60">
            <svg width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]">
              {/* Background Circle */}
              <circle cx="50" cy="50" r="38" fill="none" stroke="#FAF8F5" strokeWidth="12" />
              
              {/* Incentives Arc */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#0D9488"
                strokeWidth="12"
                strokeDasharray={`${incentivesPercentage * 2.38} 238`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />

              {/* Penalties Arc */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#EA580C"
                strokeWidth="12"
                strokeDasharray={`${penaltiesPercentage * 2.38} 238`}
                strokeDashoffset={`-${incentivesPercentage * 2.38}`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Absolute Summary Badge */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] font-bold text-[#78716C]">صافي التسوية</span>
              <span className={`text-lg font-black font-readex ${netAmount >= 0 ? 'text-[#0D9488]' : 'text-[#C2410C]'}`}>
                {netAmount >= 0 ? `+${netAmount.toLocaleString()}` : `${netAmount.toLocaleString()}`}
              </span>
              <span className="text-[10px] text-[#A8A29E] font-medium">ج.م في كشف الراتب</span>
            </div>
          </div>

          {/* Breakdown Legend Cards */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#E8FAF1]/80 border border-[#D1F3E2]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]"></span>
                <span className="text-xs text-[#1F2937] font-semibold">إجمالي الحوافز الممنوحة (تُضاف للراتب):</span>
              </div>
              <span className="text-sm font-black text-[#006C4A] font-readex">+{totalIncentives.toLocaleString()} ج.م</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FEE2E2]/80 border border-[#FECACA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C]"></span>
                <span className="text-xs text-[#1F2937] font-semibold">إجمالي الخصومات المفروضة (تُستقطع من الراتب):</span>
              </div>
              <span className="text-sm font-black text-[#991B1B] font-readex">-{totalPenalties.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Input Form (7 Cols) */}
        <form onSubmit={handleAddDecision} className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-4">
          <div className="border-b border-[#F5EFE8] pb-3">
            <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#B45309] text-lg">gavel</span>
              صياغة قرار انضباطي / مكافأة يدوية فورية
            </h3>
            <p className="text-[11px] text-[#78716C] font-medium">تسجيل قرارات لجان الجودة والصيانة بخصم أيام، ساعات أو مكافآت مقطوعة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Worker Selection */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">العامل / الكادر المستهدف:</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:ring-2 focus:ring-[#0D9488]"
                required
              >
                {workers.length === 0 ? (
                  <option value="">-- يرجى إضافة عمال أولاً من قسم الكوادر --</option>
                ) : (
                  workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} - {w.role}</option>
                  ))
                )}
              </select>
            </div>

            {/* Type Switch (Incentive vs Penalty) */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">نوع المعاملة:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionType('incentive');
                    setCategory('حافز تميز إنتاجي');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                    decisionType === 'incentive'
                      ? 'bg-[#E8FAF1] text-[#006C4A] border-2 border-[#0D9488]'
                      : 'bg-[#FAF9F5] text-[#57534E] border border-[#D6CEBF]'
                  }`}
                >
                  حافز / مكافأة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionType('penalty');
                    setCategory('مخالفة معايير السلامة');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                    decisionType === 'penalty'
                      ? 'bg-[#FEE2E2] text-[#991B1B] border-2 border-[#EF4444]'
                      : 'bg-[#FAF9F5] text-[#57534E] border border-[#D6CEBF]'
                  }`}
                >
                  خصم / جزاء
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category of Decision */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">فئة / سبب القرار:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:ring-2 focus:ring-[#0D9488]"
              >
                {decisionType === 'incentive' ? (
                  <>
                    <option value="حافز إنتاج إضافي">حافز إنتاج إضافي</option>
                    <option value="مكافأة جودة فائقة">مكافأة جودة فائقة</option>
                    <option value="مكافأة تميز وابتكار">مكافأة تميز وابتكار</option>
                    <option value="حافز انضباط وحضور">حافز انضباط وحضور</option>
                  </>
                ) : (
                  <>
                    <option value="مخالفة معايير السلامة">مخالفة معايير السلامة</option>
                    <option value="تأخير تجاوز المسموح">تأخير تجاوز المسموح</option>
                    <option value="تقصير في خط الإنتاج">تقصير في خط الإنتاج</option>
                    <option value="غياب غير مبرر">غياب غير مبرر</option>
                  </>
                )}
              </select>
            </div>

            {/* Calculation Mode */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">آلية الاحتساب المالي:</label>
              <select
                value={calcMode}
                onChange={(e) => setCalcMode(e.target.value as any)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B]"
              >
                <option value="fixed">مبلغ ثابت مقطوع (ج.م)</option>
                <option value="days">خصم / حافز بالأيام</option>
                <option value="hours">خصم / حافز بالساعات</option>
              </select>
            </div>

            {/* Calculation Value or Amount */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">
                {calcMode === 'fixed' ? 'القيمة المقطوعة (ج.م):' : 'عدد الوحدات (أيام/ساعات):'}
              </label>
              <input
                type="number"
                min="0"
                value={calcMode === 'fixed' ? customAmount : calcValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (calcMode === 'fixed') setCustomAmount(val);
                  else setCalcValue(val);
                }}
                className="p-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B]"
                required
              />
            </div>
          </div>

          {/* Interactive Formula Summary Alert Block */}
          <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between text-xs text-[#78350F] font-semibold">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#D97706]">lock</span>
              <div>
                <span>حسبة لحظية: {selectedWorker?.name} (الراتب الأساسي التعاقدي الثابت: {selectedWorker?.baseSalary?.toLocaleString()} ج.م)</span>
                <p className="text-[10px] text-[#92400E] mt-0.5">
                  {calcMode === 'days' && `معدل اليوم التعاقدي = ${Math.round(selectedWorker?.dailyRate || (selectedWorker?.baseSalary ? selectedWorker.baseSalary / 26 : 0))} ج.م (الحسبة لـ ${calcValue} يوم)`}
                  {calcMode === 'hours' && `معدل الساعة التعاقدي = ${Math.round(selectedWorker?.hourlyRate || (selectedWorker?.baseSalary ? selectedWorker.baseSalary / (26 * 8) : 0))} ج.م (الحسبة لـ ${calcValue} ساعة)`}
                  {calcMode === 'fixed' && `مبلغ مقطوع مضاف/مخصوم بشكل منفصل`}
                  <span className="block text-[#047857] font-bold mt-0.5">
                    ✓ الراتب الأساسي ثابت ولا يتغير، ويضاف هذا البند تلقائياً إلى كشف مسير الرواتب في خانة {decisionType === 'incentive' ? 'المكافآت المتعددة' : 'الاستقطاعات المتعددة'}.
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#92400E]">القيمة الصافية للبند</span>
              <span className={`text-sm font-black ${decisionType === 'incentive' ? 'text-[#0D9488]' : 'text-[#C2410C]'}`}>
                {decisionType === 'incentive' ? '+' : '-'} {calculatedAmount} ج.م
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Notes */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">ملاحظات وتفاصيل القرار:</label>
              <input
                type="text"
                placeholder="توضيح مبرر القرار ومحضر الجلسة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs text-[#1E293B]"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5 text-right">
              <label className="text-xs font-bold text-[#1E293B]">تاريخ التسجيل:</label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs text-[#1E293B]"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`mt-2 py-3 px-6 rounded-xl font-bold text-xs text-white shadow transition-all flex items-center justify-center gap-2 ${
              decisionType === 'incentive' ? 'bg-[#0D9488] hover:bg-[#0A7368]' : 'bg-[#C2410C] hover:bg-[#99340B]'
            }`}
          >
            <span className="material-symbols-outlined text-base">task_alt</span>
            اعتماد القرار وإضافته للمسير المالي للوردية
          </button>
        </form>
      </div>

      {/* Manual Decisions Registry Log Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
          <div className="flex flex-col gap-1 text-right">
            <h3 className="text-[15px] font-bold text-[#1E293B]">سجل القرارات والجزاءات اليدوية المعتمدة والمعلقة</h3>
            <p className="text-xs text-[#78716C] font-medium">بحث وتعديل وإلغاء المعاملات الاستثنائية التي تم اتخاذها خارج البصمة الآلية</p>
          </div>

          {/* Search Inputs */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="ابحث بالعامل أو سبب القرار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B]"
              />
              <span className="material-symbols-outlined absolute left-3 top-2 text-lg text-[#78716C]">search</span>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B]"
            >
              <option value="all">جميع المعاملات</option>
              <option value="incentive">الحوافز والمكافآت فقط</option>
              <option value="penalty">الجزاءات والخصومات فقط</option>
            </select>
          </div>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-[#F5EFE8] text-[#57534E] text-xs font-bold">
                <th className="pb-3 px-4">رقم القرار</th>
                <th className="pb-3 px-4">العامل المستهدف</th>
                <th className="pb-3 px-4">النوع والسبب</th>
                <th className="pb-3 px-4">التاريخ</th>
                <th className="pb-3 px-4">تفاصيل وملاحظات</th>
                <th className="pb-3 px-4 text-left">قيمة الخصم/المكافأة</th>
                <th className="pb-3 px-4 text-center">حالة الصرف والاعتماد</th>
                <th className="pb-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDecisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#78716C] font-semibold">
                    لا توجد قرارات مطابقة لفلتر البحث المحدد حالياً.
                  </td>
                </tr>
              ) : (
                filteredDecisions.map((item) => {
                  const targetWorker = workers.find(w => w.id === item.workerId);
                  const isInc = item.type === 'incentive';
                  return (
                    <tr key={item.id} className="border-b border-[#FAF9F5] hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                      <td className="py-4 px-4 font-bold text-[#78716C]">{item.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col text-right">
                          <span className="font-bold text-[#1E293B] text-xs">{targetWorker?.name || "عامل مسجل"}</span>
                          <span className="text-[10px] text-[#78716C] font-semibold">{targetWorker?.role}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-black ${
                            isInc ? 'bg-[#D4F4E4] text-[#006C4A]' : 'bg-[#FEE2E2] text-[#991B1B]'
                          }`}>
                            {isInc ? 'حافز إنتاجي' : 'خصم انضباطي'}
                          </span>
                          <span className="font-bold text-[#1E293B]">{item.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-[#57534E]">{item.date}</td>
                      <td className="py-4 px-4 text-[#57534E] max-w-xs truncate" title={item.notes}>{item.notes}</td>
                      <td className="py-4 px-4 text-left font-black text-sm">
                        <span className={isInc ? 'text-[#0D9488]' : 'text-[#C2410C]'}>
                          {isInc ? '+' : '-'} {item.amount} ج.م
                        </span>
                        <div className="text-[9px] text-[#78716C] font-semibold mt-0.5">
                          {item.calcMode === 'days' ? `${item.calcValue} أيام` : item.calcMode === 'hours' ? `${item.calcValue} ساعات` : 'ثابت'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'approved-added' ? 'bg-[#D4F4E4] text-[#006C4A]' :
                          item.status === 'final-approved' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                          item.status === 'approved-manager' ? 'bg-[#E8F0FE] text-[#1A73E8]' :
                          'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {item.status === 'approved-added' ? 'أضيف للرواتب' :
                           item.status === 'final-approved' ? 'معتمد نهائي' :
                           item.status === 'approved-manager' ? 'اعتماد الإدارة' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'approved-manager')}
                              title="اعتماد من الإدارة"
                              className="p-1 text-[#0D9488] hover:bg-[#E8FAF1] rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">verified</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDecision(item.id)}
                            title="إلغاء المعاملة"
                            className="p-1 text-[#C2410C] hover:bg-[#FEE2E2] rounded transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
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
    </div>
  );
}
