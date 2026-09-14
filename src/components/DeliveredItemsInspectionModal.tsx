import React, { useState } from 'react';
import { Invoice } from '../types';

interface DeliveredItemsInspectionModalProps {
  invoices: Invoice[];
  customerName: string;
  onClose: () => void;
}

export default function DeliveredItemsInspectionModal({
  invoices,
  customerName,
  onClose
}: DeliveredItemsInspectionModalProps) {
  const [filterState, setFilterState] = useState<'all' | 'delivered' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Flatten all items across customer invoices with invoice details
  const allItems = invoices.flatMap(inv => 
    inv.items.map(item => ({
      ...item,
      invoiceId: inv.id,
      invoiceDate: inv.date,
      invoiceType: inv.type,
      pending: Math.max(0, item.quantity - item.delivered)
    }))
  );

  // Filter items based on user selection and search query
  const filteredItems = allItems.filter(item => {
    // Filter status
    if (filterState === 'delivered' && item.delivered === 0) return false;
    if (filterState === 'pending' && item.pending === 0) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.invoiceId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOrdered = allItems.reduce((s, i) => s + i.quantity, 0);
  const totalDelivered = allItems.reduce((s, i) => s + i.delivered, 0);
  const totalPending = allItems.reduce((s, i) => s + i.pending, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-right">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#EBE3D8] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 bg-[#FAF9F5] border-b border-[#EBE3D8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#1E293B]">
                  كشف تدقيق الأصناف والأكواد المسلّمة وغير المسلّمة
                </h3>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                تتبع تفصيلي لكل بند وكود صنف بحساب {customerName} لمعرفة ما تم شحنه وما هو معلق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border border-[#EBE3D8] text-[#78716C] hover:text-[#1E293B] hover:bg-[#F5EFE8] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* Quick Analytics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F5EFE8] border border-[#EBE3D8] flex flex-col gap-1 text-right">
              <span className="text-[11px] font-bold text-[#78716C]">إجمالي القطع المطلوبة كلياً</span>
              <span className="text-xl font-black text-[#1E293B] font-readex">
                {totalOrdered.toLocaleString()} <span className="text-xs font-normal text-[#78716C]">قطعة</span>
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-emerald-200 flex flex-col gap-1 text-right">
              <span className="text-[11px] font-bold text-emerald-800">القطع المسلّمة والمشحونة فعلاً</span>
              <span className="text-xl font-black text-emerald-900 font-readex">
                {totalDelivered.toLocaleString()} <span className="text-xs font-normal text-emerald-700">قطعة</span>
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-orange-200 flex flex-col gap-1 text-right">
              <span className="text-[11px] font-bold text-orange-800">القطع المتبقية المعلقة (لم تُسلّم)</span>
              <span className="text-xl font-black text-orange-900 font-readex">
                {totalPending.toLocaleString()} <span className="text-xs font-normal text-orange-700">قطعة</span>
              </span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF9F5] p-3 rounded-2xl border border-[#EBE3D8]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterState('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filterState === 'all'
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'bg-white text-[#57534E] hover:bg-[#F5EFE8] border border-[#EBE3D8]'
                }`}
              >
                جميع الأصناف ({allItems.length})
              </button>
              <button
                onClick={() => setFilterState('delivered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filterState === 'delivered'
                    ? 'bg-[#0D9488] text-white shadow-sm'
                    : 'bg-white text-[#57534E] hover:bg-[#F5EFE8] border border-[#EBE3D8]'
                }`}
              >
                تم تسليمها جزئياً أو كلياً
              </button>
              <button
                onClick={() => setFilterState('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filterState === 'pending'
                    ? 'bg-[#C2410C] text-white shadow-sm'
                    : 'bg-white text-[#57534E] hover:bg-[#F5EFE8] border border-[#EBE3D8]'
                }`}
              >
                معلقة لم يتم تسليمها بعد
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#D6CEBF] w-full sm:w-64">
              <span className="material-symbols-outlined text-[#78716C] text-sm">search</span>
              <input
                type="text"
                placeholder="بحث بكود الصنف أو البيان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold text-[#1E293B] outline-none"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-[#EBE3D8] rounded-2xl bg-white">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EBE3D8] text-[#1E293B]">
                  <th className="p-3 font-black text-center w-28">كود الصنف</th>
                  <th className="p-3 font-black">النوع والبيان الميكانيكي</th>
                  <th className="p-3 font-black text-center w-28">كود الفاتورة</th>
                  <th className="p-3 font-black text-center w-24">المطلوب</th>
                  <th className="p-3 font-black text-center w-28 bg-[#ECFDF5] text-[#065F46]">المسلّم فعلاً</th>
                  <th className="p-3 font-black text-center w-28 bg-[#FFF7ED] text-[#9A3412]">المتبقي للتسليم</th>
                  <th className="p-3 font-black text-center w-28">سعر الوحدة</th>
                  <th className="p-3 font-black text-center w-32">المجموع الكلي</th>
                  <th className="p-3 font-black text-center w-28">حالة التسليم</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-[#78716C]">
                      لا توجد أصناف تطابق معايير البحث والفلترة المختارة.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isFullyDelivered = item.delivered >= item.quantity;
                    const isPartiallyDelivered = item.delivered > 0 && item.delivered < item.quantity;
                    const isPending = item.delivered === 0;

                    return (
                      <tr key={idx} className="border-b border-[#F5EFE8] hover:bg-[#FAF9F5]/50 transition-colors">
                        <td className="p-3 text-center font-extrabold text-[#78716C] font-readex bg-[#FAF9F5]">
                          {item.code}
                        </td>
                        <td className="p-3 font-bold text-[#1E293B]">{item.type}</td>
                        <td className="p-3 text-center font-bold text-[#0D9488] font-readex">
                          {item.invoiceId}
                        </td>
                        <td className="p-3 text-center font-black text-[#1E293B] font-readex">{item.quantity}</td>
                        <td className="p-3 text-center font-black text-[#047857] bg-[#ECFDF5] font-readex">
                          {item.delivered}
                        </td>
                        <td className="p-3 text-center font-black text-[#C2410C] bg-[#FFF7ED] font-readex">
                          {item.pending}
                        </td>
                        <td className="p-3 text-center font-bold text-[#57534E] font-readex">
                          {item.unitPrice.toLocaleString()} ر.س
                        </td>
                        <td className="p-3 text-center font-black text-[#1E293B] font-readex">
                          {item.total.toLocaleString()} ر.س
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            isFullyDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartiallyDelivered
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isFullyDelivered ? 'مسلّم بالكامل' : isPartiallyDelivered ? 'تسليم جزئي' : 'معلق لم يشحن'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF9F5] border-t border-[#EBE3D8] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-black rounded-xl transition-all shadow-sm"
          >
            إغلاق الكشف
          </button>
        </div>

      </div>
    </div>
  );
}
