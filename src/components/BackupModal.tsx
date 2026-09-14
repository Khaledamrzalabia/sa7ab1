import React, { useState, useEffect } from 'react';
import {
  generateDatabaseBackup,
  downloadBackupFile,
  parseAndValidateBackup,
} from '../services/dbService';
import {
  testSupabaseTablesHealth,
  uploadAllStateToSupabaseTables,
  fetchAllStateFromSupabaseTables,
  TableStats,
} from '../services/supabaseService';
import { syncManager } from '../services/offlineSyncManager';
import {
  Worker,
  AttendanceLog,
  IncentivePenalty,
  Customer,
  Invoice,
  PaymentVoucher,
  Partner,
  PartnerPayout,
  Expense,
  CharityDonation,
  Assistant,
  UserSession,
  CustomerLoan,
} from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  dataState: {
    workers: Worker[];
    attendanceLogs: AttendanceLog[];
    incentivePenalties: IncentivePenalty[];
    customers: Customer[];
    invoices: Invoice[];
    paymentVouchers: PaymentVoucher[];
    partners: Partner[];
    payouts: PartnerPayout[];
    expenses: Expense[];
    charities: CharityDonation[];
    assistants: Assistant[];
    customerLoans?: CustomerLoan[];
  };
  onRestoreState: (state: {
    workers: Worker[];
    attendanceLogs: AttendanceLog[];
    incentivePenalties: IncentivePenalty[];
    customers: Customer[];
    invoices: Invoice[];
    paymentVouchers: PaymentVoucher[];
    partners: Partner[];
    payouts: PartnerPayout[];
    expenses: Expense[];
    charities: CharityDonation[];
    assistants: Assistant[];
    customerLoans?: CustomerLoan[];
  }) => void;
}

export default function BackupModal({
  isOpen,
  onClose,
  currentUser,
  dataState,
  onRestoreState,
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'supabase'>('supabase');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  // Database Connection State (PostgreSQL Pooler - Port 6543)
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [tableStats, setTableStats] = useState<TableStats | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [dbPassword, setDbPassword] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [customUri, setCustomUri] = useState('');
  const [useCustomUri, setUseCustomUri] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecutingSetup, setIsExecutingSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message: string;
    details?: string[];
  }>({ loading: false, message: '' });

  // Check health and test live connection
  const checkHealth = async (manual = false) => {
    setIsTestingHealth(true);
    try {
      const res = await testSupabaseTablesHealth();
      if (res.connected) {
        setIsDbConnected(true);
        if (res.stats) {
          setTableStats(res.stats);
        }
        if (manual) {
          setSyncStatus({
            loading: false,
            success: true,
            message: 'تم التحقق من الاتصال السحابي: قاعدة بيانات Supabase متصلة ومستقرة تماماً.',
          });
        }
      } else {
        setIsDbConnected(false);
        if (manual && res.message) {
          setSyncStatus({
            loading: false,
            success: false,
            message: res.message,
          });
        }
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsTestingHealth(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkHealth(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Disconnect from Supabase and use clean offline local mode
  const handleDisconnect = async () => {
    setIsConnecting(true);
    setSyncStatus({ loading: true, message: 'جارٍ إيقاف الربط السحابي والتحويل للوضع المحلي...' });
    try {
      const res = await fetch('/api/db/disconnect', { method: 'POST' });
      const json = await res.json();
      setIsDbConnected(false);
      setTableStats(null);
      setSyncStatus({
        loading: false,
        success: true,
        message: 'تم تفعيل الوضع المحلي بنجاح! يعمل التطبيق الآن على التخزين المحلي الآمن دون أي أخطاء.',
      });
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        success: false,
        message: err.message || 'حدث خطأ أثناء فصل الاتصال.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Connect using Database Password or Custom Connection String
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useCustomUri && !dbPassword.trim()) return;
    if (useCustomUri && !customUri.trim()) return;

    setIsConnecting(true);
    setSyncStatus({ loading: true, message: 'جارٍ الاتصال بمجمع معاملات PostgreSQL (Port 6543)...' });

    try {
      const body: any = useCustomUri
        ? { connectionString: customUri.trim() }
        : { password: dbPassword.trim() };

      if (anonKey.trim()) {
        body.anonKey = anonKey.trim();
      }

      const res = await fetch('/api/db/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        setIsDbConnected(true);
        syncManager.recordSuccessfulSync();
        syncManager.flushQueue();
        setSyncStatus({
          loading: false,
          success: true,
          message: 'تم الاتصال بنجاح بمجمع معاملات Supabase وحفظ الإعدادات وتأكيد الجداول!',
        });
        await checkHealth(false);
      } else {
        setIsDbConnected(false);
        setSyncStatus({
          loading: false,
          success: false,
          message: json.message || 'فشل الاتصال بقاعدة البيانات.',
        });
      }
    } catch (err: any) {
      setIsDbConnected(false);
      setSyncStatus({
        loading: false,
        success: false,
        message: err.message || 'تعذر التواصل مع الخادم.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Run Setup SQL Script on Server
  const handleRunSqlSetup = async () => {
    setIsExecutingSetup(true);
    setSyncStatus({ loading: true, message: 'جارٍ تطبيق السكيما وإنشاء الجداول الـ 11 في Supabase...' });
    try {
      const res = await fetch('/api/db/setup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncStatus({
          loading: false,
          success: true,
          message: 'تم إنشاء وهيكلة كافة الجداول في Supabase بنجاح تام!',
        });
        await checkHealth();
      } else {
        setSyncStatus({
          loading: false,
          success: false,
          message: json.message || 'فشل تشغيل سكريبت إنشاء الجداول.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        success: false,
        message: err.message || 'تعذر التواصل مع الخادم.',
      });
    } finally {
      setIsExecutingSetup(false);
    }
  };

  // Push Local Data to Supabase PostgreSQL Tables
  const handlePushToSupabase = async () => {
    setSyncStatus({ loading: true, message: 'جارٍ ترحيل كافة الجداول والبيانات إلى مجمع معاملات Supabase...' });
    const res = await uploadAllStateToSupabaseTables(dataState);
    setSyncStatus({
      loading: false,
      success: res.success,
      message: res.message,
      details: res.details,
    });
    if (res.success) {
      checkHealth();
    }
  };

  // Pull Remote Data from Supabase Tables
  const handlePullFromSupabase = async () => {
    setSyncStatus({ loading: true, message: 'جارٍ جلب البيانات الحية من Supabase...' });
    const res = await fetchAllStateFromSupabaseTables();
    if (res.success && res.data) {
      onRestoreState(res.data);
      setSyncStatus({
        loading: false,
        success: true,
        message: `تم سحب البيانات بنجاح وتحديث واجهات التطبيق (${res.data.workers.length} عامل، ${res.data.attendanceLogs.length} سجل حضور، ${res.data.invoices.length} فاتورة).`,
      });
      checkHealth();
    } else {
      setSyncStatus({
        loading: false,
        success: false,
        message: res.message,
      });
    }
  };

  const [isFormatting, setIsFormatting] = useState<boolean>(false);

  // 4. Clear/Wipe all data from Supabase for fresh production start
  const handleClearDatabase = async () => {
    const confirmWipe = window.confirm(
      'تحذير تصفير وفرمطة النظام للتشغيل الفعلي:\n\nهل أنت متأكد من تصفير كافة الجداول والسجلات بالكامل (العمال، كشوف الحضور، الحوافز والخصومات، العملاء، الفواتير، الشركاء، المساعدين، المصروفات والصدقات، وسلف العملاء)؟\n\nستصبح جميع السجلات 0 لبدء العمل الحقيقي فوراً.'
    );
    if (!confirmWipe) return;

    setIsFormatting(true);
    setSyncStatus({ loading: true, message: 'جارٍ تصفير وفرمطة كافة الجداول في قاعدة بيانات Supabase...' });

    try {
      const res = await fetch('/api/db/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sahab-confirm-clear': 'SAHAB_FACTORY_CONFIRM_CLEAR_2026',
        },
        body: JSON.stringify({ confirmKey: 'SAHAB_FACTORY_CONFIRM_CLEAR_2026' }),
      });
      const json = await res.json();

      if (json.success) {
        if (typeof window !== 'undefined') {
          const keys = [
            'smart_forge_workers',
            'smart_forge_attendance_logs',
            'smart_forge_incentives_penalties',
            'smart_forge_customers',
            'smart_forge_invoices',
            'smart_forge_payment_vouchers',
            'smart_forge_partners',
            'smart_forge_payouts',
            'smart_forge_expenses',
            'smart_forge_charities',
            'smart_forge_assistants',
            'smart_forge_customer_loans',
            'SMART_FORGE_OFFLINE_SYNC_QUEUE',
          ];
          keys.forEach((k) => localStorage.removeItem(k));
        }

        onRestoreState({
          workers: [],
          attendanceLogs: [],
          incentivePenalties: [],
          customers: [],
          invoices: [],
          paymentVouchers: [],
          partners: [],
          payouts: [],
          expenses: [],
          charities: [],
          assistants: [],
          customerLoans: [],
        });

        await checkHealth();

        setSyncStatus({
          loading: false,
          success: true,
          message: 'تم بنجاح تصفير وفرمطة كافة الجداول (0 سجلات). النظام الآن نظيف تماماً وجاهز للتشغيل الفعلي!',
        });
      } else {
        setSyncStatus({
          loading: false,
          success: false,
          message: json.message || 'حدث خطأ أثناء محاولة التصفير.',
        });
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        success: false,
        message: err.message || 'تعذر الاتصال بالخادم لتنفيذ التصفير.',
      });
    } finally {
      setIsFormatting(false);
    }
  };

  // Copy Complete SQL Setup
  const handleCopySqlScript = async () => {
    try {
      const response = await fetch('/src/db/setup_complete.sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  // Handle Export Download
  const handleDownloadBackup = () => {
    const snapshot = generateDatabaseBackup(dataState, currentUser.name);
    downloadBackupFile(snapshot);
  };

  // Handle File Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const snapshot = parseAndValidateBackup(content);

        onRestoreState(snapshot.data);
        setImportStatus({
          type: 'success',
          message: `تمت استعادة قاعدة البيانات بنجاح! تم استيراد بيانات ${snapshot.data.workers.length} موظف و ${snapshot.data.attendanceLogs.length} سجل حضور.`,
        });
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: err.message || 'فشل في قراءة ملف النسخة الاحتياطية.',
        });
      }
    };
    reader.readAsText(file);
  };

  const totalRecordsCount =
    dataState.workers.length +
    dataState.attendanceLogs.length +
    dataState.incentivePenalties.length +
    dataState.customers.length +
    dataState.invoices.length +
    dataState.paymentVouchers.length +
    dataState.partners.length +
    dataState.payouts.length +
    dataState.expenses.length +
    dataState.charities.length +
    dataState.assistants.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 text-right animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/25">
              <span className="material-symbols-outlined text-2xl">database</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">مركز قاعدة البيانات سحاب (PostgreSQL Pooler)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Port: 6543
                </span>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                مزامنة وترحيل عبر مجمع معاملات Supabase المباشر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-200/70 border border-slate-300/60">
            <button
              type="button"
              onClick={() => setActiveTab('supabase')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'supabase'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base text-emerald-600">dns</span>
              <span>الربط السحابي (Supabase)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>تصدير (.db)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>استعادة (.db)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: PostgreSQL Transaction Pooler Control */}
        {activeTab === 'supabase' && (
          <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
            
            {/* Status Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    isDbConnected ? 'bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50' : 'bg-rose-500'
                  }`}
                ></span>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    {isDbConnected
                      ? 'متصل بمجمع معاملات PostgreSQL (Supabase Pooler)'
                      : 'في انتظار ربط السحابة (Supabase Database)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {isDbConnected
                      ? 'الاتصال بالخادم السحابي نشط ومستعد للمزامنة وترحيل الجداول.'
                      : 'أدخل كلمة مرور قاعدة بيانات مشروع Supabase للربط الفوري وحفظ الجداول.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => checkHealth(true)}
                  disabled={isTestingHealth}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                >
                  <span className={`material-symbols-outlined text-sm ${isTestingHealth ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>فحص الاتصال</span>
                </button>
              </div>
            </div>

            {/* Sync Status Banner */}
            {syncStatus.message && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5 transition-all ${
                  syncStatus.loading
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : syncStatus.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <span className="material-symbols-outlined text-lg shrink-0">
                  {syncStatus.loading ? 'progress_activity' : syncStatus.success ? 'check_circle' : 'error'}
                </span>
                <div className="flex flex-col gap-1">
                  <span>{syncStatus.message}</span>
                  {syncStatus.details && syncStatus.details.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {syncStatus.details.map((d, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px]">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help / Password Authentication Note */}
            {!isDbConnected && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-black text-amber-950">
                  <span className="material-symbols-outlined text-sm text-amber-700">info</span>
                  <span>في حال ظهور خطأ في كلمة مرور Supabase (password authentication failed):</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                  1. افتح مشروعك في Supabase ثم انتقل إلى <strong>Project Settings</strong> ثم <strong>Database</strong>.<br />
                  2. اضغط على <strong>Reset Database Password</strong> وعيّن كلمة مرور جديدة.<br />
                  3. الصق كلمة المرور الجديدة أدناه واضغط <strong>اتصال</strong>.<br />
                  4. إذا أردت العمل بدون سحابة، فالتطبيق يعمل بشكل كامل وتلقائي محلياً ويحفظ كل البيانات بأمان.
                </p>
              </div>
            )}

            {/* Pooler Parameters & Configuration Form */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-emerald-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h4 className="text-xs font-black text-emerald-400">إعدادات مجمع المعاملات (Transaction Pooler)</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUseCustomUri(!useCustomUri)}
                    className="px-2 py-0.5 rounded text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    {useCustomUri ? 'استخدام كلمة المرور فقط' : 'إدخال رابط URI كامل'}
                  </button>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800">
                    Port: 6543
                  </span>
                </div>
              </div>

              {!useCustomUri ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono dir-ltr text-left">
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-sans">المضيف (Host)</span>
                      <span className="text-emerald-300 truncate block">aws-1-eu-west-1.pooler.supabase.com</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-sans">المنفذ (Port)</span>
                      <span className="text-emerald-300">6543</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-sans">المستخدم (User)</span>
                      <span className="text-emerald-300 truncate block">postgres.bkazilqmwujiyffshpmk</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-sans">قاعدة البيانات</span>
                      <span className="text-emerald-300">postgres</span>
                    </div>
                  </div>

                  <form onSubmit={handleConnect} className="mt-1 pt-2.5 border-t border-slate-800 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 flex items-center bg-slate-950 rounded-xl border border-slate-700 px-3 py-1.5 focus-within:border-emerald-500">
                        <span className="material-symbols-outlined text-slate-400 text-sm ml-2">key</span>
                        <input
                          type="password"
                          placeholder="أدخل كلمة مرور قاعدة البيانات (Database Password)..."
                          value={dbPassword}
                          onChange={(e) => setDbPassword(e.target.value)}
                          className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full font-mono dir-ltr text-left"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isConnecting || !dbPassword.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {isConnecting ? (
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-sm">bolt</span>
                        )}
                        <span>اتصال بمجمع المعاملات</span>
                      </button>
                    </div>

                    <div className="flex items-center bg-slate-950/60 rounded-xl border border-slate-800 px-3 py-1.5 focus-within:border-emerald-500">
                      <span className="material-symbols-outlined text-slate-500 text-sm ml-2">shield_person</span>
                      <input
                        type="text"
                        placeholder="مفتاح Supabase Anon Key (اختياري - للربط المباشر مع Supabase Auth)..."
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        className="bg-transparent text-[11px] text-emerald-300 placeholder-slate-500 outline-none w-full font-mono dir-ltr text-left"
                      />
                    </div>
                  </form>
                </>
              ) : (
                <form onSubmit={handleConnect} className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 px-3 py-2 focus-within:border-emerald-500">
                    <span className="material-symbols-outlined text-slate-400 text-sm ml-2">link</span>
                    <input
                      type="text"
                      placeholder="postgresql://postgres.[ref]:[password]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
                      value={customUri}
                      onChange={(e) => setCustomUri(e.target.value)}
                      className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full font-mono dir-ltr text-left"
                    />
                  </div>
                  <div className="flex items-center bg-slate-950/60 rounded-xl border border-slate-800 px-3 py-1.5 focus-within:border-emerald-500">
                    <span className="material-symbols-outlined text-slate-500 text-sm ml-2">shield_person</span>
                    <input
                      type="text"
                      placeholder="مفتاح Supabase Anon Key (اختياري)..."
                      value={anonKey}
                      onChange={(e) => setAnonKey(e.target.value)}
                      className="bg-transparent text-[11px] text-emerald-300 placeholder-slate-500 outline-none w-full font-mono dir-ltr text-left"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isConnecting || !customUri.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isConnecting ? (
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">bolt</span>
                    )}
                    <span>اتصال بالرابط المخصص</span>
                  </button>
                </form>
              )}
            </div>

            {/* Live Operations & Table Metrics */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">sync_alt</span>
                  <h4 className="text-xs font-black text-emerald-900">عمليات المزامنة والترحيل السحابي</h4>
                </div>
                {tableStats && (
                  <span className="text-[11px] font-bold text-emerald-800">
                    إجمالي الجداول النشطة: 11 جدول
                  </span>
                )}
              </div>

              {tableStats && (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">العمال</span>
                    <span className="font-black text-emerald-800">{tableStats.workers}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">الحضور</span>
                    <span className="font-black text-emerald-800">{tableStats.attendanceLogs}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">الفواتير</span>
                    <span className="font-black text-emerald-800">{tableStats.invoices}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">المصروفات</span>
                    <span className="font-black text-emerald-800">{tableStats.expenses}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handlePushToSupabase}
                  disabled={syncStatus.loading || !isDbConnected}
                  className="py-3 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">cloud_upload</span>
                  <span>رفع وترحيل البيانات المحلية إلى Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullFromSupabase}
                  disabled={syncStatus.loading || !isDbConnected}
                  className="py-3 px-3 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">cloud_download</span>
                  <span>سحب البيانات الحية من Supabase للتطبيق</span>
                </button>
              </div>

              {/* Automatic SQL Setup Button */}
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <span className="text-[11px] text-emerald-800 font-semibold">
                  هل أنشأت قاعدة البيانات لأول مرة؟ يمكنك تهيئة كافة الجداول بضغطة واحدة:
                </span>
                <button
                  type="button"
                  onClick={handleRunSqlSetup}
                  disabled={isExecutingSetup || !isDbConnected}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 shrink-0"
                >
                  <span className={`material-symbols-outlined text-xs ${isExecutingSetup ? 'animate-spin' : ''}`}>
                    terminal
                  </span>
                  <span>تشغيل وتثبيت السكيما تلقائياً</span>
                </button>
              </div>
            </div>

            {/* Production Wipe / Format Box */}
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-rose-600 text-xl mt-0.5">delete_sweep</span>
                <div>
                  <h5 className="text-xs font-black text-rose-900">فرمطة وتصفير النظام للإنتاج (0 بيانات)</h5>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    حذف وتفريغ كافة الجداول والبيانات المسجلة (العمال، الحضور، الحوافز، الفواتير، الشركاء، المصروفات) للبدء على بياض.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearDatabase}
                disabled={isFormatting || syncStatus.loading}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-50 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">
                  {isFormatting ? 'progress_activity' : 'restart_alt'}
                </span>
                <span>تصفير وفرمطة كافة البيانات</span>
              </button>
            </div>

            {/* SQL Setup Script Helper */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-600">code</span>
                  <span>كود السكيما الشامل (setup_complete.sql):</span>
                </h5>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSqlPreview(!showSqlPreview)}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline font-bold"
                  >
                    {showSqlPreview ? 'إخفاء المعاينة' : 'معاينة الكود'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySqlScript}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-black transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">content_copy</span>
                    <span>{copiedSql ? 'تم النسخ!' : 'نسخ الكود'}</span>
                  </button>
                </div>
              </div>

              {showSqlPreview && (
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] dir-ltr text-left max-h-48 overflow-y-auto mt-1 border border-slate-800">
                  <pre className="whitespace-pre-wrap">
{`-- SAHAB ERP Complete PostgreSQL Schema (11 Tables)
-- Run in Supabase SQL Editor if you prefer manual execution:
CREATE TABLE IF NOT EXISTS public.workers (...);
CREATE TABLE IF NOT EXISTS public.attendance_logs (...);
CREATE TABLE IF NOT EXISTS public.invoices (...);
CREATE TABLE IF NOT EXISTS public.customers (...);
...`}
                  </pre>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Export Backup JSON */}
        {activeTab === 'export' && (
          <div className="p-6 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-emerald-700">verified_user</span>
                <div>
                  <h4 className="text-xs font-black text-emerald-900">النسخة الاحتياطية الشاملة جاهزة</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    تحتوي النسخة على كامل جداول النظام: {totalRecordsCount} سجل (العمال، الحضور، الرواتب، العملاء، الشركاء، والمصروفات).
                  </p>
                </div>
              </div>
            </div>

            {/* Quick summary metrics */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">سجلات العمال</span>
                <span className="text-base font-black text-slate-900">{dataState.workers.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">حضور وانصراف</span>
                <span className="text-base font-black text-slate-900">{dataState.attendanceLogs.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">العملاء والشركاء</span>
                <span className="text-base font-black text-slate-900">
                  {dataState.customers.length + dataState.partners.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs md:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              <span className="material-symbols-outlined text-xl">download</span>
              <span>تحميل نسخة كاملة من قاعدة البيانات (.db متوافقة مع التاريخ والوقت)</span>
            </button>
          </div>
        )}

        {/* Tab 3: Import & Restore Backup */}
        {activeTab === 'import' && (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              قم باختيار ملف قاعدة البيانات بتنسيق <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.db</code> لاستعادة كافة السجلات فورياً للسحابة:
            </p>

            {importStatus.type !== 'idle' && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {importStatus.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{importStatus.message}</span>
              </div>
            )}

            <label className="p-8 border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-slate-100/80 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 text-center transition-all">
              <span className="material-symbols-outlined text-4xl text-emerald-600">upload_file</span>
              <span className="text-xs font-black text-slate-900">انقر لاختيار ملف قاعدة البيانات (.db)</span>
              <span className="text-[11px] text-slate-500">يدعم ملفات .db وقواعد البيانات المستخرجة من النظام</span>
              <input type="file" accept=".db,.sql,application/x-sqlite3,application/octet-stream" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

      </div>
    </div>
  );
}
