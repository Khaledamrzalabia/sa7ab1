import React, { useState, useMemo } from 'react';
import { Worker, IncentivePenalty, AttendanceLog } from '../types';
import { calculateWorkerRates } from '../data';
import {
  calculateWorkerMonthlyRegularity,
  calculateWeeklyRegularity,
  getCurrentWeekRange,
} from '../utils/regularityEngine';

interface EmployeesManagementProps {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  incentivePenalties?: IncentivePenalty[];
  setIncentivePenalties?: React.Dispatch<React.SetStateAction<IncentivePenalty[]>>;
  attendanceLogs?: AttendanceLog[];
  onOpenWorkerCard?: (worker: Worker) => void;
  onNavigate?: (view: any) => void;
}

export default function EmployeesManagement({
  workers,
  setWorkers,
  incentivePenalties = [],
  setIncentivePenalties,
  attendanceLogs = [],
  onOpenWorkerCard,
  onNavigate,
}: EmployeesManagementProps) {
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form Fields State
  const [name, setName] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [department, setDepartment] = useState<string>('تشكيل حراري ورقمي');
  const [line, setLine] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [shiftStart, setShiftStart] = useState<string>('08:00 ص');
  const [shiftEnd, setShiftEnd] = useState<string>('04:00 م');
  const [status, setStatus] = useState<Worker['status']>('active');
  const [notes, setNotes] = useState<string>('');

  // Action (Note / Bonus / Penalty) Modal State
  const [actionModalWorker, setActionModalWorker] = useState<Worker | null>(null);
  const [actionType, setActionType] = useState<'note' | 'bonus' | 'penalty'>('note');
  const [actionNoteText, setActionNoteText] = useState<string>('');
  const [actionAmount, setActionAmount] = useState<number>(0);
  const [actionReason, setActionReason] = useState<string>('');
  const [actionDate, setActionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formRegularityBonus, setFormRegularityBonus] = useState<number>(500);

  // Penalty Calculation Mode State
  const [penaltyMode, setPenaltyMode] = useState<'fixed' | 'days' | 'minutes'>('fixed');
  const [penaltyDays, setPenaltyDays] = useState<number>(1);
  const [penaltyMinutes, setPenaltyMinutes] = useState<number>(30);

  // Safe Deactivate / Archive Modal State
  const [deactivateModalWorker, setDeactivateModalWorker] = useState<Worker | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'leave' | 'archived'>('all');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'with-discount' | 'with-bonus' | 'with-notes' | 'clean'>('all');

  // Rates calculation for the form
  const formRates = calculateWorkerRates(baseSalary || 0);

  // Open Modal to Add New Worker
  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setName('');
    setShortCode(String(100 + workers.length + 1));
    setRole('');
    setNationalId('');
    setDepartment('تشكيل حراري ورقمي');
    setLine('');
    setBaseSalary(0);
    setFormRegularityBonus(500);
    setShiftStart('08:00 ص');
    setShiftEnd('04:00 م');
    setStatus('active');
    setNotes('');
    setIsFormModalOpen(true);
  };

  // Open Modal to Edit Existing Worker
  const handleOpenEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name);
    setShortCode(worker.shortCode || '');
    setRole(worker.role);
    setNationalId(worker.nationalId);
    setDepartment(worker.department);
    setLine(worker.line);
    setBaseSalary(worker.baseSalary);
    setFormRegularityBonus(worker.monthlyRegularityBonus ?? 500);
    setShiftStart(worker.shiftStart || '08:00 ص');
    setShiftEnd(worker.shiftEnd || '04:00 م');
    setStatus(worker.status);
    setNotes(worker.notes || '');
    setIsFormModalOpen(true);
  };

  // Submit Worker (Create or Update)
  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('يرجى إدخال اسم الموظف رباعي.');
      return;
    }

    if (nationalId.trim().length !== 14) {
      if (!confirm('الرقم القومي ليس 14 رقماً، هل تريد المتابعة على أية حال؟')) {
        return;
      }
    }

    const rates = calculateWorkerRates(baseSalary);
    const assignedShortCode = shortCode.trim() || String(100 + workers.length + 1);

    if (editingWorker) {
      // Update existing worker
      setWorkers(prev => prev.map(w => {
        if (w.id === editingWorker.id) {
          return {
            ...w,
            name: name.trim(),
            shortCode: assignedShortCode,
            role: role.trim(),
            nationalId: nationalId.trim(),
            department,
            line: line.trim() || 'الخط الرئيسي للمصنع',
            baseSalary,
            ...rates,
            monthlyRegularityBonus: formRegularityBonus,
            shiftStart,
            shiftEnd,
            status,
            notes: notes.trim()
          };
        }
        return w;
      }));
    } else {
      // Create new worker
      const newId = `EMP-${Date.now().toString().slice(-4)}`;
      const newWorker: Worker = {
        id: newId,
        name: name.trim(),
        shortCode: assignedShortCode,
        role: role.trim() || 'فني تشغيل',
        nationalId: nationalId.trim(),
        department,
        line: line.trim() || 'الخط الرئيسي للمصنع',
        baseSalary,
        ...rates,
        monthlyRegularityBonus: formRegularityBonus,
        shiftStart,
        shiftEnd,
        status,
        notes: notes.trim(),
        manualDiscount: 0,
        hasDiscount: false,
        discountNotes: '',
        manualBonus: 0,
        hasBonus: false,
        bonusNotes: ''
      };

      setWorkers([newWorker, ...workers]);
    }

    setIsFormModalOpen(false);
    setEditingWorker(null);
  };

  // Toggle active / inactive status quickly
  const handleToggleStatus = (worker: Worker) => {
    const nextStatus = worker.status === 'active' ? 'inactive' : 'active';
    setWorkers(prev => prev.map(w => {
      if (w.id === worker.id) {
        return { ...w, status: nextStatus };
      }
      return w;
    }));
  };

  // Weekly & Monthly Regularity Calculations
  const currentWeek = useMemo(() => getCurrentWeekRange(), []);
  const weeklyAnalysis = useMemo(() => {
    return calculateWeeklyRegularity(
      workers,
      attendanceLogs,
      incentivePenalties,
      currentWeek.startDate,
      currentWeek.endDate
    );
  }, [workers, attendanceLogs, incentivePenalties, currentWeek]);

  const weeklyCandidatesMap = useMemo(() => {
    const map = new Map<string, typeof weeklyAnalysis.candidates[0]>();
    weeklyAnalysis.candidates.forEach(c => map.set(c.workerId, c));
    return map;
  }, [weeklyAnalysis]);

  const currentMonth = useMemo(() => new Date().getMonth() + 1, []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Open Unified Action Modal (Note / Bonus / Deduction)
  const handleOpenActionModal = (worker: Worker, defaultType: 'note' | 'bonus' | 'penalty' = 'note') => {
    setActionModalWorker(worker);
    setActionType(defaultType);
    setActionDate(new Date().toISOString().split('T')[0]);
    setPenaltyMode('fixed');
    setPenaltyDays(1);
    setPenaltyMinutes(30);

    if (defaultType === 'bonus') {
      setActionAmount(worker.manualBonus || 0);
      setActionReason(worker.bonusNotes || '');
    } else if (defaultType === 'penalty') {
      setActionAmount(worker.manualDiscount || 0);
      setActionReason(worker.discountNotes || '');
    } else {
      setActionNoteText(worker.notes || '');
    }
  };

  // Preset helpers for Penalty calculation modes
  const handleSetPenaltyDays = (days: number) => {
    setPenaltyDays(days);
    if (actionModalWorker) {
      const daily = (Number(actionModalWorker.baseSalary) || 0) / 30;
      const amt = Math.round(daily * days);
      setActionAmount(amt);
      const label = days === 0.25 ? 'ربع يوم' : days === 0.5 ? 'نصف يوم' : days === 1 ? 'يوم كامل' : `${days} أيام`;
      setActionReason(`خصم جزاء إداري (${label})`);
    }
  };

  const handleSetPenaltyMinutes = (mins: number) => {
    setPenaltyMinutes(mins);
    if (actionModalWorker) {
      const perMin = (Number(actionModalWorker.baseSalary) || 0) / 14400;
      const amt = Math.round(perMin * mins);
      setActionAmount(amt);
      setActionReason(`خصم تأخير عن الوردية (${mins} دقيقة)`);
    }
  };

  // Save Unified Action
  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalWorker) return;

    if (actionType === 'note') {
      setWorkers(prev => prev.map(w => {
        if (w.id === actionModalWorker.id) {
          return {
            ...w,
            notes: actionNoteText.trim()
          };
        }
        return w;
      }));
    } else if (actionType === 'bonus') {
      if (actionAmount > 0 && setIncentivePenalties) {
        const newInc: IncentivePenalty = {
          id: `IP-${Date.now().toString().slice(-4)}`,
          workerId: actionModalWorker.id,
          type: 'incentive',
          category: actionReason.trim() || 'مكافأة إنتاج وبونص',
          amount: actionAmount,
          calcMode: 'fixed',
          calcValue: actionAmount,
          notes: actionReason.trim() || 'مكافأة إضافية من ملف الموظف',
          date: actionDate,
          status: 'approved-added'
        };
        // Deduplicate any previous profile bonus to prevent duplicate entries
        setIncentivePenalties(prev => [
          newInc,
          ...prev.filter(p => !(p.workerId === actionModalWorker.id && p.type === 'incentive' && p.notes.includes('من ملف الموظف')))
        ]);
      }
      setWorkers(prev => prev.map(w => {
        if (w.id === actionModalWorker.id) {
          return {
            ...w,
            manualBonus: actionAmount,
            bonusNotes: actionReason.trim(),
            hasBonus: actionAmount > 0
          };
        }
        return w;
      }));
    } else if (actionType === 'penalty') {
      if (actionAmount > 0 && setIncentivePenalties) {
        const newPen: IncentivePenalty = {
          id: `IP-${Date.now().toString().slice(-4)}`,
          workerId: actionModalWorker.id,
          type: 'penalty',
          category: penaltyMode === 'minutes' ? 'خصم دقائق تأخير' : penaltyMode === 'days' ? 'خصم أيام عمل' : (actionReason.trim() || 'خصم جزاء إداري'),
          amount: actionAmount,
          calcMode: penaltyMode === 'days' ? 'days' : penaltyMode === 'minutes' ? 'hours' : 'fixed',
          calcValue: penaltyMode === 'days' ? penaltyDays : penaltyMode === 'minutes' ? penaltyMinutes : actionAmount,
          notes: actionReason.trim() || 'خصم إضافي من ملف الموظف',
          date: actionDate,
          status: 'final-approved'
        };
        // Deduplicate any previous profile penalty to prevent duplicate deductions
        setIncentivePenalties(prev => [
          newPen,
          ...prev.filter(p => !(p.workerId === actionModalWorker.id && p.type === 'penalty' && p.notes.includes('من ملف الموظف')))
        ]);
      }
      setWorkers(prev => prev.map(w => {
        if (w.id === actionModalWorker.id) {
          return {
            ...w,
            manualDiscount: actionAmount,
            discountNotes: actionReason.trim(),
            hasDiscount: actionAmount > 0
          };
        }
        return w;
      }));
    }

    setActionModalWorker(null);
  };

  // Clear specific action record with synchronization
  const handleClearBonus = (workerId: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          manualBonus: 0,
          bonusNotes: '',
          hasBonus: false
        };
      }
      return w;
    }));

    if (setIncentivePenalties) {
      setIncentivePenalties(prev =>
        prev.filter(p => !(p.workerId === workerId && p.type === 'incentive' && p.notes.includes('من ملف الموظف')))
      );
    }
  };

  const handleClearDiscount = (workerId: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          manualDiscount: 0,
          discountNotes: '',
          hasDiscount: false
        };
      }
      return w;
    }));

    if (setIncentivePenalties) {
      setIncentivePenalties(prev =>
        prev.filter(p => !(p.workerId === workerId && p.type === 'penalty' && p.notes.includes('من ملف الموظف')))
      );
    }
  };

  // Safe Deactivation / Archiving
  const handleDeactivateWorker = (workerId: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        return {
          ...w,
          status: 'inactive',
          isArchived: true
        };
      }
      return w;
    }));
    setDeactivateModalWorker(null);
  };

  // Permanent Delete (only if explicitly chosen)
  const handlePermanentDelete = (workerId: string) => {
    if (confirm('تنبيه هام: هل أنت متأكد تماماً من حذف سجل هذا الموظف نهائياً؟ يُفضل إلغاء التفعيل للحفاظ على الترابط المالي والتاريخي.')) {
      setWorkers(prev => prev.filter(w => w.id !== workerId));
      setDeactivateModalWorker(null);
    }
  };

  // Filter workers
  const filteredWorkers = workers.filter(w => {
    // Search query matches
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.nationalId.includes(searchQuery) ||
      (w.notes && w.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    // Department match
    const matchesDept = departmentFilter === 'all' || w.department === departmentFilter;

    // Status match
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = w.status === 'active' && !w.isArchived;
    else if (statusFilter === 'inactive') matchesStatus = w.status === 'inactive' && !w.isArchived;
    else if (statusFilter === 'leave') matchesStatus = w.status === 'leave' && !w.isArchived;
    else if (statusFilter === 'archived') matchesStatus = !!w.isArchived;

    // Financial & Notes match
    let matchesFinancial = true;
    if (financialFilter === 'with-discount') {
      matchesFinancial = !!(w.hasDiscount || (w.manualDiscount && w.manualDiscount > 0) || (w.discountNotes && w.discountNotes.trim().length > 0));
    } else if (financialFilter === 'with-bonus') {
      matchesFinancial = !!(w.hasBonus || (w.manualBonus && w.manualBonus > 0) || (w.bonusNotes && w.bonusNotes.trim().length > 0));
    } else if (financialFilter === 'with-notes') {
      matchesFinancial = !!(w.notes && w.notes.trim().length > 0);
    } else if (financialFilter === 'clean') {
      const hasD = !!(w.hasDiscount || (w.manualDiscount && w.manualDiscount > 0));
      const hasB = !!(w.hasBonus || (w.manualBonus && w.manualBonus > 0));
      matchesFinancial = !hasD && !hasB;
    }

    return matchesSearch && matchesDept && matchesStatus && matchesFinancial;
  });

  // Statistics counters
  const totalCount = workers.length;
  const activeCount = workers.filter(w => w.status === 'active' && !w.isArchived).length;
  const inactiveCount = workers.filter(w => w.status === 'inactive' || w.isArchived).length;
  const discountCount = workers.filter(w => w.hasDiscount || (w.manualDiscount && w.manualDiscount > 0)).length;
  const bonusCount = workers.filter(w => w.hasBonus || (w.manualBonus && w.manualBonus > 0)).length;

  return (
    <div id="screen-employees-management" className="flex flex-col gap-6 pb-12 text-right">
      
      {/* Top Banner & Action Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm">
        
        {/* Title & Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold shadow-inner">
            <span className="material-symbols-outlined text-3xl">badge</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
              سجل الموظفين والعمال والرواتب
            </h1>
            <p className="text-xs text-[#78716C] font-semibold mt-0.5">
              إدارة الكوادر، الأجور بالجنيه المصري (ج.م)، الإجراءات الإدارية، المكافآت والخصومات
            </p>
          </div>
        </div>

        {/* Primary Action Button (إضافة موظف جديد) */}
        <button
          id="btn-add-employee-top"
          type="button"
          onClick={handleOpenAddModal}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-[#0D9488] hover:bg-[#0A7368] text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-xl">person_add</span>
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#EBE3D8] shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#78716C]">إجمالي الكوادر</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#1E293B] font-readex">{totalCount}</span>
            <span className="material-symbols-outlined text-gray-400 text-lg">group</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#166534]">على رأس العمل</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#166534] font-readex">{activeCount}</span>
            <span className="material-symbols-outlined text-[#166534] text-lg">check_circle</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#92400E]">مكافآت وبونص</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#92400E] font-readex">{bonusCount}</span>
            <span className="material-symbols-outlined text-[#92400E] text-lg">workspace_premium</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold text-[#991B1B]">خصومات وجزاءات</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#991B1B] font-readex">{discountCount}</span>
            <span className="material-symbols-outlined text-[#991B1B] text-lg">balance</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E6DDD1] shadow-xs flex flex-col gap-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-[#78716C]">موقوفون / مؤرشفون</span>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#57534E] font-readex">{inactiveCount}</span>
            <span className="material-symbols-outlined text-[#78716C] text-lg">pause_circle</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Search, Filters & Employee Directory Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-5">
        
        {/* Filters Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-[#F5EFE8] pb-4">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <input
              type="text"
              placeholder="بحث بالاسم، الرقم القومي، المسمى، أو الملاحظات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] focus:bg-white outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-base text-[#78716C]">search</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-[#78716C] hover:text-[#1E293B]"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
            >
              <option value="all">الحالة الوظيفية (الكل)</option>
              <option value="active">على رأس العمل فقط</option>
              <option value="inactive">موقوف مؤقتاً</option>
              <option value="leave">في إجازة رسمية</option>
              <option value="archived">المؤرشفون</option>
            </select>

            {/* Financial / Notes Filter */}
            <select
              value={financialFilter}
              onChange={(e) => setFinancialFilter(e.target.value as any)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
            >
              <option value="all">السجل المالي والإداري (الكل)</option>
              <option value="with-bonus">لديهم بونص ومكافآت</option>
              <option value="with-discount">عليهم خصومات وجزاءات</option>
              <option value="with-notes">لديهم ملاحظات إدارية</option>
              <option value="clean">سجلات نظيفة (بدون خصم أو بونص)</option>
            </select>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
            >
              <option value="all">الأقسام الفنية (الكل)</option>
              <option value="تشكيل حراري ورقمي">تشكيل حراري ورقمي</option>
              <option value="مراقبة الجودة والمعايرة">مراقبة الجودة والمعايرة</option>
              <option value="تجمع آلي وروبوتيك">تجمع آلي وروبوتيك</option>
              <option value="الصيانة العامة والمرافق">الصيانة العامة والمرافق</option>
              <option value="تعبئة وتغليف وفرز">تعبئة وتغليف وفرز</option>
              <option value="صالة الكبس والصلب">صالة الكبس والصلب</option>
              <option value="عنبر الـ CNC والتشغيل الآلي">عنبر الـ CNC والتشغيل الآلي</option>
              <option value="المستودع الرئيسي للمواد الخام">المستودع الرئيسي للمواد الخام</option>
            </select>
          </div>
        </div>

        {/* Workers Table */}
        <div className="overflow-x-auto rounded-xl border border-[#F0EAE1]">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EBE3D8] text-[#57534E] font-bold bg-[#FAF8F5]">
                <th className="py-3.5 px-4 font-black">اسم الموظف / الوظيفة</th>
                <th className="py-3.5 px-3 font-black">الرقم القومي</th>
                <th className="py-3.5 px-3 font-black">القسم وخط التشغيل</th>
                <th className="py-3.5 px-3 font-black text-left">الراتب الأساسي وأجر الدقيقة (ج.م)</th>
                <th className="py-3.5 px-3 font-black min-w-[240px]">المكافآت والخصومات والملاحظات</th>
                <th className="py-3.5 px-3 font-black text-center">الحالة</th>
                <th className="py-3.5 px-4 font-black text-center min-w-[140px]">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFE8]">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#78716C]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-gray-300">person_off</span>
                      <p className="text-xs font-bold text-[#57534E]">لا توجد سجلات تطابق خيارات البحث الحالية</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-[11px] font-bold hover:bg-[#0A7368]"
                      >
                        إضافة موظف جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const hasDiscount = worker.hasDiscount || (worker.manualDiscount && worker.manualDiscount > 0) || (worker.discountNotes && worker.discountNotes.trim().length > 0);
                  const hasBonus = worker.hasBonus || (worker.manualBonus && worker.manualBonus > 0) || (worker.bonusNotes && worker.bonusNotes.trim().length > 0);
                  const hasGeneralNotes = worker.notes && worker.notes.trim().length > 0;
                  const isSuspended = worker.status === 'inactive' || worker.isArchived;

                  return (
                    <tr
                      key={worker.id}
                      className={`hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937] ${isSuspended ? 'bg-gray-50/70 opacity-80' : ''}`}
                    >
                      {/* Name & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-right">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-[#1E293B] text-xs md:text-[13px]">{worker.name}</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-black font-mono font-black text-[10px]" title="كود التحضير السريع">
                              #{worker.shortCode || worker.id}
                            </span>
                            {worker.isArchived && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-200 text-gray-700">
                                مؤرشف
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#78716C] font-semibold">{worker.role}</span>
                        </div>
                      </td>

                      {/* National ID */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs text-[#475569] font-bold tracking-wider">
                          {worker.nationalId || "—"}
                        </span>
                      </td>

                      {/* Department & Line */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#1F2937] text-[11px]">{worker.department}</span>
                          <span className="text-[9px] text-[#78716C]">{worker.line}</span>
                        </div>
                      </td>

                      {/* Salary & Minute Rate */}
                      <td className="py-3.5 px-3 text-left">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-xs md:text-sm text-[#1E293B] font-readex">
                            {(Number(worker.baseSalary) || 0).toLocaleString()} <span className="text-[10px] font-bold">ج.م</span>
                          </span>
                          <div className="text-[10px] text-[#006C4A] font-bold">
                            اليوم: {((Number(worker.baseSalary) || 0) / 30).toFixed(1)} ج.م
                          </div>
                          <div className="text-[9px] text-[#C2410C] font-semibold">
                            الدقيقة: {((Number(worker.baseSalary) || 0) / 14400).toFixed(3)} ج.م
                          </div>
                        </div>
                      </td>

                      {/* Administrative Records: Bonuses, Discounts, Notes & Regularity Status */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1.5">
                          {(() => {
                            const weeklyCand = weeklyCandidatesMap.get(worker.id);
                            const monthlyStatus = calculateWorkerMonthlyRegularity(worker, attendanceLogs, currentYear, currentMonth);

                            return (
                              <>
                                {/* Monthly Regularity Status Badge */}
                                <div className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between font-bold ${
                                  monthlyStatus.status === 'full_100'
                                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                                    : monthlyStatus.status === 'half_50'
                                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                                    : monthlyStatus.status === 'deduct_50'
                                    ? 'bg-orange-50/90 border-orange-200 text-orange-950'
                                    : 'bg-rose-50/90 border-rose-200 text-rose-950'
                                }`}>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">
                                      {monthlyStatus.status === 'canceled' ? 'cancel' : 'military_tech'}
                                    </span>
                                    بونص الشهر ({monthlyStatus.status === 'full_100' ? 'مستحق 100%' : monthlyStatus.status === 'half_50' ? 'نصف 50%' : monthlyStatus.status === 'deduct_50' ? '-50 ج' : 'ملغي'}):
                                  </span>
                                  <span className="font-mono font-black">
                                    {monthlyStatus.finalBonus.toLocaleString()} ج.م
                                  </span>
                                </div>

                                {/* Weekly Regularity Qualification Badge */}
                                <div className={`px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center justify-between ${
                                  weeklyCand?.isQualified
                                    ? 'bg-[#E6F4EA] border-[#A8DAB5] text-[#137333]'
                                    : 'bg-stone-50 border-stone-200 text-stone-600'
                                }`}>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px]">
                                      {weeklyCand?.isQualified ? 'verified' : 'info'}
                                    </span>
                                    <span>بونص الأسبوع (100 ج):</span>
                                  </span>
                                  <span>
                                    {weeklyCand?.isQualified ? (
                                      <span className="text-[#137333] font-black">🟢 مؤهل للمنافسة</span>
                                    ) : (
                                      <span className="text-stone-500 font-semibold truncate max-w-[130px]" title={weeklyCand?.disqualificationReason}>
                                        ⚠️ {weeklyCand?.disqualificationReason || 'غير مؤهل'}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </>
                            );
                          })()}

                          {/* Active Bonus Chip */}
                          {hasBonus && (
                            <div className="p-2 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#166534]">
                                  <span className="material-symbols-outlined text-xs">workspace_premium</span>
                                  مكافأة: {worker.manualBonus || 0} ج.م
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearBonus(worker.id)}
                                  title="مسح المكافأة"
                                  className="text-[9px] text-[#166534] hover:underline font-bold"
                                >
                                  مسح
                                </button>
                              </div>
                              {worker.bonusNotes && (
                                <p className="text-[9px] text-[#14532D] font-semibold">
                                  {worker.bonusNotes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Active Discount Chip */}
                          {hasDiscount && (
                            <div className="p-2 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex flex-col gap-0.5">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#991B1B]">
                                  <span className="material-symbols-outlined text-xs">balance</span>
                                  خصم: {worker.manualDiscount || 0} ج.م
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearDiscount(worker.id)}
                                  title="مسح الخصم واستعادة الأهلية"
                                  className="text-[9px] text-[#991B1B] hover:underline font-bold"
                                >
                                  مسح
                                </button>
                              </div>
                              {worker.discountNotes && (
                                <p className="text-[9px] text-[#7F1D1D] font-semibold leading-relaxed">
                                  {worker.discountNotes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Administrative Note */}
                          {hasGeneralNotes && (
                            <div className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] text-[#334155] font-medium">
                              <span className="font-bold text-[#1E293B]">ملاحظة: </span>
                              {worker.notes}
                            </div>
                          )}

                          {/* Clean record chip if nothing recorded */}
                          {!hasBonus && !hasDiscount && !hasGeneralNotes && (
                            <span className="text-[10px] font-semibold text-[#166534] inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              سجل إداري نظيف
                            </span>
                          )}

                          {/* Dedicated Action Buttons (خصم / مكافأة / ملاحظة) */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-[#EBE3D8]/60">
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(worker, 'penalty')}
                              title="تسجيل خصم أو جزاء مباشر لهذا الموظف"
                              className="flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black text-[#991B1B] bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-0.5 transition-all shadow-2xs active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">balance</span>
                              <span>خصم</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(worker, 'bonus')}
                              title="تسجيل مكافأة أو بونص لهذا الموظف"
                              className="flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black text-[#166534] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-0.5 transition-all shadow-2xs active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">workspace_premium</span>
                              <span>مكافأة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(worker, 'note')}
                              title="إضافة ملاحظة إدارية في ملف الموظف"
                              className="flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold text-[#334155] bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-0.5 transition-all shadow-2xs active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">edit_note</span>
                              <span>ملاحظة</span>
                            </button>
                          </div>

                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {worker.status === 'active' && !worker.isArchived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#166534]"></span>
                            نشط
                          </span>
                        ) : worker.status === 'leave' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                            إجازة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
                            موقوف
                          </span>
                        )}
                      </td>

                      {/* Complete Action Controls for this Employee */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* 1. View & Print QR ID Badge */}
                          {onOpenWorkerCard && (
                            <button
                              type="button"
                              onClick={() => onOpenWorkerCard(worker)}
                              title="عرض وتحميل وطباعة بطاقة الـ QR والباركود"
                              className="p-1.5 rounded-lg text-[#006C4A] bg-[#E8FAF1]/80 hover:bg-[#E8FAF1] border border-[#A7F3D0] transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">qr_code_2</span>
                            </button>
                          )}

                          {/* 2. Edit Full Employee Profile */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(worker)}
                            title="تعديل بيانات الموظف والراتب"
                            className="p-1.5 rounded-lg text-[#0369A1] bg-[#E0F2FE]/60 hover:bg-[#E0F2FE] border border-[#BAE6FD] transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>

                          {/* 3. Toggle Status (Active / Suspend) */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(worker)}
                            title={worker.status === 'active' ? 'إيقاف الموظف مؤقتاً' : 'إعادة تفعيل الموظف'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              worker.status === 'active'
                                ? 'text-[#D97706] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] border-[#FDE68A]'
                                : 'text-[#166534] bg-[#DCFCE7]/60 hover:bg-[#DCFCE7] border-[#BBF7D0]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">
                              {worker.status === 'active' ? 'pause_circle' : 'play_circle'}
                            </span>
                          </button>

                          {/* 4. Add Quick Action (Bonus / Penalty / Note) */}
                          <button
                            type="button"
                            onClick={() => handleOpenActionModal(worker, 'bonus')}
                            title="إضافة بونص أو خصم أو ملاحظة"
                            className="p-1.5 rounded-lg text-[#0D9488] bg-[#CCFBF1]/60 hover:bg-[#CCFBF1] border border-[#99F6E4] transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">add_box</span>
                          </button>

                          {/* 5. Safe Deactivate / Archive or Delete */}
                          <button
                            type="button"
                            onClick={() => setDeactivateModalWorker(worker)}
                            title="إلغاء تفعيل / أرشفة الحساب مع حماية البيانات"
                            className="p-1.5 rounded-lg text-[#DC2626] bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] border border-[#FECACA] transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">person_remove</span>
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
      {/* MODAL 1: ADD / EDIT EMPLOYEE MODAL (نافذة إضافة / تعديل الموظف الكاملة) */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-2xl w-full p-6 text-right flex flex-col gap-5 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">
                    {editingWorker ? 'edit_note' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">
                    {editingWorker ? `تعديل بيانات: ${editingWorker.name}` : 'إضافة موظف / عامل جديد'}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    {editingWorker ? 'تعديل الراتب، المسمى الوظيفي، خط الإنتاج، والأقسام' : 'أدخل البيانات الكاملة للموظف ليتم حساب الأجر والدقيقة تلقائياً'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] hover:text-[#1E293B] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWorker} className="flex flex-col gap-4">
              
              {/* Full Name & Short Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">اسم الموظف / العامل رباعي:</label>
                  <input
                    type="text"
                    placeholder="مثال: محمود إبراهيم الدسوقي خليل"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] focus:bg-white outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B] flex items-center justify-between">
                    <span>الكود السريع (QR Code):</span>
                    <span className="text-[10px] text-[#006C4A] font-black">رقم مختصر</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 101"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value)}
                    className="p-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/50 text-xs font-black text-[#1E293B] font-mono text-center tracking-widest focus:border-[#006C4A] outline-none"
                  />
                </div>
              </div>

              {/* Role & National ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">المسمى الوظيفي / الفئة:</label>
                  <input
                    type="text"
                    placeholder="فني تشغيل CNC / مهندس جودة"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B] flex items-center justify-between">
                    <span>الرقم القومي (14 رقم):</span>
                    <span className="text-[10px] text-[#78716C]">{nationalId.length}/14</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="29408151203491"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] font-mono tracking-wider focus:border-[#0D9488] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Department & Line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">القسم الفني:</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] outline-none"
                  >
                    <option value="تشكيل حراري ورقمي">تشكيل حراري ورقمي</option>
                    <option value="مراقبة الجودة والمعايرة">مراقبة الجودة والمعايرة</option>
                    <option value="تجمع آلي وروبوتيك">تجمع آلي وروبوتيك</option>
                    <option value="الصيانة العامة والمرافق">الصيانة العامة والمرافق</option>
                    <option value="تعبئة وتغليف وفرز">تعبئة وتغليف وفرز</option>
                    <option value="صالة الكبس والصلب">صالة الكبس والصلب</option>
                    <option value="عنبر الـ CNC والتشغيل الآلي">عنبر الـ CNC والتشغيل الآلي</option>
                    <option value="المستودع الرئيسي للمواد الخام">المستودع الرئيسي للمواد الخام</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">خط التشغيل / الوردية:</label>
                  <input
                    type="text"
                    placeholder="الخط الرئيسي / عنبر 2"
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] focus:border-[#0D9488] outline-none"
                  />
                </div>
              </div>

              {/* Salary & Dynamic Wage Calculation */}
              <div className="flex flex-col gap-2.5 bg-[#F8FAF8] p-4 rounded-xl border border-[#D1E7DD]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#1E293B]">الراتب الأساسي الشهري:</label>
                  <span className="text-[11px] font-black text-[#0D9488]">بالجنيه المصري (ج.م)</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="50"
                    placeholder="6000"
                    value={baseSalary || ''}
                    onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 pl-14 rounded-xl border border-[#A3CFBB] bg-white text-sm font-black text-[#1E293B] font-readex outline-none focus:ring-2 focus:ring-[#0D9488]/30"
                    required
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#78716C]">ج.م / شهر</span>
                </div>

                {/* Calculation breakdown */}
                <div className="bg-white p-2.5 rounded-lg border border-[#D1E7DD] grid grid-cols-3 gap-2 text-center mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#78716C] font-semibold">اليوم (30 يوم)</span>
                    <span className="text-xs font-black text-[#1E293B] font-readex">
                      {formRates.dailyRate} <span className="text-[9px]">ج.م</span>
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[#EBE3D8]">
                    <span className="text-[9px] text-[#78716C] font-semibold">الساعة (240 ساعة)</span>
                    <span className="text-xs font-black text-[#0D9488] font-readex">
                      {formRates.hourlyRate} <span className="text-[9px]">ج.م</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#78716C] font-semibold">الدقيقة (14400 دقيقة)</span>
                    <span className="text-xs font-black text-[#C2410C] font-readex">
                      {formRates.minuteRate} <span className="text-[9px]">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Monthly Regularity Base Bonus */}
                <div className="flex flex-col gap-1.5 bg-[#F0FDF4] p-3 rounded-xl border border-[#BBF7D0]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#166534] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">military_tech</span>
                      مكافأة وبونص الانتظام الشهري الأساسية (تُصرف يوم 20):
                    </label>
                    <span className="text-[10px] font-bold text-[#15803D]">تخضع لقواعد التأخير</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="500"
                      value={formRegularityBonus}
                      onChange={(e) => setFormRegularityBonus(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 pl-12 rounded-lg border border-[#86EFAC] bg-white text-xs font-black text-[#166534] font-readex outline-none"
                    />
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#166534]">ج.م</span>
                  </div>
                  <p className="text-[10px] text-[#15803D]">
                    * أول تأخير (100%)، ثاني تأخير (50%)، ثالث تأخير إن كان دقيقة يُخصم 50 ج فقط؛ وإن زاد يُلغى.
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">حالة الموظف:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-white text-xs font-bold text-[#1E293B] outline-none"
                >
                  <option value="active">على رأس العمل (نشط)</option>
                  <option value="leave">في إجازة رسمية</option>
                  <option value="inactive">موقوف مؤقتاً</option>
                </select>
              </div>

              {/* General Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">ملاحظات عامة حول الموظف / الملف:</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول الخبرة، شهادات القياس، أو التوصيات الخاصة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none focus:border-[#0D9488] resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  {editingWorker ? 'حفظ وتحديث بيانات الموظف' : 'تسجيل وحفظ الموظف الجديد'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UNIFIED ACTION MODAL (بونص / خصم / ملاحظة إدارية) */}
      {/* ========================================================================= */}
      {actionModalWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-lg w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  actionType === 'bonus'
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : actionType === 'penalty'
                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                    : 'bg-[#E0F2FE] text-[#0369A1]'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {actionType === 'bonus' ? 'workspace_premium' : actionType === 'penalty' ? 'balance' : 'edit_note'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-[#1E293B]">
                    الإجراءات الإدارية والمالية للموظف
                  </h3>
                  <p className="text-xs text-[#78716C] font-bold">
                    {actionModalWorker.name} - {actionModalWorker.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActionModalWorker(null)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] hover:text-[#1E293B] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Segmented Type Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-[#FAF9F5] rounded-xl border border-[#EBE3D8]">
              <button
                type="button"
                onClick={() => {
                  setActionType('note');
                  setActionNoteText(actionModalWorker.notes || '');
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  actionType === 'note'
                    ? 'bg-white text-[#1E293B] shadow-xs border border-[#D6CEBF]'
                    : 'text-[#78716C] hover:text-[#1E293B]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">description</span>
                ملاحظة فقط
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType('bonus');
                  setActionAmount(actionModalWorker.manualBonus || 0);
                  setActionReason(actionModalWorker.bonusNotes || '');
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  actionType === 'bonus'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-[#166534] hover:bg-[#DCFCE7]/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">workspace_premium</span>
                بونص ومكافأة
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType('penalty');
                  setActionAmount(actionModalWorker.manualDiscount || 0);
                  setActionReason(actionModalWorker.discountNotes || '');
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  actionType === 'penalty'
                    ? 'bg-[#991B1B] text-white shadow-xs'
                    : 'text-[#991B1B] hover:bg-[#FEE2E2]/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">balance</span>
                خصم وجزاء
              </button>
            </div>

            {/* Action Content Form */}
            <form onSubmit={handleSaveAction} className="flex flex-col gap-4">
              
              {/* Option A: Administrative Note Only */}
              {actionType === 'note' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[#1E293B]">ملاحظة إدارية وتقييم سلوكي / فني:</label>
                  <textarea
                    rows={4}
                    placeholder="اكتب الملاحظة الإدارية الخاصة بالموظف (مثال: أداء متميز في تشغيل الماكينة، تنبيه شفوي، الالتزام بالوردية...)"
                    value={actionNoteText}
                    onChange={(e) => setActionNoteText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none focus:border-[#0D9488] focus:bg-white resize-none"
                    required
                  />
                  <p className="text-[10px] text-[#78716C]">
                    * يتم حفظ هذه الملاحظة في ملف الموظف لتظهر في سجله الإداري دون المساس المالي براتبه.
                  </p>
                </div>
              )}

              {/* Option B: Bonus / Incentive */}
              {actionType === 'bonus' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#166534]">قيمة المكافأة / البونص (ج.م):</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="500"
                        value={actionAmount || ''}
                        onChange={(e) => setActionAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 pl-12 rounded-xl border border-[#86EFAC] bg-white text-sm font-black text-[#166534] font-readex outline-none focus:ring-2 focus:ring-[#166534]/20"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-[#166534]">ج.م</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1E293B]">تاريخ احتساب البونص:</label>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1E293B]">سبب وملاحظة البونص:</label>
                    <textarea
                      rows={3}
                      placeholder="سبب المكافأة (مثال: تحقيق تارجت الإنتاج الأسبوعي، تميز فني، ساعات إضافية طارئة...)"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none focus:border-[#166534] resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Option C: Penalty / Deduction */}
              {actionType === 'penalty' && (
                <div className="flex flex-col gap-3.5">
                  
                  {/* Calculation Mode Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-[#FAF9F5] rounded-xl border border-[#EBE3D8]">
                    <button
                      type="button"
                      onClick={() => setPenaltyMode('fixed')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        penaltyMode === 'fixed'
                          ? 'bg-white text-[#991B1B] shadow-xs border border-rose-200'
                          : 'text-[#78716C] hover:text-[#1E293B]'
                      }`}
                    >
                      مبلغ مقطوع (ج.م)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPenaltyMode('days');
                        handleSetPenaltyDays(1);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        penaltyMode === 'days'
                          ? 'bg-white text-[#991B1B] shadow-xs border border-rose-200'
                          : 'text-[#78716C] hover:text-[#1E293B]'
                      }`}
                    >
                      خصم أيام عمل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPenaltyMode('minutes');
                        handleSetPenaltyMinutes(30);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        penaltyMode === 'minutes'
                          ? 'bg-white text-[#991B1B] shadow-xs border border-rose-200'
                          : 'text-[#78716C] hover:text-[#1E293B]'
                      }`}
                    >
                      خصم دقائق تأخير
                    </button>
                  </div>

                  {/* Mode-specific Quick Buttons */}
                  {penaltyMode === 'days' && (
                    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
                      <span className="text-[11px] font-bold text-rose-950">اختر عدد أيام الخصم (اليومية: {((Number(actionModalWorker.baseSalary) || 0) / 30).toFixed(1)} ج.م):</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: 'ربع يوم (0.25)', val: 0.25 },
                          { label: 'نصف يوم (0.5)', val: 0.5 },
                          { label: 'يوم كامل (1.0)', val: 1 },
                          { label: 'يومين (2.0)', val: 2 },
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => handleSetPenaltyDays(item.val)}
                            className={`py-1.5 px-1 rounded-lg text-xs font-black transition-all ${
                              penaltyDays === item.val
                                ? 'bg-[#991B1B] text-white shadow-xs'
                                : 'bg-white text-[#991B1B] border border-rose-200 hover:bg-rose-100/60'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {penaltyMode === 'minutes' && (
                    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="text-[11px] font-bold text-amber-950">اختر دقائق التأخير (أجر الدقيقة: {((Number(actionModalWorker.baseSalary) || 0) / 14400).toFixed(3)} ج.م):</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: '15 دقيقة', val: 15 },
                          { label: '30 دقيقة', val: 30 },
                          { label: '45 دقيقة', val: 45 },
                          { label: '60 دقيقة', val: 60 },
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => handleSetPenaltyMinutes(item.val)}
                            className={`py-1.5 px-1 rounded-lg text-xs font-black transition-all ${
                              penaltyMinutes === item.val
                                ? 'bg-[#D97706] text-white shadow-xs'
                                : 'bg-white text-[#D97706] border border-amber-200 hover:bg-amber-100/60'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Penalty Amount Field */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#991B1B]">قيمة الخصم والجزاء النهائي (ج.م):</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="100"
                        value={actionAmount || ''}
                        onChange={(e) => setActionAmount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 pl-12 rounded-xl border border-[#FCA5A5] bg-white text-sm font-black text-[#991B1B] font-readex outline-none focus:ring-2 focus:ring-[#991B1B]/20"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-[#991B1B]">ج.م</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#78716C] pt-0.5">
                      <span>اليومية: {((Number(actionModalWorker.baseSalary) || 0) / 30).toFixed(1)} ج.م</span>
                      <span>الدقيقة: {((Number(actionModalWorker.baseSalary) || 0) / 14400).toFixed(3)} ج.م</span>
                    </div>
                  </div>

                  {/* Regularity Logic Harmonization Alert */}
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-right flex flex-col gap-2 text-xs text-amber-950 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-black text-amber-900">
                      <span className="material-symbols-outlined text-base text-amber-600">sync_saved_locally</span>
                      <span>الربط التلقائي بقواعد الانتظام والرواتب (نفس اللوجيك):</span>
                    </div>
                    <div className="space-y-1.5 text-[11px] leading-relaxed text-amber-900">
                      <p className="flex items-start gap-1">
                        <span className="font-black text-rose-700">⚡ بونص الأسبوع (100 ج):</span>
                        <span>تسجيل هذا الخصم يستبعد الموظف فوراً من المنافسة على بونص الأسبوع الحالي لأن شرط الاستحقاق صفر جزاءات وصفر تأخير.</span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span className="font-black text-emerald-800">🛡️ بونص الشهر ({actionModalWorker.monthlyRegularityBonus ?? 500} ج):</span>
                        <span>الجزاءات الإدارية لا تسقط بونص الانتظام الشهري (الذي تحكمه دقائق تأخير البصمة فقط)، وسيتم خصم هذا المبلغ من صافي الراتب المستحق في جدول الرواتب تلقائياً.</span>
                      </p>
                    </div>
                  </div>

                  {/* Date Field */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1E293B]">تاريخ وقوع الخصم والجزاء:</label>
                    <input
                      type="date"
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                      required
                    />
                  </div>

                  {/* Reason Field */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1E293B]">سبب وملاحظة الخصم:</label>
                    <textarea
                      rows={2}
                      placeholder="سبب الخصم (مثال: خصم تأخير وردية، غياب بدون إذن، مخالفة تعليمات السلامة...)"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none focus:border-[#991B1B] resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    actionType === 'bonus'
                      ? 'bg-[#166534] hover:bg-[#14532D]'
                      : actionType === 'penalty'
                      ? 'bg-[#991B1B] hover:bg-[#7F1D1D]'
                      : 'bg-[#0D9488] hover:bg-[#0A7368]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check</span>
                  حفظ الإجراء في ملف الموظف
                </button>
                <button
                  type="button"
                  onClick={() => setActionModalWorker(null)}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SAFE DEACTIVATE / ARCHIVE / DELETE MODAL */}
      {/* ========================================================================= */}
      {deactivateModalWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-md w-full p-6 text-right flex flex-col gap-4 animate-in fade-in zoom-in-95">
            
            <div className="w-12 h-12 rounded-2xl bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">shield_person</span>
            </div>

            <div className="text-center flex flex-col gap-1">
              <h3 className="text-base font-black text-[#1E293B]">
                إيقاف / أرشفة حساب الموظف
              </h3>
              <p className="text-xs font-bold text-[#78716C]">
                {deactivateModalWorker.name} ({deactivateModalWorker.role})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] leading-relaxed">
              <span className="font-bold block mb-1">🛡️ حماية الترابط المالي والتاريخي:</span>
              نظراً لأن الموظف قد يكون مرتبطاً بسجلات بصمة حضور سابقة، مسير رواتب، أو فواتير إنتاج، فإن الخيار الآمن هو <strong>إلغاء التفعيل والأرشفة</strong> لإيقافه عن العمليات الحالية دون فقدان السجلات المحاسبية.
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeactivateWorker(deactivateModalWorker.id)}
                className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-[#D97706] hover:bg-[#B45309] shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">archive</span>
                إلغاء التفعيل والأرشفة الآمنة (موصى به)
              </button>

              <button
                type="button"
                onClick={() => handlePermanentDelete(deactivateModalWorker.id)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete_forever</span>
                حذف نهائي ومسح السجل بالكامل
              </button>

              <button
                type="button"
                onClick={() => setDeactivateModalWorker(null)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
              >
                تراجع وإلغاء
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
