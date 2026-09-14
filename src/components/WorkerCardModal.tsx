import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Worker } from '../types';

interface WorkerCardModalProps {
  worker: Worker | null;
  onClose: () => void;
}

export default function WorkerCardModal({ worker, onClose }: WorkerCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!worker) return;

    // Generate QR payload - simple format so scanner can easily detect
    const payload = JSON.stringify({
      t: 'W',
      c: worker.shortCode || worker.id,
      id: worker.id,
      n: worker.name
    });

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error', err));
  }, [worker]);

  if (!worker) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(worker.shortCode || worker.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate a downloadable canvas from the card
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 1050;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality canvas background
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Industrial Header
    ctx.fillStyle = '#006C4A';
    ctx.fillRect(0, 0, canvas.width, 180);

    // Header Accent Line
    ctx.fillStyle = '#C2410C';
    ctx.fillRect(0, 180, canvas.width, 8);

    // Header Texts
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAHAB - مصنع سحاب للملابس الجاهزة', canvas.width / 2, 60);

    ctx.font = '18px "Cairo", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('بطاقة الهوية وكود الحضور والانصراف للعمال', canvas.width / 2, 100);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FDE047';
    ctx.fillText(`الكود السريع: #${worker.shortCode || worker.id}`, canvas.width / 2, 145);

    // Worker Details Section
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 32px "Cairo", sans-serif';
    ctx.fillText(worker.name, canvas.width / 2, 270);

    ctx.fillStyle = '#006C4A';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.fillText(worker.role, canvas.width / 2, 310);

    ctx.fillStyle = '#64748B';
    ctx.font = '18px "Cairo", sans-serif';
    ctx.fillText(`القسم: ${worker.department} | ${worker.line}`, canvas.width / 2, 345);

    // Draw QR code image
    if (qrDataUrl) {
      const img = new Image();
      img.onload = () => {
        // QR box background
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 4;
        ctx.fillRect(canvas.width / 2 - 140, 390, 280, 280);
        ctx.strokeRect(canvas.width / 2 - 140, 390, 280, 280);

        ctx.drawImage(img, canvas.width / 2 - 130, 400, 260, 260);

        // Under QR Code Badge
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(canvas.width / 2 - 160, 690, 320, 50);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(`SHORT CODE: ${worker.shortCode || worker.id}`, canvas.width / 2, 725);

        // Info Cards Bottom
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(50, 770, 600, 180);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(50, 770, 600, 180);

        ctx.fillStyle = '#475569';
        ctx.font = '18px "Cairo", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`الرقم التعريفي: ${worker.id}`, 620, 815);
        ctx.fillText(`الرقم القومي: ${worker.nationalId}`, 620, 855);
        ctx.fillText(`مواعيد الوردية: ${worker.shiftStart} إلى ${worker.shiftEnd}`, 620, 895);
        ctx.fillText(`الحالة التشغيلية: ${worker.status === 'active' ? 'نشط على رأس العمل' : 'إجازة / غير نشط'}`, 620, 935);

        // Footer
        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px "Cairo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('هذه البطاقة مخصصة لتسجيل الحضور والانصراف السريع عبر المشرفين ومساعدي الوردية', canvas.width / 2, 1000);

        // Trigger Download
        const link = document.createElement('a');
        link.download = `بطاقة_عامل_${worker.shortCode || worker.id}_${worker.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      img.src = qrDataUrl;
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `مرحباً ${worker.name}،\nإليك بطاقة التحضير الذكية الخاصة بك بمصنع النيل للصناعات:\nالكود السريع اليدوي: ${worker.shortCode || worker.id}\nالرقم التعريفي: ${worker.id}\nالوردية: ${worker.shiftStart} إلى ${worker.shiftEnd}\nيرجى إبراز البطاقة أو الكود للمشرف عند تسجيل الحضور والانصراف والأذونات.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl border border-[#E6DDD1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-6 text-right">
        
        {/* Top Action Bar */}
        <div className="p-4 bg-white border-b border-[#E6DDD1] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006C4A]">badge</span>
            <div>
              <h3 className="text-sm font-black text-[#1E293B]">بطاقة التحضير والـ QR كود</h3>
              <p className="text-[11px] text-[#78716C]">صالحة للمسح الفوري والكتابة اليدوية السريعة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5EFE8] hover:bg-[#EBE3D8] text-[#57534E] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Printable/Downloadable Card Preview */}
        <div className="p-6 flex flex-col items-center">
          <div
            ref={cardRef}
            className="w-full max-w-sm bg-white rounded-3xl border-2 border-[#D6CEBF] shadow-lg overflow-hidden flex flex-col relative"
          >
            {/* Card Header Header */}
            <div className="bg-gradient-to-l from-[#006C4A] to-[#044E36] p-4 text-white text-center relative">
              <div className="absolute top-2 left-3 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold tracking-wider">
                ID BADGE
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="material-symbols-outlined text-amber-300 text-lg">checkroom</span>
                <span className="text-sm font-black tracking-widest font-sans uppercase">SAHAB</span>
                <span className="text-xs font-bold text-white/90">• مصنع سحاب للملابس</span>
              </div>
              <p className="text-[10px] text-white/80 font-medium">بطاقة الهوية وكود الحضور والانصراف</p>
              
              {/* Short Code Pill */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-black font-black font-mono text-sm shadow-sm">
                <span>الكود السريع:</span>
                <span className="text-base tracking-widest">#{worker.shortCode || worker.id}</span>
              </div>
            </div>

            {/* Worker Info */}
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#006C4A]/10 text-[#006C4A] border-2 border-[#006C4A]/20 flex items-center justify-center mb-3 shadow-xs">
                <span className="material-symbols-outlined text-3xl">badge</span>
              </div>

              <h4 className="text-lg font-black text-[#1E293B] mb-0.5">{worker.name}</h4>
              <p className="text-xs font-bold text-[#006C4A] bg-[#006C4A]/10 px-3 py-0.5 rounded-full mb-1">
                {worker.role}
              </p>
              <p className="text-[11px] text-[#78716C] font-semibold mb-4">
                {worker.department} • {worker.line}
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border-2 border-dashed border-[#D6CEBF] flex flex-col items-center justify-center mb-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl shadow-xs" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#78716C]">
                    جاري توليد الـ QR...
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-mono font-black text-[#1E293B] bg-white px-2 py-0.5 rounded border border-[#E2D9CC]">
                    كود التحضير: {worker.shortCode || worker.id}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded-md hover:bg-white text-[#78716C] hover:text-[#006C4A] transition-colors"
                    title="نسخ الكود"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {isCopied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Badges / Shift Info */}
              <div className="w-full grid grid-cols-2 gap-2 text-right text-[11px]">
                <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1]">
                  <span className="text-[9px] text-[#78716C] block">الرقم التعريفي:</span>
                  <span className="font-mono font-bold text-[#1E293B]">{worker.id}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1]">
                  <span className="text-[9px] text-[#78716C] block">الوردية الرسمية:</span>
                  <span className="font-bold text-[#1E293B]">{worker.shiftStart} - {worker.shiftEnd}</span>
                </div>
              </div>

              {/* Industrial Barcode Accent */}
              <div className="w-full mt-4 pt-3 border-t border-dashed border-[#E6DDD1] flex flex-col items-center">
                <div className="h-6 w-full flex items-center justify-center gap-1 opacity-70">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full bg-[#1E293B] ${
                        i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-[#78716C] tracking-widest mt-1">
                  * {worker.id}-{worker.shortCode || '100'} *
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-5 bg-white border-t border-[#E6DDD1] flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="px-4 py-2.5 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>تحميل البطاقة (صورة PNG)</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#D6CEBF] hover:bg-[#F5EFE8] text-[#1E293B] text-xs font-black flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-[#78716C]">print</span>
              <span>طباعة مباشرة</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
              title="إرسال للعامل عبر واتساب"
            >
              <span className="material-symbols-outlined text-sm">send_to_mobile</span>
              <span>واتساب</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F5EFE8] hover:bg-[#EBE3D8] text-[#57534E] text-xs font-bold"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
