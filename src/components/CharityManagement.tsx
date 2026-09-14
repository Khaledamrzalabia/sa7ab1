import React, { useState } from 'react';
import { CharityDonation } from '../types';

interface CharityManagementProps {
  charities: CharityDonation[];
  setCharities: React.Dispatch<React.SetStateAction<CharityDonation[]>>;
}

export default function CharityManagement({
  charities,
  setCharities,
}: CharityManagementProps) {
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');

  // Form states
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<CharityDonation['category']>('sadaqah');
  const [amountInput, setAmountInput] = useState<string>('');
  const [beneficiary, setBeneficiary] = useState<string>('');
  const [source, setSource] = useState<CharityDonation['source']>('company_percentage');
  const [paymentMethod, setPaymentMethod] = useState<CharityDonation['paymentMethod']>('bank_transfer');
  const [representative, setRepresentative] = useState<string>('م. حسام الدين عبد الرحيم');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Currency Formatter Helper (supports decimals like 0.5, 1000.5, etc.)
  const formatAmount = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number.isInteger(val)
      ? val.toLocaleString()
      : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculations
  const totalCharityAmount = charities.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const zakatTotal = charities.filter(c => c.category === 'zakat').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const ongoingTotal = charities.filter(c => c.category === 'ongoing_charity').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const foodAndMedicalTotal = charities
    .filter(c => c.category === 'food_aid' || c.category === 'medical_support')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // Filtered List
  const filteredCharities = charities.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBeneficiary = item.beneficiary.toLowerCase().includes(q);
      const matchRep = item.representative ? item.representative.toLowerCase().includes(q) : false;
      const matchId = item.id.toLowerCase().includes(q);
      return matchTitle || matchBeneficiary || matchRep || matchId;
    }
    return true;
  });

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditId('');
    setTitle('');
    setCategory('sadaqah');
    setAmountInput('');
    setBeneficiary('');
    setSource('company_percentage');
    setPaymentMethod('cash');
    setRepresentative('إدارة الخير والمتابعة');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEditClick = (item: CharityDonation) => {
    setIsEditing(true);
    setEditId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setAmountInput(String(item.amount));
    setBeneficiary(item.beneficiary);
    setSource(item.source);
    setPaymentMethod(item.paymentMethod);
    setRepresentative(item.representative || '');
    setDate(item.date);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا القيد من سجل الصدقات؟')) {
      setCharities(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح للصدقة (مثلاً: 0.5، 5، 15، 1000.5 ج.م).');
      return;
    }

    if (isEditing) {
      setCharities(prev => prev.map(item => {
        if (item.id === editId) {
          return {
            ...item,
            title,
            category,
            amount: parsedAmount,
            beneficiary,
            source,
            paymentMethod,
            representative,
            date,
            notes
          };
        }
        return item;
      }));
    } else {
      const newId = `SDQ-${String(charities.length + 1).padStart(2, '0')}`;
      const newCharity: CharityDonation = {
        id: newId,
        title,
        category,
        amount: parsedAmount,
        beneficiary,
        source,
        paymentMethod,
        representative,
        date,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        notes
      };
      setCharities([newCharity, ...charities]);
    }

    setIsModalOpen(false);
  };

  return (
    <div id="screen-charity-management" className="flex flex-col gap-6 pb-12 text-right">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006C4A] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
              سجل الصدقات وأعمال الخير
            </h1>
            <p className="text-xs text-[#78716C] font-semibold">
              توثيق مخصص للصدقات، زكاة المال، الدعم الإنساني، والمساهمات المجتمعية بالجنيه المصري (ج.م)
            </p>
          </div>
        </div>

        {/* Action Button: Add Donation */}
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-3 rounded-xl text-xs font-black text-white bg-[#006C4A] hover:bg-[#005238] transition-all shadow-md flex items-center justify-center gap-2 self-stretch md:self-auto"
        >
          <span className="material-symbols-outlined text-base">favorite</span>
          تسجيل بند صدقة / تبرع جديد
        </button>
      </div>

      {/* KPI Cards: Total Charity & Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Charity */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي الصدقات المنصرفة</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006C4A] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">volunteer_activism</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#006C4A] font-readex">{formatAmount(totalCharityAmount)}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#006C4A] font-bold mt-1">عبر {charities.length} مبادرات وحالات مسجلة</p>
          </div>
        </div>

        {/* Zakat Total */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">زكاة المال المؤداة</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#0D9488] font-readex">{formatAmount(zakatTotal)}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#0D9488] font-bold mt-1">مصارف الزكاة الشرعية الموثقة</p>
          </div>
        </div>

        {/* Ongoing Charity */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">الصدقات الجارية والأصول</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">water_drop</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#1D4ED8] font-readex">{formatAmount(ongoingTotal)}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#1D4ED8] font-semibold mt-1">أجهزة طبية ومشاريع مستدامة</p>
          </div>
        </div>

        {/* Food & Medical */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إطعام وعلاج ورعاية أسر</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">health_and_safety</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#B45309] font-readex">{formatAmount(foodAndMedicalTotal)}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#B45309] font-semibold mt-1">سلات غذائية وعمليات جراحية</p>
          </div>
        </div>

      </div>

      {/* Quote / Spiritual Reminder Banner */}
      <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl text-[#166534]">spa</span>
        <div className="text-xs text-[#166534] font-bold">
          <span>«مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ» — بارك الله في أرزاق المصنع والشركاء والعاملين.</span>
          <p className="text-[10px] text-[#15803D] font-normal mt-0.5">
            يتم توثيق كل بند صدقة بمصرفها الشرعي والجهة المستفيدة لضمان الشفافية والنقاء المالي.
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF9F5] p-1 rounded-xl border border-[#EBE3D8]">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'all'
                ? 'bg-white text-[#1E293B] shadow-xs border border-[#EBE3D8]'
                : 'text-[#78716C] hover:text-[#1E293B]'
            }`}
          >
            جميع البنود ({charities.length})
          </button>
          <button
            onClick={() => setFilterCategory('sadaqah')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'sadaqah' ? 'bg-[#006C4A] text-white shadow-xs' : 'text-[#57534E]'
            }`}
          >
            صدقات عامة
          </button>
          <button
            onClick={() => setFilterCategory('zakat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'zakat' ? 'bg-[#0D9488] text-white shadow-xs' : 'text-[#57534E]'
            }`}
          >
            زكاة مال
          </button>
          <button
            onClick={() => setFilterCategory('ongoing_charity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'ongoing_charity' ? 'bg-[#1D4ED8] text-white shadow-xs' : 'text-[#57534E]'
            }`}
          >
            صدقة جارية
          </button>
          <button
            onClick={() => setFilterCategory('food_aid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'food_aid' ? 'bg-[#B45309] text-white shadow-xs' : 'text-[#57534E]'
            }`}
          >
            إطعام وسلات
          </button>
          <button
            onClick={() => setFilterCategory('medical_support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterCategory === 'medical_support' ? 'bg-[#991B1B] text-white shadow-xs' : 'text-[#57534E]'
            }`}
          >
            علاج وعمليات
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="بحث بالبند أو الجهة المستفيدة أو المسؤول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-2.5 pr-8 py-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none"
          />
          <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-sm text-[#78716C]">search</span>
        </div>

      </div>

      {/* Charities Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#1E293B]">سجل مصارف الصدقات والتبرعات</h3>
            <p className="text-[11px] text-[#78716C] font-semibold">توثيق المبالغ والجهات المستفيدة والتاريخ</p>
          </div>
          <span className="text-xs font-bold text-[#78716C]">
            إجمالي المعروض: {formatAmount(filteredCharities.reduce((s, c) => s + (Number(c.amount) || 0), 0))} ج.م
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F5EFE8] text-[#57534E] font-bold bg-[#FAF8F5]">
                <th className="py-3 px-3 font-black">الكود</th>
                <th className="py-3 px-3 font-black">بند الصدقة / الوصف</th>
                <th className="py-3 px-3 font-black">النوع والتصنيف</th>
                <th className="py-3 px-3 font-black">الجهة المستفيدة / الحالة</th>
                <th className="py-3 px-3 font-black">المصدر وطريقة الصرف</th>
                <th className="py-3 px-3 font-black">التاريخ</th>
                <th className="py-3 px-3 font-black text-left">المبلغ (ج.م)</th>
                <th className="py-3 px-3 font-black text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCharities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#78716C] font-semibold">
                    لا توجد بنود صدقات مطابقة لخيارات البحث
                  </td>
                </tr>
              ) : (
                filteredCharities.map((item) => (
                  <tr key={item.id} className="border-b border-[#FAF9F5] hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                    
                    {/* Code */}
                    <td className="py-3.5 px-3 font-mono font-bold text-[#78716C]">{item.id}</td>

                    {/* Title */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1E293B] max-w-sm">{item.title}</span>
                        {item.notes && <span className="text-[10px] text-[#78716C]">{item.notes}</span>}
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.category === 'zakat' ? 'bg-[#CCFBF1] text-[#0F766E]' :
                        item.category === 'ongoing_charity' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                        item.category === 'food_aid' ? 'bg-[#FEF3C7] text-[#92400E]' :
                        item.category === 'medical_support' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                        'bg-[#DCFCE7] text-[#166534]'
                      }`}>
                        {item.category === 'zakat' ? 'زكاة مال' :
                         item.category === 'ongoing_charity' ? 'صدقة جارية' :
                         item.category === 'food_aid' ? 'إطعام وسلات' :
                         item.category === 'medical_support' ? 'علاج وعمليات' : 'صدقة عامة'}
                      </span>
                    </td>

                    {/* Beneficiary */}
                    <td className="py-3.5 px-3 font-semibold text-[#1E293B]">
                      {item.beneficiary}
                      {item.representative && (
                        <span className="block text-[10px] text-[#78716C]">بإشراف: {item.representative}</span>
                      )}
                    </td>

                    {/* Source & Method */}
                    <td className="py-3.5 px-3 text-[#57534E]">
                      <div className="text-[11px] font-bold">
                        {item.source === 'company_percentage' && 'نسبة أرباح المصنع'}
                        {item.source === 'partners_fund' && 'صندوق الشركاء'}
                        {item.source === 'general_charity_box' && 'صندوق التكافل'}
                        {item.source === 'direct_donation' && 'تبرع مباشر'}
                      </div>
                      <div className="text-[10px] text-[#A8A29E]">
                        {item.paymentMethod === 'cash' ? 'نقداً' :
                         item.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                         item.paymentMethod === 'instapay' ? 'إنستاباي' : 'عيني'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 font-semibold text-[#57534E]">{item.date}</td>

                    {/* Amount */}
                    <td className="py-3.5 px-3 text-left">
                      <span className="font-black text-sm text-[#006C4A] font-readex">
                        {formatAmount(item.amount)} <span className="text-[10px] font-bold">ج.م</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          title="تعديل البند"
                          className="p-1.5 text-[#0369A1] hover:bg-[#E0F2FE] rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item.id)}
                          title="حذف البند"
                          className="p-1.5 text-[#C2410C] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Donation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-xl max-w-lg w-full p-6 text-right flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#006C4A] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1E293B]">
                    {isEditing ? 'تعديل بند الصدقة' : 'تسجيل بند صدقة / تبرع جديد'}
                  </h3>
                  <p className="text-[10px] text-[#78716C] font-semibold">توثيق المصرف والمبلغ بالجنيه المصري</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#78716C] hover:text-[#1E293B] p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">بيان / بند الصدقة:</label>
                <input
                  type="text"
                  placeholder="مثال: سلات غذائية لـ 50 أسرة، مساهمة عملية جراحية، زكاة مال..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
                  required
                />
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1E293B]">المبلغ بالجنيه (ج.م):</label>
                    <span className="text-[10px] text-[#006C4A] font-bold">اكتب أي رقم أو كسر</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="اكتب المبلغ هنا (مثلاً: 0.50 أو 5 أو 15 أو 1000.50...)"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full p-2.5 pl-12 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-sm font-black text-[#1E293B] font-readex outline-none focus:border-[#006C4A]"
                      required
                      autoFocus
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-[#78716C]">ج.م</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">نوع وتصنيف الصدقة:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="sadaqah">صدقة عامة</option>
                    <option value="zakat">زكاة مال</option>
                    <option value="ongoing_charity">صدقة جارية وأصول</option>
                    <option value="food_aid">إطعام وسلات تموينية</option>
                    <option value="medical_support">علاج ورعاية صحية</option>
                    <option value="community">مساهمات مجتمعية</option>
                  </select>
                </div>
              </div>

              {/* Beneficiary & Representative */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">الجهة المستفيدة / الحالة:</label>
                  <input
                    type="text"
                    placeholder="مستشفى، جمعية خيرية، أسر مستحقة..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">المشرف / المندوب المسلّم:</label>
                  <input
                    type="text"
                    placeholder="اسم المسؤول..."
                    value={representative}
                    onChange={(e) => setRepresentative(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  />
                </div>
              </div>

              {/* Source & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">مصدر الصدقة:</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="company_percentage">نسبة مقتطعة من أرباح المصنع</option>
                    <option value="partners_fund">مساهمة من حساب الشركاء</option>
                    <option value="general_charity_box">صندوق التكافل الخيري</option>
                    <option value="direct_donation">تبرع مباشر</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">طريقة الصرف:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="bank_transfer">تحويل بنكي رسمي</option>
                    <option value="cash">نقداً مباشرة للحالة</option>
                    <option value="instapay">تحويل إنستاباي</option>
                    <option value="in_kind">تبرع عيني / مواد</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">تاريخ الصرف والتسليم:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">ملاحظات وتفاصيل التوثيق:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات حول إيصال الاستلام، حالة المريض، أو مكان التوزيع..."
                  className="w-full p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-black text-white bg-[#006C4A] hover:bg-[#005238] transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">volunteer_activism</span>
                  {isEditing ? 'حفظ التعديلات' : 'توثيق وتسجيل الصدقة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
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
