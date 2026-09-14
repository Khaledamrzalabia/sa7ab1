import React, { useState } from 'react';
import { Expense } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

interface ExpensesManagementProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function ExpensesManagement({
  expenses,
  setExpenses,
}: ExpensesManagementProps) {
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');

  // Form states
  const [type, setType] = useState<'in' | 'out'>('out');
  const [category, setCategory] = useState<string>('خامات ومستلزمات إنتاج');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('cash');
  const [receiptRef, setReceiptRef] = useState<string>('');
  const [party, setParty] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('أمين الخزينة');
  const [notes, setNotes] = useState<string>('');

  // Categories list
  const outCategories = [
    'خامات ومستلزمات إنتاج',
    'صيانة ماكينات وقطع غيار',
    'فواتير كهرباء ومرافق',
    'إيجارات ومستودعات',
    'نقل ولوجستيات وشحن',
    'نثريات وضيافة وإعاشة',
    'أدوات ومهمات أمان صناعي',
    'أخرى'
  ];

  const inCategories = [
    'إيراد مبيعات نقدية',
    'عوائد تشغيل وصيانة خارجية',
    'إيراد بيع خردة وهوالك إنتاج',
    'مقبوضات خدمات صناعية',
    'أخرى'
  ];

  // Calculations
  const totalIn = expenses.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
  const totalOut = expenses.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIn - totalOut;

  // Filtered List
  const filteredExpenses = expenses.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchParty = item.party.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchReceipt = item.receiptRef ? item.receiptRef.toLowerCase().includes(q) : false;
      return matchTitle || matchParty || matchCategory || matchId || matchReceipt;
    }
    return true;
  });

  const handleOpenAddModal = (defaultType: 'in' | 'out' = 'out') => {
    setIsEditing(false);
    setEditId('');
    setType(defaultType);
    setCategory(defaultType === 'in' ? inCategories[0] : outCategories[0]);
    setTitle('');
    setAmount(1000);
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setReceiptRef(generateUniqueId('REC'));
    setParty('');
    setRecordedBy('مسؤول الخزينة');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEditClick = (item: Expense) => {
    setIsEditing(true);
    setEditId(item.id);
    setType(item.type);
    setCategory(item.category);
    setTitle(item.title);
    setAmount(item.amount);
    setDate(item.date);
    setPaymentMethod(item.paymentMethod);
    setReceiptRef(item.receiptRef || '');
    setParty(item.party);
    setRecordedBy(item.recordedBy || 'المسؤول المالي');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا القيد المالي؟')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || amount <= 0) {
      alert('يرجى إدخال وصف صالح ومبلغ أكبر من صفر.');
      return;
    }

    if (isEditing) {
      setExpenses(prev => prev.map((item) => {
        if (item.id === editId) {
          return {
            ...item,
            type,
            category,
            title,
            amount,
            date,
            paymentMethod,
            receiptRef,
            party,
            recordedBy,
            notes
          };
        }
        return item;
      }));
    } else {
      const newId = generateUniqueId('TRX');
      const newExpense: Expense = {
        id: newId,
        type,
        category,
        title,
        amount,
        date,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        paymentMethod,
        receiptRef,
        party,
        recordedBy,
        notes
      };
      setExpenses(prev => [newExpense, ...prev]);
    }

    setIsModalOpen(false);
  };

  return (
    <div id="screen-expenses-management" className="flex flex-col gap-6 pb-12 text-right">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
              المصروفات والإيرادات (الداخل والخارج)
            </h1>
            <p className="text-xs text-[#78716C] font-semibold">
              متابعة التدفقات النقدية، تسجيل المقبوضات ومصروفات التشغيل والخامات بالجنيه المصري (ج.م)
            </p>
          </div>
        </div>

        {/* Action Buttons: Add In / Add Out */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => handleOpenAddModal('in')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-white bg-[#006C4A] hover:bg-[#005238] transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            تسجيل مقبوضات (داخل +)
          </button>
          <button
            onClick={() => handleOpenAddModal('out')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-white bg-[#C2410C] hover:bg-[#9A3412] transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">remove_circle</span>
            تسجيل مصروف (خارج -)
          </button>
        </div>
      </div>

      {/* KPI Cards: In vs Out vs Net */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total In */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي المقبوضات (الداخل)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#006C4A] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#006C4A] font-readex">+{totalIn.toLocaleString()}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#006C4A] font-bold mt-1">
              {expenses.filter(e => e.type === 'in').length} عمليات إيراد مسجلة
            </p>
          </div>
        </div>

        {/* Total Out */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي المصروفات (الخارج)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#C2410C] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_down</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#C2410C] font-readex">-{totalOut.toLocaleString()}</span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className="text-[10px] text-[#C2410C] font-bold mt-1">
              {expenses.filter(e => e.type === 'out').length} فواتير ومصروفات تشغيل
            </p>
          </div>
        </div>

        {/* Net Flow */}
        <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">صافي السيولة النقدية (الفائض)</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              netBalance >= 0 ? 'bg-teal-50 text-[#0D9488]' : 'bg-rose-50 text-rose-700'
            }`}>
              <span className="material-symbols-outlined text-lg">savings</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black font-readex ${
                netBalance >= 0 ? 'text-[#0D9488]' : 'text-rose-700'
              }`}>
                {netBalance >= 0 ? `+${netBalance.toLocaleString()}` : netBalance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-[#78716C]">ج.م</span>
            </div>
            <p className={`text-[10px] font-bold mt-1 ${netBalance >= 0 ? 'text-[#0D9488]' : 'text-rose-700'}`}>
              {netBalance >= 0 ? 'فائض نقدي إيجابي بالخزينة' : 'عجز مؤقت في التدفق'}
            </p>
          </div>
        </div>

        {/* Total Records */}
        <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#EBE3D8] shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C]">إجمالي القيود بالدفتر</span>
            <div className="w-9 h-9 rounded-xl bg-[#EBE3D8] text-[#57534E] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#1E293B] font-readex">{expenses.length}</span>
              <span className="text-xs font-bold text-[#78716C]">معاملة موثقة</span>
            </div>
            <p className="text-[10px] text-[#78716C] font-semibold mt-1">تحديث دوري للخزينة</p>
          </div>
        </div>

      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F5] p-1 rounded-xl border border-[#EBE3D8]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterType === 'all'
                ? 'bg-white text-[#1E293B] shadow-xs border border-[#EBE3D8]'
                : 'text-[#78716C] hover:text-[#1E293B]'
            }`}
          >
            الكل ({expenses.length})
          </button>
          <button
            onClick={() => setFilterType('in')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterType === 'in'
                ? 'bg-[#006C4A] text-white shadow-xs'
                : 'text-[#006C4A] hover:bg-[#E6F4EA]'
            }`}
          >
            الداخل (إيراد +)
          </button>
          <button
            onClick={() => setFilterType('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filterType === 'out'
                ? 'bg-[#C2410C] text-white shadow-xs'
                : 'text-[#C2410C] hover:bg-[#FEE2E2]'
            }`}
          >
            الخارج (مصروف -)
          </button>
        </div>

        {/* Category & Search Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-48 p-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
          >
            <option value="all">جميع التصنيفات</option>
            <optgroup label="مصروفات (خارج)">
              {outCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
            <optgroup label="إيرادات (داخل)">
              {inCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث بالبيان أو الطرف الآخر أو رقم الإيصال..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-2.5 pr-8 py-2 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none"
            />
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-sm text-[#78716C]">search</span>
          </div>
        </div>

      </div>

      {/* Expenses & Revenues Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#1E293B]">دفتر القيود والمعاملات النقدية</h3>
            <p className="text-[11px] text-[#78716C] font-semibold">عرض مفصل لجميع المقبوضات والمدفوعات</p>
          </div>
          <span className="text-xs font-bold text-[#78716C]">
            عرض {filteredExpenses.length} من أصل {expenses.length} قيد
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F5EFE8] text-[#57534E] font-bold bg-[#FAF8F5]">
                <th className="py-3 px-3 font-black">كود المعاملة</th>
                <th className="py-3 px-3 font-black text-center">النوع</th>
                <th className="py-3 px-3 font-black">بيان المعاملة والمستلم/الدافع</th>
                <th className="py-3 px-3 font-black">التصنيف</th>
                <th className="py-3 px-3 font-black">التاريخ / الوقت</th>
                <th className="py-3 px-3 font-black">طريقة الدفع</th>
                <th className="py-3 px-3 font-black text-left">المبلغ (ج.م)</th>
                <th className="py-3 px-3 font-black text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#78716C] font-semibold">
                    لا توجد معاملات مطابقة لمعايير البحث المحددة
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item) => {
                  const isIn = item.type === 'in';
                  return (
                    <tr key={item.id} className="border-b border-[#FAF9F5] hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                      
                      {/* Code */}
                      <td className="py-3.5 px-3 font-mono font-bold text-[#78716C]">
                        {item.id}
                        {item.receiptRef && (
                          <span className="block text-[9px] text-[#A8A29E] font-normal">{item.receiptRef}</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          isIn ? 'bg-[#D4F4E4] text-[#006C4A] border border-[#A7F3D0]' : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                        }`}>
                          <span className="material-symbols-outlined text-xs">
                            {isIn ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          {isIn ? 'داخل (إيراد)' : 'خارج (مصروف)'}
                        </span>
                      </td>

                      {/* Title & Party */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1E293B] max-w-sm">{item.title}</span>
                          <span className="text-[10px] text-[#78716C] font-semibold">
                            الطرف: {item.party} {item.recordedBy ? `| المسؤول: ${item.recordedBy}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-[#FAF9F5] border border-[#E6DDD1] text-[10px] font-bold text-[#57534E]">
                          {item.category}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 font-semibold text-[#57534E]">
                        <div>{item.date}</div>
                        {item.time && <div className="text-[10px] text-[#A8A29E]">{item.time}</div>}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-3 text-[#57534E]">
                        {item.paymentMethod === 'cash' && 'نقداً بالخزينة'}
                        {item.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
                        {item.paymentMethod === 'instapay' && 'إنستاباي فوري'}
                        {item.paymentMethod === 'vodafone_cash' && 'فودافون كاش'}
                        {item.paymentMethod === 'cheque' && 'شيك مصرفي'}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-left">
                        <span className={`font-black text-sm font-readex ${
                          isIn ? 'text-[#006C4A]' : 'text-[#C2410C]'
                        }`}>
                          {isIn ? '+' : '-'} {item.amount.toLocaleString()}{' '}
                          <span className="text-[10px] font-bold">ج.م</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            title="تعديل القيد"
                            className="p-1.5 text-[#0369A1] hover:bg-[#E0F2FE] rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item.id)}
                            title="حذف القيد"
                            className="p-1.5 text-[#C2410C] hover:bg-[#FEE2E2] rounded-lg transition-colors"
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

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-xl max-w-lg w-full p-6 text-right flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  type === 'in' ? 'bg-emerald-100 text-[#006C4A]' : 'bg-rose-100 text-[#C2410C]'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {type === 'in' ? 'arrow_downward' : 'arrow_upward'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1E293B]">
                    {isEditing ? 'تعديل المعاملة المالية' : type === 'in' ? 'تسجيل إيراد / مقبوضات (داخل +)' : 'تسجيل مصروف وتشغيل (خارج -)'}
                  </h3>
                  <p className="text-[10px] text-[#78716C] font-semibold">توثيق القيد بالدفتر والخزينة</p>
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
              
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-[#FAF9F5] p-1 rounded-xl border border-[#EBE3D8]">
                <button
                  type="button"
                  onClick={() => {
                    setType('in');
                    setCategory(inCategories[0]);
                  }}
                  className={`py-2 rounded-lg text-xs font-black transition-all ${
                    type === 'in' ? 'bg-[#006C4A] text-white shadow-xs' : 'text-[#006C4A]'
                  }`}
                >
                  داخل (إيراد ومقبوضات +)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('out');
                    setCategory(outCategories[0]);
                  }}
                  className={`py-2 rounded-lg text-xs font-black transition-all ${
                    type === 'out' ? 'bg-[#C2410C] text-white shadow-xs' : 'text-[#C2410C]'
                  }`}
                >
                  خارج (مصروف ومدفوعات -)
                </button>
              </div>

              {/* Title / Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">بيان ووصف المعاملة:</label>
                <input
                  type="text"
                  placeholder="مثال: شراء صاج مجلفن، سداد فاتورة كهرباء، دفعة مبيعات..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  required
                />
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">المبلغ بالجنيه المصري (ج.م):</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 pl-12 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-sm font-black text-[#1E293B] font-readex outline-none focus:border-[#0D9488]"
                      required
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-[#78716C]">ج.م</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">التصنيف / الفئة:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    {(type === 'in' ? inCategories : outCategories).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Party & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">
                    {type === 'in' ? 'المستلم منه (العميل/الجهة):' : 'المصروف له (المورد/الجهة):'}
                  </label>
                  <input
                    type="text"
                    placeholder="اسم الشركة أو الشخص..."
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">طريقة الدفع / التحصيل:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="cash">نقداً بالخزينة</option>
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="instapay">إنستاباي فوري</option>
                    <option value="vodafone_cash">فودافون كاش ومحافظ</option>
                    <option value="cheque">شيك مصرفي</option>
                  </select>
                </div>
              </div>

              {/* Date & Receipt Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">تاريخ المعاملة:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">رقم الفاتورة / الإيصال:</label>
                  <input
                    type="text"
                    placeholder="REC-XXXX أو INV-XXXX"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-mono font-semibold text-[#1E293B] outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل أخرى أو رقم إذن الصرف..."
                  className="w-full p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    type === 'in' ? 'bg-[#006C4A] hover:bg-[#005238]' : 'bg-[#C2410C] hover:bg-[#9A3412]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  {isEditing ? 'حفظ التعديلات' : type === 'in' ? 'تسجيل الإيراد في الخزينة' : 'تسجيل إذن الصرف'}
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
