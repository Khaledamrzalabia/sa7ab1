import React, { useState } from 'react';
import { Partner, PartnerPayout } from '../types';
import { calculatePartnerShares } from '../data';

interface PartnershipManagementProps {
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  payouts: PartnerPayout[];
  setPayouts: React.Dispatch<React.SetStateAction<PartnerPayout[]>>;
}

export default function PartnershipManagement({
  partners,
  setPartners,
  payouts,
  setPayouts,
}: PartnershipManagementProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'partners' | 'profit_calculator' | 'payouts'>('partners');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'silent' | 'exited'>('all');

  // Modals State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState<boolean>(false);
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  
  // Partner Statement Modal
  const [statementPartner, setStatementPartner] = useState<Partner | null>(null);

  // Single Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [selectedPartnerForPayout, setSelectedPartnerForPayout] = useState<Partner | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutPeriod, setPayoutPeriod] = useState<string>('أرباح الربع الحالي 2026');
  const [payoutMethod, setPayoutMethod] = useState<string>('تحويل بنكي فوري');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Partner Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formNationalId, setFormNationalId] = useState<string>('');
  const [formRoleTitle, setFormRoleTitle] = useState<string>('شريك ممول ومستثمر');
  const [formCapital, setFormCapital] = useState<number>(0);
  const [formJoinDate, setFormJoinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<Partner['status']>('active');
  const [formNotes, setFormNotes] = useState<string>('');

  // Profit Distribution Simulation Engine
  const [profitPool, setProfitPool] = useState<number>(0); // 0 EGP initially
  const [simPeriod, setSimPeriod] = useState<string>('صافي أرباح تشغيل الربع الحالي');

  // Total Capital & Summary Statistics
  const totalCapital = partners.reduce((sum, p) => sum + (p.capital || 0), 0);
  const totalPayoutsAll = payouts.reduce((sum, p) => sum + p.amount, 0);
  const activePartnersCount = partners.filter(p => p.status === 'active').length;
  const silentPartnersCount = partners.filter(p => p.status === 'silent').length;

  // Open Partner Modal for Add
  const handleOpenAddPartner = () => {
    setEditingPartnerId(null);
    setFormName('');
    setFormPhone('');
    setFormNationalId('');
    setFormRoleTitle('شريك ممول ومستثمر');
    setFormCapital(0);
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setFormStatus('active');
    setFormNotes('');
    setIsPartnerModalOpen(true);
  };

  // Open Partner Modal for Edit
  const handleOpenEditPartner = (partner: Partner) => {
    setEditingPartnerId(partner.id);
    setFormName(partner.name);
    setFormPhone(partner.phone);
    setFormNationalId(partner.nationalId || '');
    setFormRoleTitle(partner.roleTitle || 'شريك ممول ومستثمر');
    setFormCapital(partner.capital);
    setFormJoinDate(partner.joinDate);
    setFormStatus(partner.status);
    setFormNotes(partner.notes || '');
    setIsPartnerModalOpen(true);
  };

  // Submit Partner Form (Add or Edit)
  const handleSubmitPartnerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formCapital <= 0) {
      alert('يرجى إدخال اسم الشريك ومبلغ رأس مال صحيح.');
      return;
    }

    if (editingPartnerId) {
      // Edit
      const updated = partners.map(p => {
        if (p.id === editingPartnerId) {
          return {
            ...p,
            name: formName.trim(),
            phone: formPhone.trim(),
            nationalId: formNationalId.trim(),
            roleTitle: formRoleTitle.trim(),
            capital: formCapital,
            joinDate: formJoinDate,
            status: formStatus,
            notes: formNotes.trim()
          };
        }
        return p;
      });
      setPartners(calculatePartnerShares(updated));
    } else {
      // Add New
      const newPartner: Omit<Partner, 'sharePercentage'> = {
        id: `PRT-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        phone: formPhone.trim(),
        nationalId: formNationalId.trim(),
        roleTitle: formRoleTitle.trim(),
        capital: formCapital,
        joinDate: formJoinDate,
        totalProfitsWithdrawn: 0,
        status: formStatus,
        notes: formNotes.trim()
      };
      setPartners(calculatePartnerShares([...partners, newPartner as any]));
    }

    setIsPartnerModalOpen(false);
  };

  // Delete Partner
  const handleDeletePartner = (partnerId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الشريك؟ سيتم إعادة توزيع نسب رأس المال تلقائياً على باقي الشركاء.')) {
      const remaining = partners.filter(p => p.id !== partnerId);
      setPartners(calculatePartnerShares(remaining));
      if (statementPartner?.id === partnerId) {
        setStatementPartner(null);
      }
    }
  };

  // Open Single Payout Modal
  const handleOpenPayoutModal = (partner: Partner) => {
    const recommendedShare = totalCapital > 0 ? (partner.capital / totalCapital) * profitPool : 0;
    setSelectedPartnerForPayout(partner);
    setPayoutAmount(Math.round(recommendedShare));
    setPayoutPeriod(simPeriod);
    setPayoutMethod('تحويل بنكي فوري');
    setPayoutNotes(`صرف نصيب الأرباح المحتسبة عن ${simPeriod}`);
    setIsPayoutModalOpen(true);
  };

  // Save Single Payout
  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerForPayout || payoutAmount <= 0) return;

    const newPayout: PartnerPayout = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      partnerId: selectedPartnerForPayout.id,
      partnerName: selectedPartnerForPayout.name,
      date: new Date().toISOString().split('T')[0],
      amount: payoutAmount,
      period: payoutPeriod,
      paymentMethod: payoutMethod,
      notes: payoutNotes
    };

    setPayouts([newPayout, ...payouts]);

    // Update partner's total withdrawn
    setPartners(prev => prev.map(p => {
      if (p.id === selectedPartnerForPayout.id) {
        return {
          ...p,
          totalProfitsWithdrawn: (p.totalProfitsWithdrawn || 0) + payoutAmount
        };
      }
      return p;
    }));

    setIsPayoutModalOpen(false);
  };

  // Batch Distribute All Profits
  const handleDistributeAll = () => {
    if (profitPool <= 0) {
      alert('يرجى تحديد مبلغ أرباح صالح للتوزيع.');
      return;
    }

    if (window.confirm(`هل أنت متأكد من اعتماد وصرف توزيع أرباح إجمالي بقيمة ${profitPool.toLocaleString()} ج.م على جميع الشركاء وفقاً لنسب حصصهم؟`)) {
      const newPayoutsList: PartnerPayout[] = [];
      const updatedPartners = partners.map(p => {
        const shareRatio = totalCapital > 0 ? p.capital / totalCapital : 0;
        const individualShare = Math.round(shareRatio * profitPool);

        if (individualShare > 0) {
          newPayoutsList.push({
            id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
            partnerId: p.id,
            partnerName: p.name,
            date: new Date().toISOString().split('T')[0],
            amount: individualShare,
            period: simPeriod,
            paymentMethod: 'تحويل بنكي معتمد',
            notes: `توزيع جماعي للأرباح بنسبة ${p.sharePercentage}% من إجمالي ${profitPool.toLocaleString()} ج.م`
          });
        }

        return {
          ...p,
          totalProfitsWithdrawn: (p.totalProfitsWithdrawn || 0) + individualShare
        };
      });

      setPayouts([...newPayoutsList, ...payouts]);
      setPartners(updatedPartners);
      alert('تم تسجيل وصرف توزيعات الأرباح للجميع بنجاح وتحديث الكشوفات!');
    }
  };

  // Filter partners
  const filteredPartners = partners.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.roleTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="screen-partnership-management" className="flex flex-col gap-6 pb-12 w-full text-right">
      
      {/* Header Banner & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-3xl">handshake</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
              إدارة الشراكة، رأس المال وتوزيع الأرباح
            </h1>
            <p className="text-xs text-[#78716C] font-semibold">
              سجل الشركاء والمستثمرين، احتساب نسب المساهمة في رأس المال، وحاسبة توزيع الأرباح الذكية بالجنيه المصري (ج.م)
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-[#FAF9F5] p-1.5 rounded-xl border border-[#EBE3D8]">
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'partners'
                  ? 'bg-white text-[#0D9488] shadow-xs border border-[#EBE3D8]'
                  : 'text-[#57534E] hover:text-[#1E293B]'
              }`}
            >
              <span className="material-symbols-outlined text-base">group</span>
              سجل الشركاء ({partners.length})
            </button>
            <button
              onClick={() => setActiveTab('profit_calculator')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'profit_calculator'
                  ? 'bg-white text-[#0D9488] shadow-xs border border-[#EBE3D8]'
                  : 'text-[#57534E] hover:text-[#1E293B]'
              }`}
            >
              <span className="material-symbols-outlined text-base">calculate</span>
              حاسبة الأرباح
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'payouts'
                  ? 'bg-white text-[#0D9488] shadow-xs border border-[#EBE3D8]'
                  : 'text-[#57534E] hover:text-[#1E293B]'
              }`}
            >
              <span className="material-symbols-outlined text-base">payments</span>
              سجل المسحوبات ({payouts.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPartner}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            إضافة شريك جديد
          </button>
        </div>
      </div>

      {/* KPI Overview Cards across full screen */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Capital */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي رأس مال الشركة المكتتب</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006C4A] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">account_balance</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#1E293B] font-readex">{totalCapital.toLocaleString()}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[11px] text-[#006C4A] font-bold mt-1">
              مقسم بين {partners.length} شريك ومستثمر
            </p>
          </div>
        </div>

        {/* Active vs Silent Partners */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">هيكل الشركاء</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pie_chart</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#1E293B] font-readex">{activePartnersCount}</span>
              <span className="text-xs font-bold text-[#78716C]">نشط</span>
              <span className="text-xs text-[#78716C] mr-2">| {silentPartnersCount} موصي</span>
            </div>
            <p className="text-[11px] text-[#1D4ED8] font-bold mt-1">
              نسبة اكتمال الحصص: 100%
            </p>
          </div>
        </div>

        {/* Total Profits Distributed */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي الأرباح المصروفة</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#B45309] font-readex">{totalPayoutsAll.toLocaleString()}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[11px] text-[#B45309] font-bold mt-1">
              إجمالي {payouts.length} دفعات صرف معتمدة
            </p>
          </div>
        </div>

        {/* Current Simulated Pool */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#334155] text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#94A3B8]">صافي الأرباح المستهدفة</span>
            <div className="w-9 h-9 rounded-xl bg-white/10 text-[#5EEAD4] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white font-readex">{profitPool.toLocaleString()}</span>
              <span className="text-xs font-medium text-[#94A3B8]">ج.م</span>
            </div>
            <p className="text-[11px] text-[#5EEAD4] font-semibold mt-1">
              قابلة للتوزيع الآلي الفوري
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PARTNERS DIRECTORY (FULL WIDTH) */}
      {/* ========================================================================= */}
      {activeTab === 'partners' && (
        <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-5 w-full">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-[#1E293B]">سجل الشركاء والمساهمين في رأس المال</h3>
              <p className="text-xs text-[#78716C] font-semibold">
                عرض تفصيلي لرأس مال كل شريك، نسبة ملكيته، وإجمالي الأرباح التي قام بسحبها
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <input
                  type="text"
                  placeholder="ابحث باسم الشريك أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] outline-none"
                />
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-lg text-[#78716C]">search</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">شريك نشط / تنفيذي</option>
                <option value="silent">شريك صامت (مستثمر ممول)</option>
                <option value="exited">شريك منسحب</option>
              </select>
            </div>
          </div>

          {/* Full Width Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                  <th className="py-3.5 px-4">الشريك / المستثمر</th>
                  <th className="py-3.5 px-3">صفة الشريك</th>
                  <th className="py-3.5 px-3 text-left">رأس المال المستثمر</th>
                  <th className="py-3.5 px-3 text-center">النسبة من رأس المال</th>
                  <th className="py-3.5 px-3 text-left">إجمالي الأرباح المستلمة</th>
                  <th className="py-3.5 px-3 text-center">تاريخ البدء</th>
                  <th className="py-3.5 px-3 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE8]">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm font-bold text-[#78716C]">
                      لا توجد بيانات مطابقة للبحث الحالي.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => {
                    const ratio = totalCapital > 0 ? (((Number(partner.capital) || 0) / totalCapital) * 100).toFixed(1) : '0';
                    return (
                      <tr key={partner.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-black text-[#1E293B] text-sm">{partner.name}</span>
                            <span className="text-[11px] text-[#78716C] font-semibold">{partner.phone} {partner.nationalId ? `| ق: ${partner.nationalId}` : ''}</span>
                          </div>
                        </td>

                        <td className="py-4 px-3 font-semibold text-[#57534E]">
                          {partner.roleTitle || 'شريك مساهم'}
                        </td>

                        <td className="py-4 px-3 text-left font-black text-sm text-[#1E293B] font-readex">
                          {partner.capital.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                            {partner.sharePercentage || ratio}%
                          </span>
                        </td>

                        <td className="py-4 px-3 text-left font-bold text-[#B45309] font-readex text-sm">
                          {(partner.totalProfitsWithdrawn || 0).toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                        </td>

                        <td className="py-4 px-3 text-center font-semibold text-[#78716C] font-mono">
                          {partner.joinDate || '2024-01-01'}
                        </td>

                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            partner.status === 'active'
                              ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                              : partner.status === 'silent'
                              ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]'
                              : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                          }`}>
                            {partner.status === 'active' ? 'شريك تنفيذي نشط' : partner.status === 'silent' ? 'مستثمر ممول (صامت)' : 'منسحب'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Payout Quick Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayoutModal(partner)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] text-xs font-bold transition-all flex items-center gap-1"
                              title="صرف أرباح لهذا الشريك"
                            >
                              <span className="material-symbols-outlined text-xs">payments</span>
                              صرف
                            </button>

                            {/* View Statement */}
                            <button
                              type="button"
                              onClick={() => setStatementPartner(partner)}
                              className="p-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] transition-all"
                              title="عرض كشف حساب الشريك"
                            >
                              <span className="material-symbols-outlined text-sm">receipt_long</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditPartner(partner)}
                              className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5EFE8] text-[#57534E] border border-[#D6CEBF] transition-all"
                              title="تعديل البيانات"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeletePartner(partner.id)}
                              className="p-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] transition-all"
                              title="حذف الشريك"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SMART PROFIT DISTRIBUTION CALCULATOR (FULL WIDTH) */}
      {/* ========================================================================= */}
      {activeTab === 'profit_calculator' && (
        <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-6 w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
            <div>
              <h3 className="text-base font-black text-[#166534] flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">calculate</span>
                محرك التوزيع الذكي للأرباح بناءً على حصص رأس المال
              </h3>
              <p className="text-xs text-[#78716C] font-semibold mt-0.5">
                أدخل صافي ربح المصنع للفترة ليقوم النظام بحساب وتجهيز مستحقات كل شريك بدقة فورية
              </p>
            </div>

            <button
              type="button"
              onClick={handleDistributeAll}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#166534] hover:bg-[#14532D] transition-all shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">done_all</span>
              صرف واعتماد التوزيع الجماعي لجميع الشركاء
            </button>
          </div>

          {/* Calculator Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#166534]">مبلغ صافي الربح المطلوب توزيعه (ج.م):</label>
              <input
                type="number"
                min="0"
                step="10000"
                value={profitPool || ''}
                onChange={(e) => setProfitPool(parseFloat(e.target.value) || 0)}
                className="w-full p-3 rounded-xl border border-[#86EFAC] bg-white text-base font-black text-[#1E293B] font-readex outline-none focus:ring-2 focus:ring-[#166534]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#166534]">الفترة المالية والبيان:</label>
              <input
                type="text"
                value={simPeriod}
                onChange={(e) => setSimPeriod(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#86EFAC] bg-white text-xs font-bold text-[#1E293B] outline-none"
              />
            </div>

            <div className="flex flex-col justify-center bg-white p-4 rounded-xl border border-[#86EFAC]">
              <span className="text-[11px] text-[#78716C] font-bold">إجمالي رأس المال المحتسب:</span>
              <span className="text-lg font-black text-[#1E293B] font-readex">{totalCapital.toLocaleString()} ج.م</span>
              <span className="text-[10px] text-[#166534] font-semibold mt-0.5">يتم توزيع الأرباح بنسبة 100% تلقائياً</span>
            </div>
          </div>

          {/* Live Partner Allocation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => {
              const shareRatio = totalCapital > 0 ? partner.capital / totalCapital : 0;
              const currentProfitShare = Math.round(shareRatio * profitPool);

              return (
                <div
                  key={partner.id}
                  className="p-5 rounded-2xl bg-white border border-[#EBE3D8] hover:border-[#10B981] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-sm text-[#1E293B]">{partner.name}</h4>
                      <p className="text-xs text-[#78716C] font-semibold">{partner.roleTitle || 'شريك مساهم'}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                      {partner.sharePercentage}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#FAF9F5] border border-[#F5EFE8]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#78716C] font-bold">رأس المال:</span>
                      <span className="font-bold text-[#1E293B] font-readex">{partner.capital.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#EBE3D8]">
                      <span className="text-[#166534] font-black">النصيب المستحق من الربح:</span>
                      <span className="font-black text-base text-[#0D9488] font-readex">
                        {currentProfitShare.toLocaleString()} <span className="text-xs">ج.م</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPayoutModal(partner)}
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    صرف هذا النصيب للشريك
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYOUTS & WITHDRAWALS LEDGER (FULL WIDTH) */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-5 w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
            <div>
              <h3 className="text-base font-black text-[#1E293B]">سجل مسحوبات وتوزيعات أرباح الشركاء</h3>
              <p className="text-xs text-[#78716C] font-semibold">
                كشف كامل بالتحويلات النقدية والبنكية المصروفة لكل شريك مع التواريخ والبيانات المعتمدة
              </p>
            </div>

            <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#EBE3D8] text-xs font-black text-[#B45309]">
              إجمالي التوزيعات المسجلة: {totalPayoutsAll.toLocaleString()} ج.م
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                  <th className="py-3.5 px-4">الشريك المستلم</th>
                  <th className="py-3.5 px-3">الفترة المالية / البيان</th>
                  <th className="py-3.5 px-3 text-left">مبلغ التوزيع المنصرف</th>
                  <th className="py-3.5 px-3 text-center">طريقة الصرف</th>
                  <th className="py-3.5 px-3 text-center">تاريخ التحويل</th>
                  <th className="py-3.5 px-4">ملاحظات واعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE8]">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm font-bold text-[#78716C]">
                      لا توجد سجلات توزيعات مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                      <td className="py-4 px-4 font-black text-[#1E293B] text-sm">
                        {payout.partnerName}
                      </td>

                      <td className="py-4 px-3 font-semibold text-[#57534E]">
                        {payout.period}
                      </td>

                      <td className="py-4 px-3 text-left font-black text-[#166534] font-readex text-sm">
                        +{payout.amount.toLocaleString()} <span className="text-[10px]">ج.م</span>
                      </td>

                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                          {payout.paymentMethod}
                        </span>
                      </td>

                      <td className="py-4 px-3 text-center font-mono font-semibold text-[#78716C]">
                        {payout.date}
                      </td>

                      <td className="py-4 px-4 text-xs text-[#78716C] font-semibold">
                        {payout.notes || 'تحويل أرباح معتمد'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PARTNER */}
      {/* ========================================================================= */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-lg w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">
                    {editingPartnerId ? 'edit_note' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">
                    {editingPartnerId ? 'تعديل بيانات الشريك وحصته' : 'إضافة شريك / مستثمر جديد'}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    تسجيل رأس المال بالجنيه المصري (ج.م) لاحتساب النسبة فورياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPartnerModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitPartnerForm} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">اسم الشريك / المستثمر:</label>
                <input
                  type="text"
                  placeholder="م. حسام الدين عبد الرحيم"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">رقم الهاتف:</label>
                  <input
                    type="text"
                    placeholder="010XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">الرقم القومي (اختياري):</label>
                  <input
                    type="text"
                    placeholder="290XXXXXXXXXXX"
                    value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">صفة ودور الشريك:</label>
                  <input
                    type="text"
                    placeholder="شريك مؤسس، مستثمر ممول..."
                    value={formRoleTitle}
                    onChange={(e) => setFormRoleTitle(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">حالة الشراكة:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="active">شريك نشط / تنفيذي</option>
                    <option value="silent">شريك صامت (مستثمر ممول)</option>
                    <option value="exited">شريك منسحب</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">رأس المال المستثمر (ج.م):</label>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    value={formCapital}
                    onChange={(e) => setFormCapital(parseFloat(e.target.value) || 0)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-sm font-black text-[#1E293B] font-readex outline-none focus:border-[#0D9488]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">تاريخ بدء الشراكة:</label>
                  <input
                    type="date"
                    value={formJoinDate}
                    onChange={(e) => setFormJoinDate(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">ملاحظات أو شروط تعاقدية:</label>
                <textarea
                  rows={2}
                  placeholder="أي تفاصيل خاصة بتوزيع الأرباح، شروط التخارج..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none focus:border-[#0D9488] resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  {editingPartnerId ? 'حفظ التعديلات' : 'إضافة الشريك واحتساب الحصة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
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
      {/* MODAL 2: SINGLE PAYOUT FORM */}
      {/* ========================================================================= */}
      {isPayoutModalOpen && selectedPartnerForPayout && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-lg w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">
                    صرف أرباح للشريك: {selectedPartnerForPayout.name}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    حصة الملكية: {selectedPartnerForPayout.sharePercentage}% | رأس المال: {selectedPartnerForPayout.capital.toLocaleString()} ج.م
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePayout} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">مبلغ الصرف / التوزيع (ج.م):</label>
                <input
                  type="number"
                  min="100"
                  value={payoutAmount || ''}
                  onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                  className="p-3 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] text-base font-black text-[#166534] font-readex outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">الفترة المالية:</label>
                  <input
                    type="text"
                    value={payoutPeriod}
                    onChange={(e) => setPayoutPeriod(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">طريقة التحويل / الدفع:</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="تحويل بنكي فوري">تحويل بنكي فوري</option>
                    <option value="شيك بنكي معتمد">شيك بنكي معتمد</option>
                    <option value="نقداً من الخزينة">نقداً من الخزينة</option>
                    <option value="إنستاباي InstaPay">إنستاباي InstaPay</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">البيان وملاحظات الاعتماد:</label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#166534] hover:bg-[#14532D] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  اعتماد وصرف المبلغ فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
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
      {/* MODAL 3: PARTNER ACCOUNT STATEMENT / KASHF HISAB */}
      {/* ========================================================================= */}
      {statementPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-2xl w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1E293B]">كشف حساب الشريك: {statementPartner.name}</h3>
                  <p className="text-xs text-[#78716C] font-semibold">{statementPartner.roleTitle} | تاريخ الانضمام: {statementPartner.joinDate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatementPartner(null)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF9F5] border border-[#EBE3D8]">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#78716C] font-bold">رأس المال المودع</span>
                <span className="text-base font-black text-[#1E293B] font-readex mt-1">{statementPartner.capital.toLocaleString()} ج.م</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#78716C] font-bold">نسبة الحصة في الشركة</span>
                <span className="text-base font-black text-[#0D9488] font-readex mt-1">{statementPartner.sharePercentage}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#78716C] font-bold">إجمالي الأرباح المسحوبة</span>
                <span className="text-base font-black text-[#B45309] font-readex mt-1">{(statementPartner.totalProfitsWithdrawn || 0).toLocaleString()} ج.م</span>
              </div>
            </div>

            {/* Partner's Payouts History */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black text-[#1E293B]">سجل الدفعات والمسحوبات الخاصة بهذا الشريك:</h4>
              <div className="max-h-60 overflow-y-auto border border-[#F5EFE8] rounded-xl">
                {payouts.filter(p => p.partnerId === statementPartner.id).length === 0 ? (
                  <p className="p-6 text-center text-xs text-[#78716C] font-semibold">لم يتم تسجيل أي مسحوبات سابقة لهذا الشريك.</p>
                ) : (
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF9F5] text-[#57534E] font-bold border-b border-[#F5EFE8]">
                      <tr>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">الفترة والبيان</th>
                        <th className="p-2.5">طريقة الدفع</th>
                        <th className="p-2.5 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5EFE8]">
                      {payouts.filter(p => p.partnerId === statementPartner.id).map(p => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono text-[#78716C]">{p.date}</td>
                          <td className="p-2.5 font-semibold text-[#1E293B]">{p.period}</td>
                          <td className="p-2.5 text-[#1D4ED8] font-semibold">{p.paymentMethod}</td>
                          <td className="p-2.5 text-left font-black text-[#166534] font-readex">{p.amount.toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#F5EFE8]">
              <button
                type="button"
                onClick={() => {
                  setStatementPartner(null);
                  handleOpenPayoutModal(statementPartner);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0A7368] text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                صرف أرباح جديدة
              </button>
              <button
                type="button"
                onClick={() => setStatementPartner(null)}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
