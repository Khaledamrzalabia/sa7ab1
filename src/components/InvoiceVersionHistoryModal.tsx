import React from 'react';
import { Invoice, InvoiceVersion } from '../types';

interface InvoiceVersionHistoryModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export default function InvoiceVersionHistoryModal({
  invoice,
  onClose
}: InvoiceVersionHistoryModalProps) {
  if (!invoice) return null;

  const history = invoice.history || [];

  // Calculate current invoice metrics
  const currentTotalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);
  const currentDeliveredQty = invoice.items.reduce((s, i) => s + i.delivered, 0);
  const currentAmount = invoice.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-right">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#EBE3D8] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 bg-[#FAF9F5] border-b border-[#EBE3D8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">history</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#1E293B]">
                  سجل التعديلات ومقارنة النسخ للفاتورة
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#0D9488] text-white font-readex">
                  {invoice.id}
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                مقارنة دقيقة بين النسخة الحالية لـ «كود الفاتورة» والنسخ السابقة والتواريخ وسبب التعديل
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
          
          {/* Top Quick Status Notice */}
          <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-blue-950 font-bold">
              <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
              <span>
                إجمالي التعديلات المعتمدة والمحفوظة: <strong className="font-black text-blue-700">{history.length}</strong> تعديل سابق، بالإضافة للنسخة الجارية المعتمدة.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-black">
              <span className="text-[#78716C]">القيمة الحالية:</span>
              <span className="text-emerald-700 font-readex text-sm">{currentAmount.toLocaleString()} ر.س</span>
            </div>
          </div>

          {/* CURRENT ACTIVE VERSION CARD */}
          <div className="border-2 border-[#0D9488] rounded-2xl p-5 bg-[#F0FDF4]/50 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0D9488]/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-black bg-[#0D9488] text-white">
                  النسخة الحالية النشطة
                </span>
                <span className="text-xs font-bold text-[#1E293B]">
                  بتاريخ: {invoice.date} {invoice.time && `| ${invoice.time}`}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-[#047857]">
                  القطع المسلمة: {currentDeliveredQty} من {currentTotalQty} قطعة
                </span>
                <span className="text-sm font-black text-[#1E293B] font-readex">
                  الإجمالي: {currentAmount.toLocaleString()} ر.س
                </span>
              </div>
            </div>

            <p className="text-xs text-[#57534E] font-medium">
              <strong>البيان الحالي:</strong> {invoice.description}
            </p>

            {/* Current Items Table */}
            <div className="overflow-x-auto border border-[#EBE3D8] rounded-xl bg-white">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EBE3D8] text-[#1E293B]">
                    <th className="p-2.5 font-black text-center w-24">كود الصنف</th>
                    <th className="p-2.5 font-black">النوع والبيان</th>
                    <th className="p-2.5 font-black text-center w-20">الكمية</th>
                    <th className="p-2.5 font-black text-center w-24">سعر الوحدة</th>
                    <th className="p-2.5 font-black text-center w-28">المجموع الكلي</th>
                    <th className="p-2.5 font-black text-center w-28 bg-[#ECFDF5] text-[#047857]">القطع المسلمة</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#F5EFE8]">
                      <td className="p-2.5 text-center font-bold text-[#78716C] font-readex">{item.code}</td>
                      <td className="p-2.5 font-bold text-[#1E293B]">{item.type}</td>
                      <td className="p-2.5 text-center font-black text-[#1E293B] font-readex">{item.quantity}</td>
                      <td className="p-2.5 text-center font-bold text-[#57534E] font-readex">{item.unitPrice.toLocaleString()} ر.س</td>
                      <td className="p-2.5 text-center font-black text-[#1E293B] font-readex">{item.total.toLocaleString()} ر.س</td>
                      <td className="p-2.5 text-center font-black text-[#047857] bg-[#ECFDF5] font-readex">{item.delivered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HISTORICAL VERSIONS LIST */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-black text-[#1E293B] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#78716C] text-lg">schedule</span>
              أرشيف النسخ والتعديلات السابقة (قبل التعديل)
            </h4>

            {history.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F5] border border-dashed border-[#D6CEBF] rounded-2xl">
                <span className="material-symbols-outlined text-3xl text-[#A8A29E]">fact_check</span>
                <p className="text-xs text-[#78716C] font-semibold mt-2">
                  هذه الفاتورة ما زالت بنسختها الأصلية الأولى ولم يطرأ عليها أي تعديلات مسجلة بعد.
                </p>
                <p className="text-[11px] text-[#A8A29E] mt-1">
                  عند قيامك بالضغط على زر «تعديل الفاتورة» سيتم حفظ نسخة أصلية هنا تلقائياً لتوثيق الفروقات!
                </p>
              </div>
            ) : (
              history.map((ver, idx) => {
                const verTotalQty = ver.items.reduce((s, i) => s + i.quantity, 0);
                const verDeliveredQty = ver.items.reduce((s, i) => s + i.delivered, 0);
                const diffAmount = currentAmount - ver.amount;

                return (
                  <div
                    key={idx}
                    className="border border-[#EBE3D8] rounded-2xl p-5 bg-white flex flex-col gap-4 shadow-sm hover:border-[#D6CEBF] transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F5EFE8] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#F5EFE8] text-[#57534E]">
                          النسخة رقم #{ver.versionNumber}
                        </span>
                        <span className="text-xs font-bold text-[#78716C]">
                          تاريخ التعديل: {ver.editedAt} {ver.editedTime && `| ${ver.editedTime}`}
                        </span>
                        {ver.editReason && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
                            السبب: {ver.editReason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="text-[#78716C]">
                          المجموع قبل التعديل: <strong className="font-readex text-[#1E293B]">{ver.amount.toLocaleString()} ر.س</strong>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          diffAmount > 0 ? 'bg-emerald-100 text-emerald-800' : diffAmount < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {diffAmount > 0 ? `+ زيادة ${diffAmount.toLocaleString()} ر.س بالنسخة الحالية` : diffAmount < 0 ? `- تخفيض ${Math.abs(diffAmount).toLocaleString()} ر.س` : 'نفس القيمة الإجمالية'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#57534E]">
                      <strong>البيان في تلك النسخة:</strong> {ver.description}
                    </p>

                    {/* Historical Items Table */}
                    <div className="overflow-x-auto border border-[#EBE3D8] rounded-xl bg-[#FAF9F5]">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="bg-[#EBE3D8]/50 border-b border-[#EBE3D8] text-[#57534E]">
                            <th className="p-2 font-black text-center w-24">كود الصنف</th>
                            <th className="p-2 font-black">النوع والبيان القديم</th>
                            <th className="p-2 font-black text-center w-20">الكمية</th>
                            <th className="p-2 font-black text-center w-24">سعر الوحدة</th>
                            <th className="p-2 font-black text-center w-28">المجموع</th>
                            <th className="p-2 font-black text-center w-28 text-[#047857]">القطع المسلمة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ver.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="border-b border-[#EBE3D8]/40">
                              <td className="p-2 text-center font-bold text-[#78716C] font-readex">{item.code}</td>
                              <td className="p-2 font-bold text-[#57534E]">{item.type}</td>
                              <td className="p-2 text-center font-bold font-readex">{item.quantity}</td>
                              <td className="p-2 text-center font-bold font-readex">{item.unitPrice.toLocaleString()} ر.س</td>
                              <td className="p-2 text-center font-bold font-readex">{item.total.toLocaleString()} ر.س</td>
                              <td className="p-2 text-center font-bold text-[#047857] font-readex">{item.delivered}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[#78716C] font-semibold bg-[#FAF8F5] p-2.5 rounded-lg border border-[#EBE3D8]">
                      <span>إجمالي القطع في النسخة القديمة: {verTotalQty} قطعة</span>
                      <span>القطع التي كانت مسلّمة حينها: {verDeliveredQty} قطعة</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF9F5] border-t border-[#EBE3D8] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-black rounded-xl transition-all shadow-sm"
          >
            إغلاق سجل المقارنة
          </button>
        </div>

      </div>
    </div>
  );
}
