import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { Worker, AttendanceLog, UserSession } from '../types';

interface QuickAttendanceTerminalProps {
  workers: Worker[];
  attendanceLogs: AttendanceLog[];
  currentUser: UserSession;
  onUpdateAttendance: (newLog: AttendanceLog, worker: Worker, feedbackMsg: string) => void;
  onClose: () => void;
  onOpenCard?: (worker: Worker) => void;
}

export default function QuickAttendanceTerminal({
  workers,
  attendanceLogs,
  currentUser,
  onUpdateAttendance,
  onClose,
  onOpenCard,
}: QuickAttendanceTerminalProps) {
  const [activeTab, setActiveTab] = useState<'numpad' | 'scanner' | 'quick_list'>('numpad');
  const [inputCode, setInputCode] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'check_in' | 'check_out' | 'permission_exit' | 'permission_return'>('check_in');
  const [permissionType, setPermissionType] = useState<string>('مهمة عمل خارجية رسمية');
  const [gate, setGate] = useState<string>('بوابة أفراد (أ)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  
  const [recentNotification, setRecentNotification] = useState<{
    workerName: string;
    actionTitle: string;
    time: string;
    details: string;
    status: 'success' | 'warning' | 'info';
  } | null>(null);

  // Live Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const activeWorkers = workers.filter((w) => !w.isArchived);

  // Match worker by shortCode, ID, nationalId, or Name
  const cleanInput = inputCode.trim().toLowerCase();
  const matchedWorker = activeWorkers.find(
    (w) =>
      w.shortCode.toLowerCase() === cleanInput ||
      w.id.toLowerCase() === cleanInput ||
      w.nationalId === cleanInput ||
      w.name.toLowerCase() === cleanInput
  );

  // Live Clock & Today String
  const [currentTime, setCurrentTime] = useState<string>('');
  const [todayFormatted, setTodayFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setTodayFormatted(
        new Intl.DateTimeFormat('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to parse Arabic/English time string to minutes since midnight
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 8 * 60; // Default 08:00 AM (480 mins)
    const isPM = timeStr.includes('م') || timeStr.toLowerCase().includes('pm');
    const isAM = timeStr.includes('ص') || timeStr.toLowerCase().includes('am');
    const clean = timeStr.replace(/[^\d:]/g, '').trim();
    const parts = clean.split(':');
    let hours = parseInt(parts[0], 10) || 8;
    const minutes = parseInt(parts[1], 10) || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Get worker's current log for today
  const getWorkerTodayLog = (workerId: string): AttendanceLog | undefined => {
    return attendanceLogs.find(
      (l) => l.workerId === workerId && l.date === todayStr
    );
  };

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Numpad clicks
  const handleNumpadPress = (val: string) => {
    if (val === 'CLEAR') {
      setInputCode('');
    } else if (val === 'BACK') {
      setInputCode((prev) => prev.slice(0, -1));
    } else {
      if (inputCode.length < 10) {
        setInputCode((prev) => prev + val);
      }
    }
  };

  // Audio-visual success feedback
  const triggerSuccessFeedback = (
    title: string,
    details: string,
    type: 'success' | 'warning' | 'info'
  ) => {
    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }

    setRecentNotification({
      workerName: title,
      actionTitle:
        selectedAction === 'check_in'
          ? 'تسجيل حضور'
          : selectedAction === 'check_out'
          ? 'تسجيل انصراف'
          : selectedAction === 'permission_exit'
          ? 'تسجيل خروج إذن'
          : 'تسجيل عودة من الإذن',
      time: currentTime || 'الآن',
      details,
      status: type,
    });
  };

  // Process Attendance
  const handleProcessAttendance = (
    targetWorker: Worker,
    actionOverride?: typeof selectedAction
  ) => {
    const action = actionOverride || selectedAction;
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const existingLog = getWorkerTodayLog(targetWorker.id);
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    const currentMinutes = nowHour * 60 + nowMinute;

    let delayMinutes = 0;
    if (action === 'check_in') {
      // Compare with worker's own assigned shift start time (+5 mins grace period)
      const workerShiftStartMinutes = parseTimeToMinutes(targetWorker.shiftStart);
      if (currentMinutes > workerShiftStartMinutes + 5) {
        delayMinutes = currentMinutes - workerShiftStartMinutes;
      }
    }

    const deductionAmount = parseFloat((delayMinutes * (Number(targetWorker.minuteRate) || 0)).toFixed(2));

    if (action === 'check_in') {
      const newLog: AttendanceLog = {
        id: existingLog ? existingLog.id : `LOG-${Date.now()}`,
        workerId: targetWorker.id,
        date: todayStr,
        checkIn: formattedTime,
        checkOut: existingLog?.checkOut || null,
        delayMinutes: delayMinutes,
        permitType: null,
        isPermitted: false,
        workedHours: 8.0,
        deductionAmount: deductionAmount,
        status: delayMinutes > 5 ? 'late' : 'present',
        gate: gate,
        recordedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        recordedById: currentUser.id,
        method: activeTab === 'scanner' ? 'qr' : 'manual_code',
      };

      const msg =
        delayMinutes > 5
          ? `تم توثيق الحضور بتأخير ${delayMinutes} دقيقة عن الوردية (${targetWorker.shiftStart}) - خصم ${deductionAmount} ج.م`
          : `حضور منضبط في موعد الوردية تماماً (${targetWorker.shiftStart})`;

      onUpdateAttendance(newLog, targetWorker, msg);
      triggerSuccessFeedback(targetWorker.name, msg, delayMinutes > 5 ? 'warning' : 'success');
      setInputCode('');
    } else if (action === 'check_out') {
      // Calculate actual hours worked between checkIn and checkOut
      let calculatedHours = 8.0;
      if (existingLog?.checkIn) {
        const checkInMinutes = parseTimeToMinutes(existingLog.checkIn);
        if (currentMinutes > checkInMinutes) {
          calculatedHours = parseFloat(((currentMinutes - checkInMinutes) / 60).toFixed(1));
        }
      }

      const newLog: AttendanceLog = {
        id: existingLog ? existingLog.id : `LOG-${Date.now()}`,
        workerId: targetWorker.id,
        date: todayStr,
        checkIn: existingLog?.checkIn || targetWorker.shiftStart || '08:00 ص',
        checkOut: formattedTime,
        delayMinutes: existingLog?.delayMinutes || 0,
        permitType: existingLog?.permitType || null,
        isPermitted: existingLog?.isPermitted || false,
        workedHours: calculatedHours,
        deductionAmount: existingLog?.deductionAmount || 0,
        status: existingLog?.status || 'present',
        gate: gate,
        recordedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        recordedById: currentUser.id,
        method: activeTab === 'scanner' ? 'qr' : 'manual_code',
      };

      const msg = `تم توثيق بصمة الانصراف في تمام الساعة ${formattedTime} (ساعات العمل: ${calculatedHours} س)`;
      onUpdateAttendance(newLog, targetWorker, msg);
      triggerSuccessFeedback(targetWorker.name, msg, 'info');
      setInputCode('');
    } else if (action === 'permission_exit') {
      const newLog: AttendanceLog = {
        id: existingLog ? existingLog.id : `LOG-${Date.now()}`,
        workerId: targetWorker.id,
        date: todayStr,
        checkIn: existingLog?.checkIn || '08:00 ص',
        checkOut: `${formattedTime} (خروج إذن)`,
        delayMinutes: existingLog?.delayMinutes || 0,
        permitType: permissionType,
        isPermitted: true,
        workedHours: 6.0,
        deductionAmount: existingLog?.deductionAmount || 0,
        status: 'permitted',
        gate: gate,
        recordedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        recordedById: currentUser.id,
        method: activeTab === 'scanner' ? 'qr' : 'manual_code',
        middayExit: formattedTime,
      };

      const msg = `تم توثيق خروج إذن (${permissionType}) في تمام ${formattedTime}`;
      onUpdateAttendance(newLog, targetWorker, msg);
      triggerSuccessFeedback(targetWorker.name, msg, 'warning');
      setInputCode('');
    } else if (action === 'permission_return') {
      const newLog: AttendanceLog = {
        id: existingLog ? existingLog.id : `LOG-${Date.now()}`,
        workerId: targetWorker.id,
        date: todayStr,
        checkIn: existingLog?.checkIn || '08:00 ص',
        checkOut: existingLog?.checkOut || null,
        delayMinutes: existingLog?.delayMinutes || 0,
        permitType: existingLog?.permitType
          ? `${existingLog.permitType} (تمت العودة)`
          : 'عودة من إذن',
        isPermitted: true,
        workedHours: 7.5,
        deductionAmount: existingLog?.deductionAmount || 0,
        status: 'present',
        gate: gate,
        recordedBy: `${currentUser.name} (${currentUser.roleTitle})`,
        recordedById: currentUser.id,
        method: activeTab === 'scanner' ? 'qr' : 'manual_code',
        middayReturn: formattedTime,
      };

      const msg = `تم توثيق عودة العامل للوردية في تمام ${formattedTime}`;
      onUpdateAttendance(newLog, targetWorker, msg);
      triggerSuccessFeedback(targetWorker.name, msg, 'success');
      setInputCode('');
    }
  };

  // Camera QR scanner start/stop
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanIntervalRef.current = window.setInterval(scanFrame, 300);
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable', err);
      setCameraError(
        'تعذر تشغيل الكاميرا (ربما لعدم توفر الصلاحية أو عدم وجود كاميرا متصلة). يمكنك استخدام الكود السريع أو رفع صورة البطاقة.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanFrame = () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA
    ) {
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      try {
        let detectedCode = '';
        if (code.data.startsWith('{')) {
          const parsed = JSON.parse(code.data);
          detectedCode = parsed.c || parsed.id || '';
        } else {
          detectedCode = code.data.trim();
        }

        const foundWorker = activeWorkers.find(
          (w) =>
            w.shortCode.toLowerCase() === detectedCode.toLowerCase() ||
            w.id.toLowerCase() === detectedCode.toLowerCase()
        );

        if (foundWorker) {
          stopCamera();
          handleProcessAttendance(foundWorker);
        }
      } catch (e) {
        console.error('QR decode error', e);
      }
    }
  };

  // Decode QR from uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          try {
            let detectedCode = '';
            if (code.data.startsWith('{')) {
              const parsed = JSON.parse(code.data);
              detectedCode = parsed.c || parsed.id || '';
            } else {
              detectedCode = code.data.trim();
            }

            const foundWorker = activeWorkers.find(
              (w) =>
                w.shortCode.toLowerCase() === detectedCode.toLowerCase() ||
                w.id.toLowerCase() === detectedCode.toLowerCase()
            );

            if (foundWorker) {
              handleProcessAttendance(foundWorker);
            } else {
              alert(`تم قراءة الـ QR بنجاح (${detectedCode}) ولكن لم يتم العثور على عامل بهذا الكود.`);
            }
          } catch {
            alert('تعذر تحليل بيانات الـ QR من الصورة');
          }
        } else {
          alert('لم يتم العثور على رمز QR واضح في الصورة المرفوعة.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Filtered workers for Tab 3
  const departments = Array.from(new Set(activeWorkers.map((w) => w.department)));
  const filteredQuickWorkers = activeWorkers.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'all' || w.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalContainerRef}
        className="relative w-full max-w-5xl bg-[#FAF8F5] rounded-3xl border border-[#E6DDD1] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right font-cairo"
      >
        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E6DDD1] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#006C4A] to-[#0D9488] flex items-center justify-center text-white shadow-md shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-3xl">qr_code_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1E293B]">
                  كود الحضور والانصراف وبصمة الوردية
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#006C4A]/10 text-[#006C4A] text-[11px] font-black animate-pulse">
                  مباشر
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#78716C] font-semibold">
                مسح الـ QR أو إدخال الكود المختصر لتسجيل الحضور والانصراف والاستقطاعات لحظياً
              </p>
            </div>
          </div>

          {/* Supervisor Status & Live Clock & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 mr-auto sm:mr-0">
            <div className="hidden md:flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-[#F5EFE8] border border-[#E2D9CC]">
              <span className="material-symbols-outlined text-[#006C4A] text-sm">person_check</span>
              <div className="text-right">
                <span className="text-[9px] text-[#78716C] font-bold block">المشرف المسؤول:</span>
                <span className="text-xs font-black text-[#1E293B] truncate max-w-[120px] block">
                  {currentUser.name}
                </span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 px-3 sm:px-4 rounded-2xl bg-[#1E293B] text-white flex items-center gap-1.5 sm:gap-2 font-mono">
              <span className="material-symbols-outlined text-amber-400 text-xs sm:text-sm">
                schedule
              </span>
              <span className="text-xs sm:text-sm font-black tracking-wider">
                {currentTime || '08:00:00 ص'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-[#F5EFE8] hover:bg-[#FEE2E2] hover:text-[#DC2626] text-[#57534E] border border-[#E2D9CC] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="إغلاق المحطة (ESC)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS & ACTION SELECTORS */}
        <div className="px-4 sm:px-6 py-3 bg-[#FAF8F5] border-b border-[#E6DDD1] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Method Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('numpad');
                stopCamera();
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'numpad'
                  ? 'bg-[#006C4A] text-white shadow-sm'
                  : 'bg-white text-[#57534E] hover:bg-[#EFE9DF] border border-[#E2D9CC]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">dialpad</span>
              <span>لوحة الأرقام والكود</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('scanner');
                startCamera();
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'scanner'
                  ? 'bg-[#006C4A] text-white shadow-sm'
                  : 'bg-white text-[#57534E] hover:bg-[#EFE9DF] border border-[#E2D9CC]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">photo_camera</span>
              <span>كاميرا الـ QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('quick_list');
                stopCamera();
              }}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'quick_list'
                  ? 'bg-[#006C4A] text-white shadow-sm'
                  : 'bg-white text-[#57534E] hover:bg-[#EFE9DF] border border-[#E2D9CC]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
              <span>قائمة العمال ({activeWorkers.length})</span>
            </button>
          </div>

          {/* Action Selectors (حضور / انصراف / إذن / عودة) */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-[#E2D9CC] overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedAction('check_in')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                selectedAction === 'check_in'
                  ? 'bg-[#006C4A] text-white shadow-xs'
                  : 'text-[#57534E] hover:bg-[#F5EFE8]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">login</span>
              <span>حضور</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('check_out')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                selectedAction === 'check_out'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-[#57534E] hover:bg-[#F5EFE8]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">logout</span>
              <span>انصراف</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('permission_exit')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                selectedAction === 'permission_exit'
                  ? 'bg-[#C2410C] text-white shadow-xs'
                  : 'text-[#57534E] hover:bg-[#F5EFE8]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">timer_off</span>
              <span>خروج إذن</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedAction('permission_return')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                selectedAction === 'permission_return'
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-[#57534E] hover:bg-[#F5EFE8]'
              }`}
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>
              <span>عودة</span>
            </button>
          </div>
        </div>

        {/* RECENT NOTIFICATION ALERT BANNER */}
        {recentNotification && (
          <div className="p-3.5 px-6 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#006C4A] text-white flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-lg">check_circle</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#006C4A]">
                    {recentNotification.actionTitle} بنجاح:
                  </span>
                  <span className="text-sm font-black text-[#1E293B]">
                    {recentNotification.workerName}
                  </span>
                  <span className="text-[10px] text-[#78716C] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {recentNotification.time}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#047857] mt-0.5">
                  {recentNotification.details}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecentNotification(null)}
              className="text-[#047857] hover:text-[#065F46] p-1 rounded-lg hover:bg-emerald-100"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT BODY */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* ======================================================== */}
          {/* TAB 1: NUMPAD & MANUAL INPUT */}
          {/* ======================================================== */}
          {activeTab === 'numpad' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Code Input & Numpad */}
              <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-[#E6DDD1] shadow-sm flex flex-col items-center">
                <div className="w-full mb-3 text-right">
                  <label className="text-xs font-black text-[#1E293B] block mb-1.5">
                    اكتب كود العامل السريع (أو اختر من الأزرار السريعة):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && matchedWorker) {
                          handleProcessAttendance(matchedWorker);
                        }
                      }}
                      placeholder="اكتب الرقم هنا (مثلاً: 101)"
                      className="w-full text-center text-2xl sm:text-3xl font-black font-mono tracking-widest p-3 rounded-2xl border-2 border-[#D6CEBF] bg-[#FAF8F5] text-[#1E293B] outline-none focus:border-[#006C4A] shadow-inner"
                      autoFocus
                    />
                    {inputCode && (
                      <button
                        type="button"
                        onClick={() => setInputCode('')}
                        className="absolute left-3 top-3 p-1 text-[#A8A29E] hover:text-[#DC2626]"
                        title="مسح"
                      >
                        <span className="material-symbols-outlined text-lg">cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* On-Screen Numeric Keypad */}
                <div className="w-full max-w-xs grid grid-cols-3 gap-2 sm:gap-2.5 mb-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleNumpadPress(btn)}
                      className={`h-12 sm:h-14 rounded-2xl text-base sm:text-lg font-black font-mono flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer ${
                        btn === 'CLEAR'
                          ? 'bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-xs'
                          : btn === 'BACK'
                          ? 'bg-[#F5EFE8] hover:bg-[#EBE3D8] text-[#57534E]'
                          : 'bg-[#FAF8F5] hover:bg-[#006C4A] hover:text-white text-[#1E293B] border border-[#E2D9CC]'
                      }`}
                    >
                      {btn === 'BACK' ? (
                        <span className="material-symbols-outlined text-base">backspace</span>
                      ) : btn === 'CLEAR' ? (
                        'مسح C'
                      ) : (
                        btn
                      )}
                    </button>
                  ))}
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  disabled={!matchedWorker}
                  onClick={() => matchedWorker && handleProcessAttendance(matchedWorker)}
                  className={`w-full py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md ${
                    matchedWorker
                      ? 'bg-[#006C4A] hover:bg-[#005238] text-white active:scale-98 cursor-pointer'
                      : 'bg-[#E2D9CC] text-[#8C8275] cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">how_to_reg</span>
                  <span>
                    {selectedAction === 'check_in' && 'تأكيد تسجيل الحضور الآن'}
                    {selectedAction === 'check_out' && 'تأكيد تسجيل الانصراف الآن'}
                    {selectedAction === 'permission_exit' && 'توثيق خروج إذن بنصف اليوم'}
                    {selectedAction === 'permission_return' && 'توثيق عودة من الإذن'}
                  </span>
                </button>
              </div>

              {/* Right Column: Worker Info / Match Panel */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {matchedWorker ? (
                  <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#006C4A] shadow-md animate-in fade-in zoom-in-95">
                    {/* Header Details */}
                    <div className="flex items-start justify-between pb-4 border-b border-[#F5EFE8] gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#006C4A]/10 border-2 border-[#006C4A] text-[#006C4A] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-2xl sm:text-3xl">person</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-[#1E293B]">
                              {matchedWorker.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-black font-black font-mono text-xs">
                              #{matchedWorker.shortCode}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#006C4A] mt-0.5">
                            {matchedWorker.role}
                          </p>
                          <p className="text-[11px] text-[#78716C]">
                            {matchedWorker.department} • {matchedWorker.line}
                          </p>
                        </div>
                      </div>

                      {onOpenCard && (
                        <button
                          type="button"
                          onClick={() => onOpenCard(matchedWorker)}
                          className="p-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F5EFE8] text-[#006C4A] border border-[#E2D9CC] flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
                          title="عرض بطاقة الـ QR والطباعة"
                        >
                          <span className="material-symbols-outlined text-sm">badge</span>
                          <span className="hidden sm:inline">البطاقة</span>
                        </button>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 my-4 text-center">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1]">
                        <span className="text-[10px] text-[#78716C] block">الوردية</span>
                        <span className="text-[11px] sm:text-xs font-black text-[#1E293B]">
                          {matchedWorker.shiftStart} - {matchedWorker.shiftEnd}
                        </span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1]">
                        <span className="text-[10px] text-[#78716C] block">أجر الدقيقة</span>
                        <span className="text-[11px] sm:text-xs font-black text-[#006C4A]">
                          {matchedWorker.minuteRate} ج.م
                        </span>
                      </div>
                      <div className="p-2 sm:p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1]">
                        <span className="text-[10px] text-[#78716C] block">سجل اليوم</span>
                        <span
                          className={`text-[11px] sm:text-xs font-black ${
                            getWorkerTodayLog(matchedWorker.id)?.status === 'present'
                              ? 'text-[#006C4A]'
                              : getWorkerTodayLog(matchedWorker.id)?.status === 'late'
                              ? 'text-[#C2410C]'
                              : 'text-[#78716C]'
                          }`}
                        >
                          {getWorkerTodayLog(matchedWorker.id)?.checkIn
                            ? `حضر ${getWorkerTodayLog(matchedWorker.id)?.checkIn}`
                            : 'لم يسجل بعد'}
                        </span>
                      </div>
                    </div>

                    {/* Permission Type Picker */}
                    {selectedAction === 'permission_exit' && (
                      <div className="p-3 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] mb-3">
                        <label className="text-xs font-bold text-[#B45309] block mb-1">
                          سبب وتصنيف إذن منتصف اليوم:
                        </label>
                        <select
                          value={permissionType}
                          onChange={(e) => setPermissionType(e.target.value)}
                          className="w-full p-2 rounded-xl bg-white border border-[#FCD34D] text-xs font-bold text-[#1E293B] outline-none"
                        >
                          <option value="مهمة عمل خارجية رسمية">
                            مهمة عمل خارجية رسمية (غير مقتطعة)
                          </option>
                          <option value="كشف وفحص بعيادة المصنع">
                            كشف وفحص بعيادة المصنع (مأذون طبي)
                          </option>
                          <option value="مشوار شخصي طارئ (ساعتين)">
                            مشوار شخصي طارئ (ساعتين)
                          </option>
                          <option value="ظرف عائلي طارئ">ظرف عائلي طارئ</option>
                          <option value="خروج مؤقت لإصلاح معدات">
                            خروج مؤقت لإصلاح معدات
                          </option>
                        </select>
                      </div>
                    )}

                    {/* Gate Selection */}
                    <div className="flex items-center justify-between text-xs pt-2">
                      <span className="font-bold text-[#57534E]">البوابة المعتمدة:</span>
                      <select
                        value={gate}
                        onChange={(e) => setGate(e.target.value)}
                        className="p-1.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#E6DDD1] text-xs font-bold text-[#1E293B]"
                      >
                        <option value="بوابة أفراد (أ)">بوابة أفراد (أ)</option>
                        <option value="بوابة أفراد (ب)">بوابة أفراد (ب)</option>
                        <option value="البوابة الرئيسية">البوابة الرئيسية</option>
                        <option value="بوابة الطوارئ والشحن">بوابة الطوارئ والشحن</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-dashed border-[#D6CEBF] flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-[#78716C] flex items-center justify-center mb-2.5">
                      <span className="material-symbols-outlined text-2xl">pin</span>
                    </div>
                    <h4 className="text-sm font-black text-[#1E293B] mb-1">
                      في انتظار إدخال كود العامل
                    </h4>
                    <p className="text-xs text-[#78716C] max-w-xs leading-relaxed">
                      اكتب الكود القصير للعامل (مثل 101 أو 102) أو اضغط على أي عامل في القائمة أدناه:
                    </p>

                    {/* Quick Suggestions */}
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-h-36 overflow-y-auto p-1">
                      {activeWorkers.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setInputCode(w.shortCode)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#006C4A] hover:text-white border border-[#E2D9CC] text-xs font-bold text-[#57534E] transition-colors cursor-pointer"
                        >
                          #{w.shortCode} {w.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini Today Status Summary */}
                <div className="p-3.5 sm:p-4 bg-[#F5EFE8] rounded-2xl border border-[#E2D9CC] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-[#78716C] block">إجمالي المسجلين اليوم:</span>
                    <span className="text-xs sm:text-sm font-black text-[#006C4A]">
                      {attendanceLogs.filter((l) => l.checkIn).length} من {activeWorkers.length} عامل
                    </span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[11px] text-[#78716C] block">التاريخ المعتمد:</span>
                    <span className="text-xs sm:text-sm font-black text-[#1E293B]">
                      {todayFormatted || todayStr}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: LIVE CAMERA QR SCANNER */}
          {/* ======================================================== */}
          {activeTab === 'scanner' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E6DDD1] flex flex-col items-center text-center">
              <h3 className="text-base font-black text-[#1E293B] mb-1">
                ماسح الـ QR كود المباشر عبر الكاميرا
              </h3>
              <p className="text-xs text-[#78716C] mb-4 max-w-md">
                وجّه كاميرا الجهاز نحو بطاقة العامل للتحضير التلقائي الفوري، أو ارفع صورة البطاقة
              </p>

              {/* Camera Video Viewport */}
              <div className="relative w-full max-w-sm aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-4 border-[#006C4A] flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Laser Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="w-48 h-48 border-2 border-white/70 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400"></div>
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400"></div>
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400"></div>
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400"></div>
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-400 opacity-90 animate-pulse"></div>
                    </div>
                  </div>
                )}

                {!isCameraActive && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-white">
                    <span className="material-symbols-outlined text-4xl text-amber-400 mb-2">
                      videocam_off
                    </span>
                    <p className="text-xs font-bold mb-3 max-w-xs text-center leading-relaxed">
                      {cameraError || 'الكاميرا متوقفة حالياً. اضغط للتشغيل أو استخدم رفع الصورة'}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">videocam</span>
                      <span>تشغيل الكاميرا</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Alternative Image Upload & Fast Simulation Buttons */}
              <div className="mt-5 w-full max-w-md flex flex-col gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F5EFE8] text-[#1E293B] border border-[#E2D9CC] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm text-[#006C4A]">
                      upload_file
                    </span>
                    <span>مسح صورة QR من الجهاز</span>
                  </button>

                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 rounded-xl bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">stop</span>
                      <span>إيقاف الكاميرا</span>
                    </button>
                  )}
                </div>

                {/* One-click quick test simulation for all workers */}
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E6DDD1] text-right">
                  <span className="text-[11px] font-bold text-[#57534E] block mb-2">
                    أو اختر عاملاً للتحضير الفوري بنقرة واحدة:
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-start max-h-32 overflow-y-auto p-1">
                    {activeWorkers.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleProcessAttendance(w)}
                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#006C4A] hover:text-white border border-[#D6CEBF] text-[11px] font-bold text-[#1E293B] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">qr_code</span>
                        <span>
                          {w.name.split(' ')[0]} (#{w.shortCode})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FAST WORKERS ROSTER */}
          {/* ======================================================== */}
          {activeTab === 'quick_list' && (
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#E6DDD1]">
              {/* Search & Department Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، الكود (#101)، المهنة، أو القسم..."
                      className="w-full p-2.5 pr-9 pl-4 rounded-xl border border-[#D6CEBF] bg-[#FAF8F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#006C4A]"
                    />
                    <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-base text-[#78716C]">
                      search
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="p-2 rounded-xl bg-[#FAF8F5] border border-[#D6CEBF] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="all">جميع الأقسام ({activeWorkers.length})</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <div className="text-xs text-[#78716C] font-bold whitespace-nowrap">
                    المعروض: {filteredQuickWorkers.length}
                  </div>
                </div>
              </div>

              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto p-1">
                {filteredQuickWorkers.map((worker) => {
                  const log = getWorkerTodayLog(worker.id);
                  const isCheckedIn = !!log?.checkIn;
                  const isCheckedOut = !!log?.checkOut;

                  return (
                    <div
                      key={worker.id}
                      className="p-3.5 rounded-2xl bg-[#FAF8F5] hover:bg-white border border-[#E6DDD1] hover:border-[#006C4A] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-[#006C4A]/10 text-[#006C4A] border border-[#006C4A]/20 flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-lg">person</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-[#1E293B]">{worker.name}</h4>
                              <span className="px-1.5 py-0.2 rounded bg-amber-300 text-black font-mono font-black text-[10px]">
                                #{worker.shortCode}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#006C4A] font-bold mt-0.5">
                              {worker.role}
                            </p>
                            <p className="text-[9px] text-[#78716C]">{worker.department}</p>
                          </div>
                        </div>

                        {onOpenCard && (
                          <button
                            type="button"
                            onClick={() => onOpenCard(worker)}
                            className="p-1 rounded-lg hover:bg-[#F5EFE8] text-[#78716C] hover:text-[#006C4A] cursor-pointer"
                            title="عرض البطاقة"
                          >
                            <span className="material-symbols-outlined text-base">badge</span>
                          </button>
                        )}
                      </div>

                      {/* Attendance Status Badge */}
                      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-[#E6DDD1]/60">
                        <span className="text-[#78716C]">حالة الوردية:</span>
                        {isCheckedIn ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#006C4A]/10 text-[#006C4A] font-bold">
                            حضر {log.checkIn}{' '}
                            {log.delayMinutes > 0 && `(تأخير ${log.delayMinutes}د)`}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] font-bold">
                            لم يسجل بعد
                          </span>
                        )}
                      </div>

                      {/* Fast Check-In / Check-Out Buttons */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleProcessAttendance(worker, 'check_in')}
                          className="py-1.5 rounded-xl bg-[#006C4A] hover:bg-[#005238] text-white text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-xs">login</span>
                          <span>حضور</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProcessAttendance(worker, 'check_out')}
                          className="py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-xs">logout</span>
                          <span>انصراف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
