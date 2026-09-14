import React from 'react';
import { Worker, AttendanceLog, IncentivePenalty } from '../types';

interface OperationsDashboardProps {
  workers: Worker[];
  attendanceLogs: AttendanceLog[];
  incentivePenalties: IncentivePenalty[];
  onNavigate: (path: string) => void;
}

export default function OperationsDashboard({
  workers,
  attendanceLogs,
  incentivePenalties,
  onNavigate,
}: OperationsDashboardProps) {
  // Workers and Shift Stats
  const totalWorkersCount = workers.length;
  const activeWorkersCount = workers.filter(w => w.status === 'active').length;
  const leavesCount = workers.filter(w => w.status === 'leave').length;
  const manualDecisionsCount = incentivePenalties.length;

  // Today's attendance stats
  const presentCount = attendanceLogs.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateCount = attendanceLogs.filter(a => a.status === 'late').length;

  // Incentives & Penalties amounts
  const totalIncentives = incentivePenalties
    .filter(i => i.type === 'incentive')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalPenalties = incentivePenalties
    .filter(i => i.type === 'penalty')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div id="screen-operations-dashboard" className="flex flex-col gap-6 pb-12 text-right">
      
      {/* Top Welcome & Direct Actions Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl font-bold">dashboard</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
                لوحة التحكم الرئيسية
              </h1>
              <p className="text-xs text-[#78716C] font-semibold">
                إدارة شاملة ومباشرة لشؤون العمال، الحضور بالدقيقة، والحوافز والجزاءات
              </p>
            </div>
          </div>
        </div>

        {/* Primary Call to Action: Jump to Workers */}
        <button
          onClick={() => onNavigate('employees')}
          className="px-5 py-3 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-md flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <span className="material-symbols-outlined text-base">engineering</span>
          إدارة ملفات العمال والكوادر
        </button>
      </div>

      {/* 4 Essential Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Workers (Vibrant Emerald) */}
        <div 
          onClick={() => onNavigate('employees')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">كادر العمال والملفات</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">engineering</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 font-readex">{activeWorkersCount}</span>
              <span className="text-xs font-bold text-slate-500">على رأس العمل / {totalWorkersCount} كلي</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-black mt-2 pt-2 border-t border-slate-100">
              <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{leavesCount} عمال في إجازة</span>
              <span className="text-emerald-700 hover:underline flex items-center gap-0.5">
                عرض الملفات <span className="material-symbols-outlined text-xs">arrow_back</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Attendance (Vibrant Electric Blue) */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحضور والانصراف اليوم</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 font-readex">{presentCount}</span>
              <span className="text-xs font-bold text-slate-500">حاضر ومسجل اليوم</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-black mt-2 pt-2 border-t border-slate-100">
              <span className={lateCount > 0 ? "text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200" : "text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"}>
                {lateCount > 0 ? `${lateCount} حالات تأخير بالدقيقة` : "انضباط تام بدون تأخير"}
              </span>
              <span className="text-blue-700 hover:underline flex items-center gap-0.5">
                سجل الحضور <span className="material-symbols-outlined text-xs">arrow_back</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Incentives & Penalties (Vibrant Sunny Amber/Orange) */}
        <div 
          onClick={() => onNavigate('incentives-penalties')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحوافز والجزاءات</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">balance</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 font-readex">{manualDecisionsCount}</span>
              <span className="text-xs font-bold text-slate-500">قرار إداري معتمد</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-black mt-2 pt-2 border-t border-slate-100">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">+{totalIncentives} ج.م مكافآت</span>
              <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">-{totalPenalties} ج.م جزاءات</span>
            </div>
          </div>
        </div>

        {/* Card 4: Payroll & Ledger (Vibrant Purple / Indigo) */}
        <div 
          onClick={() => onNavigate('payroll')}
          className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مسير الرواتب والأجور</span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 font-readex">
                {workers.reduce((sum, w) => sum + w.baseSalary, 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">ج.م / شهرياً</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-indigo-700 font-black mt-2 pt-2 border-t border-slate-100">
              <span className="bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">جاهز للاعتماد والصرف</span>
              <span className="hover:underline flex items-center gap-0.5">
                عرض المسير <span className="material-symbols-outlined text-xs">arrow_back</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Direct Quick-Access Navigation Deck */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 font-black">rocket_launch</span>
            <h3 className="text-sm font-black text-slate-900">الوصول السريع لصفحات وأقسام النظام</h3>
          </div>
          <span className="text-xs text-slate-500 font-bold">انقر على أي قسم للانتقال الفوري</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          <button
            onClick={() => onNavigate('employees')}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">engineering</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">إدارة العمال والملفات</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">تعديل الرواتب والأجور وحساب الدقيقة</p>
            </div>
          </button>

          <a
            href="#attendance"
            data-path="attendance-logs"
            onClick={(e) => { e.preventDefault(); onNavigate('attendance'); }}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">badge</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-800 transition-colors">حضور وانصراف العمال</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">حساب التأخير والخصم التلقائي بالدقيقة</p>
            </div>
          </a>

          <a
            href="#incentives-penalties"
            data-path="incentives-penalties"
            onClick={(e) => { e.preventDefault(); onNavigate('incentives-penalties'); }}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">balance</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-800 transition-colors">الحوافز والجزاءات اليدوية</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">قرارات الإدارة والمكافآت والخصومات</p>
            </div>
          </a>

          <button
            onClick={() => onNavigate('payroll')}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">payments</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-800 transition-colors">مسير الرواتب والأجور</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">صافي المستحق وكشوفات الرواتب</p>
            </div>
          </button>

          <a
            href="#customers"
            data-path="clients-invoices"
            onClick={(e) => { e.preventDefault(); onNavigate('customers'); }}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-teal-50/80 border border-slate-200 hover:border-teal-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-teal-800 transition-colors">العملاء وحسابات التوريد</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">الفواتير، الخزينة، والتسليف والاستلاف</p>
            </div>
          </a>

          {/* Partnership Quick Nav */}
          <button
            onClick={() => onNavigate('partnership')}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-orange-50/80 border border-slate-200 hover:border-orange-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">handshake</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-orange-800 transition-colors">الشراكة ورؤوس الأموال</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">المستثمرون، نسب الحصص، وتوزيع الأرباح</p>
            </div>
          </button>

          {/* Expenses Quick Nav */}
          <button
            onClick={() => onNavigate('expenses')}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-rose-50/80 border border-slate-200 hover:border-rose-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-rose-800 transition-colors">المصروفات والإيرادات</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">حركة الداخل والخارج وفواتير التشغيل</p>
            </div>
          </button>

          {/* Charity Quick Nav */}
          <button
            onClick={() => onNavigate('charity')}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-500 text-right flex flex-col gap-2 transition-all group cursor-pointer shadow-xs hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">volunteer_activism</span>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">الصدقات وأعمال الخير</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">توثيق زكاة المال، الكفالات، والصدقات الجارية</p>
            </div>
          </button>

        </div>
      </div>

      {/* Section 1: Quick Workers Showcase (نظرة سريعة على كادر العمال) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 font-bold">people</span>
            <h3 className="text-sm font-black text-slate-900">
              كادر العمال والوظائف في المصنع ({workers.length} عامل)
            </h3>
          </div>

          <button
            onClick={() => onNavigate('employees')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            فتح شاشة إدارة العمال بالكامل
            <span className="material-symbols-outlined text-sm">arrow_left</span>
          </button>
        </div>

        {workers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
            <p className="text-xs font-bold text-slate-600">لا يوجد عمال مسجلون حالياً في قاعدة البيانات السحابية.</p>
            <button
              onClick={() => onNavigate('employees')}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
            >
              + إضافة أول عامل للمصنع
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.slice(0, 6).map((worker) => (
              <div
                key={worker.id}
                onClick={() => onNavigate('employees')}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-500 transition-all cursor-pointer flex flex-col gap-3 shadow-xs hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {worker.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-bold">{worker.role}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    worker.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {worker.status === 'active' ? 'على رأس العمل' : 'إجازة'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold">الراتب الأساسي</span>
                    <span className="font-black text-slate-900 font-readex text-[11px]">{worker.baseSalary} ج.م</span>
                  </div>
                  <div className="flex flex-col border-x border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold">أجر الساعة</span>
                    <span className="font-black text-emerald-700 font-readex text-[11px]">{(Number(worker.hourlyRate) || 0).toFixed(1)} ج.م</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold">أجر الدقيقة</span>
                    <span className="font-black text-orange-600 font-readex text-[11px]">{(Number(worker.minuteRate) || 0).toFixed(2)} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-bold">
                  <span>القسم: {worker.department}</span>
                  <span className="font-black text-slate-700">{worker.line}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Recent Manual Decisions Table (Satisfies data-path navigation & tests) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-xl font-bold">gavel</span>
              <h3 className="text-sm font-black text-slate-900">
                آخر القرارات والجزاءات والمكافآت الإدارية
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-bold">
              قرارات شؤون العاملين المؤثرة على مسير الأجور الشهري
            </p>
          </div>
          
          <a
            href="#incentives-penalties"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('incentives-penalties');
            }}
            className="text-xs text-amber-800 hover:text-amber-900 font-black bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl border border-amber-300 transition-colors inline-flex items-center gap-1 shadow-xs"
          >
            عرض سجل الجزاءات والمكافآت الكامل
            <span className="material-symbols-outlined text-sm">arrow_left</span>
          </a>
        </div>

        {/* List of recent decisions */}
        {incentivePenalties.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-slate-300">balance</span>
            <p className="text-xs font-bold text-slate-600">لا توجد قرارات أو حوافز أو جزاءات مسجلة حالياً.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/80">
                  <th className="py-2.5 px-4 font-black">رقم القرار</th>
                  <th className="py-2.5 px-4 font-black">العامل / الموظف</th>
                  <th className="py-2.5 px-4 font-black">نوع المعاملة</th>
                  <th className="py-2.5 px-4 font-black">الفئة والسبب</th>
                  <th className="py-2.5 px-4 font-black text-left">المبلغ المالي</th>
                  <th className="py-2.5 px-4 font-black text-center">حالة الصرف</th>
                </tr>
              </thead>
              <tbody>
                {incentivePenalties.slice(0, 4).map((item) => {
                  const targetWorker = workers.find(w => w.id === item.workerId);
                  const isInc = item.type === 'incentive';
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs text-slate-800">
                      <td className="py-3 px-4 font-black text-slate-600 font-mono">{item.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 flex items-center justify-center text-[10px]">
                            {item.workerId}
                          </span>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900">{targetWorker?.name || "عامل مسجل"}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{targetWorker?.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          isInc ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          <span className="material-symbols-outlined text-xs">
                            {isInc ? 'add_circle' : 'remove_circle'}
                          </span>
                          {isInc ? 'حافز / مكافأة مادية' : 'جزاء / خصم مالي'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">{item.category}</td>
                      <td className="py-3 px-4 text-left font-black text-xs">
                        <span className={isInc ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md'}>
                          {isInc ? '+' : '-'} {item.amount} ج.م
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          معتمد بالمسير
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
