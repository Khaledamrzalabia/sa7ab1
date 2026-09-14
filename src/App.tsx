import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OperationsDashboard from './components/OperationsDashboard';
import IncentivesPenalties from './components/IncentivesPenalties';
import AttendanceLogs from './components/AttendanceLogs';
import EmployeesManagement from './components/EmployeesManagement';
import PayrollLedger from './components/PayrollLedger';
import CustomersSupply from './components/CustomersSupply';
import PartnershipManagement from './components/PartnershipManagement';
import ExpensesManagement from './components/ExpensesManagement';
import CharityManagement from './components/CharityManagement';
import AssistantsManagement from './components/AssistantsManagement';
import QuickAttendanceTerminal from './components/QuickAttendanceTerminal';
import WorkerCardModal from './components/WorkerCardModal';
import LoginPage from './components/LoginPage';
import BackupModal from './components/BackupModal';
import RegularityBonusHub from './components/RegularityBonusHub';
import { syncManager } from './services/offlineSyncManager';
import { authService } from './services/authService';

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
  CustomerLoan,
  UserSession,
} from './types';
import {
  initialWorkers,
  initialAttendanceLogs,
  initialIncentivesPenalties,
  initialCustomers,
  initialInvoices,
  initialPaymentVouchers,
  initialPartners,
  initialPartnerPayouts,
  initialExpenses,
  initialCharities,
  initialAssistants,
  initialCustomerLoans,
  calculateWorkerRates,
} from './data';

const STORAGE_KEYS = {
  CLEAN_V5: 'sahab_erp_clean_zero_production_v5',
  WORKERS: 'smart_forge_workers',
  LOGS: 'smart_forge_attendance_logs',
  INCENTIVES: 'smart_forge_incentives_penalties',
  CUSTOMERS: 'smart_forge_customers',
  INVOICES: 'smart_forge_invoices',
  PAYMENTS: 'smart_forge_payment_vouchers',
  PARTNERS: 'smart_forge_partners',
  PAYOUTS: 'smart_forge_payouts',
  EXPENSES: 'smart_forge_expenses',
  CHARITIES: 'smart_forge_charities',
  ASSISTANTS: 'smart_forge_assistants',
  LOANS: 'smart_forge_customer_loans',
  SESSION: 'smart_forge_active_session',
  LOGGED_IN: 'smart_forge_is_logged_in',
};

// Safe helper to normalize any worker from localStorage or DB
function normalizeWorker(w: any): Worker {
  const baseSalary = Number(w.baseSalary ?? w.base_salary ?? 0);
  const rates = calculateWorkerRates(baseSalary);
  return {
    id: w.id || `worker_${Date.now()}`,
    shortCode: w.shortCode ?? w.short_code ?? '',
    name: w.name ?? '',
    role: w.role ?? '',
    nationalId: w.nationalId ?? w.national_id ?? '',
    department: w.department ?? '',
    line: w.line ?? '',
    baseSalary,
    dailyRate: Number(w.dailyRate ?? w.daily_rate ?? rates.dailyRate),
    hourlyRate: Number(w.hourlyRate ?? w.hourly_rate ?? rates.hourlyRate),
    minuteRate: Number(w.minuteRate ?? w.minute_rate ?? rates.minuteRate),
    shiftStart: w.shiftStart ?? w.shift_start ?? '08:00 ص',
    shiftEnd: w.shiftEnd ?? w.shift_end ?? '04:00 م',
    status: w.status ?? 'active',
    notes: w.notes ?? '',
    discountNotes: w.discountNotes ?? w.discount_notes ?? '',
    manualDiscount: Number(w.manualDiscount ?? w.manual_discount ?? 0),
    hasDiscount: Boolean(w.hasDiscount ?? w.has_discount ?? false),
    bonusNotes: w.bonusNotes ?? w.bonus_notes ?? '',
    manualBonus: Number(w.manualBonus ?? w.manual_bonus ?? 0),
    hasBonus: Boolean(w.hasBonus ?? w.has_bonus ?? false),
    monthlyRegularityBonus: Number(w.monthlyRegularityBonus ?? w.monthly_regularity_bonus ?? 500),
    isArchived: Boolean(w.isArchived ?? w.is_archived ?? false),
  };
}

// Complete Zero-Reset: Wipe all leftover test/demo records from localStorage
if (typeof window !== 'undefined') {
  if (localStorage.getItem(STORAGE_KEYS.CLEAN_V5) !== 'true') {
    localStorage.removeItem(STORAGE_KEYS.WORKERS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.INCENTIVES);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.PARTNERS);
    localStorage.removeItem(STORAGE_KEYS.PAYOUTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.CHARITIES);
    localStorage.removeItem(STORAGE_KEYS.ASSISTANTS);
    localStorage.removeItem(STORAGE_KEYS.LOANS);
    localStorage.setItem(STORAGE_KEYS.CLEAN_V5, 'true');
  }
}

export default function App() {
  // Load or initialize state with clean 0 initial state
  const [workers, setWorkers] = useState<Worker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeWorker);
        }
      }
    } catch {}
    return initialWorkers;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    return saved ? JSON.parse(saved) : initialAttendanceLogs;
  });

  const [incentivePenalties, setIncentivePenalties] = useState<IncentivePenalty[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCENTIVES);
    return saved ? JSON.parse(saved) : initialIncentivesPenalties;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : initialPaymentVouchers;
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARTNERS);
    return saved ? JSON.parse(saved) : initialPartners;
  });

  const [payouts, setPayouts] = useState<PartnerPayout[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYOUTS);
    return saved ? JSON.parse(saved) : initialPartnerPayouts;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [charities, setCharities] = useState<CharityDonation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHARITIES);
    return saved ? JSON.parse(saved) : initialCharities;
  });

  const [assistants, setAssistants] = useState<Assistant[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ASSISTANTS);
    return saved ? JSON.parse(saved) : initialAssistants;
  });

  const [customerLoans, setCustomerLoans] = useState<CustomerLoan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOANS);
    return saved ? JSON.parse(saved) : initialCustomerLoans;
  });

  // Database Connection & Synchronization Status
  const [dbLoading, setDbLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const isInitialLoadDone = useRef<boolean>(false);

  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
    return saved
      ? JSON.parse(saved)
      : {
          type: 'owner',
          id: 'OWNER-01',
          name: 'محمد صلاح',
          username: 'admin',
          roleTitle: 'المدير العام (General Manager)',
          phone: '01098452103',
        };
  });

  // Mobile Menu Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Global Login Portal Status (Requires explicit authentication)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedLoggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN);
    const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    return savedLoggedIn === 'true' && !!savedSession;
  });

  // Active Navigation Screen State
  const [currentScreen, setCurrentScreen] = useState<string>('operations-dashboard');

  // Subscribe to offline/online cloud sync status
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setDbConnected(state.isCloudConnected);
    });
    return () => unsubscribe();
  }, []);

  // Fetch database state from Supabase Transaction Pooler (Port 6543)
  useEffect(() => {
    const fetchDatabaseState = async () => {
      try {
        setDbLoading(true);
        const savedSession = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SESSION) : null;
        const token = savedSession ? (JSON.parse(savedSession)?.token || '') : (currentUser?.token || '');

        const res = await fetch('/api/db/state', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json.success && json.data) {
            syncManager.recordSuccessfulSync();
            setDbConnected(true);
            const d = json.data;
            if (Array.isArray(d.workers)) setWorkers(d.workers.map(normalizeWorker));
            if (Array.isArray(d.attendanceLogs)) setAttendanceLogs(d.attendanceLogs);
            if (Array.isArray(d.incentivePenalties)) setIncentivePenalties(d.incentivePenalties);
            if (Array.isArray(d.customers)) setCustomers(d.customers);
            if (Array.isArray(d.invoices)) setInvoices(d.invoices);
            if (Array.isArray(d.paymentVouchers)) setPaymentVouchers(d.paymentVouchers);
            if (Array.isArray(d.partners)) setPartners(d.partners);
            if (Array.isArray(d.payouts)) setPayouts(d.payouts);
            if (Array.isArray(d.expenses)) setExpenses(d.expenses);
            if (Array.isArray(d.charities)) setCharities(d.charities);
            if (Array.isArray(d.assistants)) setAssistants(d.assistants);
            if (Array.isArray(d.customerLoans)) setCustomerLoans(d.customerLoans);
            return;
          }
        }
        syncManager.checkCloudHealth();
      } catch (err) {
        console.warn('Initial cloud database sync notice:', err);
      } finally {
        setDbLoading(false);
        isInitialLoadDone.current = true;
      }
    };

    fetchDatabaseState();
  }, [isLoggedIn]);

  // Save to localStorage as secondary backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCENTIVES, JSON.stringify(incentivePenalties));
  }, [incentivePenalties]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(paymentVouchers));
  }, [paymentVouchers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners));
  }, [partners]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(payouts));
  }, [payouts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHARITIES, JSON.stringify(charities));
  }, [charities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSISTANTS, JSON.stringify(assistants));
  }, [assistants]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(customerLoans));
  }, [customerLoans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN, String(isLoggedIn));
  }, [isLoggedIn]);

  // Synchronize changes to Supabase PostgreSQL Database (Debounced + Offline Queue)
  useEffect(() => {
    if (!isInitialLoadDone.current || dbLoading) return;

    const timer = setTimeout(async () => {
      const payload = {
        workers,
        attendanceLogs,
        incentivePenalties,
        customers,
        invoices,
        paymentVouchers,
        partners,
        payouts,
        expenses,
        charities,
        assistants,
        customerLoans,
      };

      // If database is not connected, queue changes locally without network overhead
      if (!dbConnected) {
        syncManager.queueSync(payload);
        return;
      }

      try {
        setIsSaving(true);
        syncManager.setSyncing(true);
        const savedSession = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SESSION) : null;
        const token = savedSession ? (JSON.parse(savedSession)?.token || '') : (currentUser?.token || '');

        const res = await fetch('/api/db/migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          syncManager.recordSuccessfulSync();
          setDbConnected(true);
        } else {
          syncManager.queueSync(payload);
          setDbConnected(false);
        }
      } catch (err) {
        console.warn('Auto-sync to database failed, queued locally:', err);
        syncManager.queueSync(payload);
        setDbConnected(false);
      } finally {
        setIsSaving(false);
        syncManager.setSyncing(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    workers,
    attendanceLogs,
    incentivePenalties,
    customers,
    invoices,
    paymentVouchers,
    partners,
    payouts,
    expenses,
    charities,
    assistants,
    customerLoans,
    dbLoading,
  ]);

  // Modal Visibility States
  const [isQuickTerminalOpen, setIsQuickTerminalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [selectedWorkerForCard, setSelectedWorkerForCard] = useState<Worker | null>(null);

  // Unified Navigation Switcher
  const handleNavigate = (screenId: string) => {
    if (screenId === 'quick-attendance') {
      setIsQuickTerminalOpen(true);
      return;
    }
    if (screenId === 'backup') {
      setIsBackupModalOpen(true);
      return;
    }
    setCurrentScreen(screenId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Assistant management handlers
  const handleAddAssistant = (newAssistant: Assistant) => {
    setAssistants((prev) => [newAssistant, ...prev]);
  };

  const handleUpdateAssistant = (updatedAssistant: Assistant) => {
    setAssistants((prev) =>
      prev.map((a) => (a.id === updatedAssistant.id ? updatedAssistant : a))
    );
    if (currentUser.id === updatedAssistant.id) {
      setCurrentUser({
        type: 'assistant',
        id: updatedAssistant.id,
        name: updatedAssistant.name,
        username: updatedAssistant.username,
        roleTitle: updatedAssistant.roleTitle,
        phone: updatedAssistant.phone,
        permissions: updatedAssistant.permissions,
        shift: updatedAssistant.shift,
        gateOrLocation: updatedAssistant.gateOrLocation,
      });
    }
  };

  const handleDeleteAssistant = (id: string) => {
    setAssistants((prev) => prev.filter((a) => a.id !== id));
  };

  // Attendance update from Quick Attendance Terminal
  const handleUpdateAttendance = (newLog: AttendanceLog, worker: Worker, feedbackMsg: string) => {
    setAttendanceLogs((prev) => {
      const exists = prev.some(
        (l) => l.id === newLog.id || (l.workerId === newLog.workerId && l.date === newLog.date)
      );
      if (exists) {
        return prev.map((l) =>
          l.id === newLog.id || (l.workerId === newLog.workerId && l.date === newLog.date)
            ? newLog
            : l
        );
      }
      return [newLog, ...prev];
    });
  };

  // Restore State from Backup
  const handleRestoreState = (restored: {
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
  }) => {
    if (restored.workers) setWorkers(restored.workers);
    if (restored.attendanceLogs) setAttendanceLogs(restored.attendanceLogs);
    if (restored.incentivePenalties) setIncentivePenalties(restored.incentivePenalties);
    if (restored.customers) setCustomers(restored.customers);
    if (restored.invoices) setInvoices(restored.invoices);
    if (restored.paymentVouchers) setPaymentVouchers(restored.paymentVouchers);
    if (restored.partners) setPartners(restored.partners);
    if (restored.payouts) setPayouts(restored.payouts);
    if (restored.expenses) setExpenses(restored.expenses);
    if (restored.charities) setCharities(restored.charities);
    if (restored.assistants) setAssistants(restored.assistants);
    if (restored.customerLoans) setCustomerLoans(restored.customerLoans);
  };

  // Login handler
  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);
    setIsLoggedIn(true);
    authService.saveSession(session);
  };

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
  };

  // Handler to record actual disbursed net payroll as official company expense with Idempotency Guard
  const handleDisbursePayroll = (
    totalNetPayroll: number,
    workersCount: number,
    periodStr?: string,
    payrollRef?: string
  ) => {
    if (totalNetPayroll <= 0) return;
    const now = new Date();
    const period = periodStr || now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
    const receiptRef = payrollRef || `PAYROLL-${now.getFullYear()}-${now.getMonth() + 1}`;
    const expId = `EXP-${receiptRef}`;

    // Prevent duplicate entries in expenses
    if (expenses.some((e) => e.receiptRef === receiptRef || e.id === expId)) {
      alert(`مسير رواتب الفترة (${receiptRef}) مسجل مسبقاً في الخزينة. تم منع تكرار القيد المحاسبي.`);
      return;
    }

    const newExpense: Expense = {
      id: expId,
      type: 'out',
      category: 'رواتب وأجور العمال',
      title: `صرف صافي مسير رواتب شهر (${period}) - عدد ${workersCount} عامل معتمد`,
      amount: totalNetPayroll,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
      paymentMethod: 'cash',
      receiptRef: receiptRef,
      party: 'عمال وكوادر المصنع المعتمدين',
      notes: `تم الصرف الفعلي للصافي من خزينة المصنع بعد استنزال كافة الخصومات والتأخيرات وإضافة الحوافز.`,
      recordedBy: `${currentUser.name} (${currentUser.roleTitle})`,
    };
    setExpenses((prev) => [newExpense, ...prev.filter((e) => e.id !== expId && e.receiptRef !== receiptRef)]);
  };

  // Full Database State Snapshot Bundle for Backups
  const fullDatabaseState = {
    workers,
    attendanceLogs,
    incentivePenalties,
    customers,
    invoices,
    paymentVouchers,
    partners,
    payouts,
    expenses,
    charities,
    assistants,
    customerLoans,
  };

  // If user is not logged in, show the full-page Login Portal
  if (!isLoggedIn) {
    return (
      <LoginPage
        assistants={assistants}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Screen Switchboard
  const renderActiveScreen = () => {
    // Role-based access protection: restricted screens for owner only
    const isOwner = currentUser?.type === 'owner';
    const restrictedScreens = ['assistants', 'partnership', 'expenses', 'charity', 'payroll'];
    if (!isOwner && restrictedScreens.includes(currentScreen)) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-rose-200 shadow-sm text-center font-readex my-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">هذه الشاشة مخصصة للمدير العام فقط</h3>
          <p className="text-xs text-slate-500 font-bold mb-6 max-w-md leading-relaxed">
            حسابك الحالي مسجل بصفة ({currentUser?.roleTitle || 'مشرف وردية'}). للاطلاع على العمليات المالية والرواتب والشراكة، يرجى تسجيل الدخول بحساب المدير العام.
          </p>
          <button
            type="button"
            onClick={() => handleNavigate('operations-dashboard')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            العودة للوحة التشغيل والعمليات
          </button>
        </div>
      );
    }

    switch (currentScreen) {
      case 'operations-dashboard':
        return (
          <OperationsDashboard
            workers={workers}
            attendanceLogs={attendanceLogs}
            incentivePenalties={incentivePenalties}
            onNavigate={handleNavigate}
          />
        );
      case 'assistants':
        return (
          <AssistantsManagement
            assistants={assistants}
            onAddAssistant={handleAddAssistant}
            onUpdateAssistant={handleUpdateAssistant}
            onDeleteAssistant={handleDeleteAssistant}
            currentUser={currentUser}
            onOpenTerminal={() => setIsQuickTerminalOpen(true)}
          />
        );
      case 'employees':
        return (
          <EmployeesManagement
            workers={workers}
            setWorkers={setWorkers}
            incentivePenalties={incentivePenalties}
            setIncentivePenalties={setIncentivePenalties}
            attendanceLogs={attendanceLogs}
            onOpenWorkerCard={(worker) => setSelectedWorkerForCard(worker)}
            onNavigate={(view) => handleNavigate(view)}
          />
        );
      case 'attendance':
        return (
          <AttendanceLogs
            workers={workers}
            attendanceLogs={attendanceLogs}
            setAttendanceLogs={setAttendanceLogs}
            onNavigate={handleNavigate}
            onOpenWorkerCard={(worker) => setSelectedWorkerForCard(worker)}
          />
        );
      case 'incentives-penalties':
        return (
          <IncentivesPenalties
            workers={workers}
            incentivePenalties={incentivePenalties}
            setIncentivePenalties={setIncentivePenalties}
          />
        );
      case 'regularity':
        return (
          <RegularityBonusHub
            workers={workers}
            setWorkers={setWorkers}
            attendanceLogs={attendanceLogs}
            incentivePenalties={incentivePenalties}
            setIncentivePenalties={setIncentivePenalties}
            expenses={expenses}
            setExpenses={setExpenses}
          />
        );
      case 'payroll':
        return (
          <PayrollLedger
            workers={workers}
            setWorkers={setWorkers}
            attendanceLogs={attendanceLogs}
            incentivePenalties={incentivePenalties}
            setIncentivePenalties={setIncentivePenalties}
            expenses={expenses}
            onDisbursePayroll={handleDisbursePayroll}
          />
        );
      case 'customers':
        return (
          <CustomersSupply
            customers={customers}
            setCustomers={setCustomers}
            invoices={invoices}
            setInvoices={setInvoices}
            payments={paymentVouchers}
            setPayments={setPaymentVouchers}
            loans={customerLoans}
            setLoans={setCustomerLoans}
            expenses={expenses}
            setExpenses={setExpenses}
          />
        );
      case 'partnership':
        return (
          <PartnershipManagement
            partners={partners}
            setPartners={setPartners}
            payouts={payouts}
            setPayouts={setPayouts}
          />
        );
      case 'expenses':
        return (
          <ExpensesManagement
            expenses={expenses}
            setExpenses={setExpenses}
          />
        );
      case 'charity':
        return (
          <CharityManagement
            charities={charities}
            setCharities={setCharities}
          />
        );
      default:
        return (
          <OperationsDashboard
            workers={workers}
            attendanceLogs={attendanceLogs}
            incentivePenalties={incentivePenalties}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen vibrant-mesh-bg font-readex relative antialiased text-slate-900 overflow-x-hidden">
      {/* Decorative Ambient Floating Radial Lights for lively depth */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed top-1/3 left-1/3 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-1/4 right-10 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Subtle Dynamic Dot Matrix Overlay */}
      <div className="fixed inset-0 vibrant-dot-pattern pointer-events-none -z-10 opacity-60"></div>

      {/* Right Drawer Industrial Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          handleNavigate(screen);
          setIsMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        onOpenTerminal={() => setIsQuickTerminalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Panel Area */}
      <div className="lg:pr-72 pr-0 min-h-screen flex flex-col relative z-0">
        {/* Top Floating Control Header */}
        <Header
          currentUser={currentUser}
          dbConnected={dbConnected}
          isSaving={isSaving}
          onOpenTerminal={() => setIsQuickTerminalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Content Viewport with RTL padding/margins */}
        <main className="flex-1 pt-20 sm:pt-24 px-3 sm:px-6 lg:px-8 pb-28 lg:pb-12 w-full overflow-x-hidden">
          {/* Active Screen Transition Wrapping */}
          <div className="w-full transition-all duration-300 animate-fade-in">
            {renderActiveScreen()}
          </div>
        </main>

        {/* Mobile Bottom Quick Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-around font-cairo safe-bottom">
          <button
            type="button"
            onClick={() => handleNavigate('operations-dashboard')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              currentScreen === 'operations-dashboard'
                ? 'text-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-xl">dashboard_customize</span>
            <span className="text-[10px] leading-tight font-bold">الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('employees')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              currentScreen === 'employees'
                ? 'text-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-xl">engineering</span>
            <span className="text-[10px] leading-tight font-bold">العمال</span>
          </button>

          {/* Central QR Code Terminal Trigger Floating Button */}
          <button
            type="button"
            onClick={() => setIsQuickTerminalOpen(true)}
            className="flex flex-col items-center justify-center -mt-6 w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/35 border-2 border-white active:scale-95 transition-all"
            aria-label="كود الحضور والانصراف"
          >
            <span className="material-symbols-outlined text-2xl animate-pulse">qr_code_scanner</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('attendance')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
              currentScreen === 'attendance'
                ? 'text-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-xl">badge</span>
            <span className="text-[10px] leading-tight font-bold">الحضور</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-1.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all font-bold"
          >
            <span className="material-symbols-outlined text-xl">apps</span>
            <span className="text-[10px] leading-tight">المزيد</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS */}
      {/* ========================================================================= */}

      {/* 1. Quick Attendance Terminal Modal */}
      {isQuickTerminalOpen && (
        <QuickAttendanceTerminal
          workers={workers}
          attendanceLogs={attendanceLogs}
          currentUser={currentUser}
          onUpdateAttendance={handleUpdateAttendance}
          onClose={() => setIsQuickTerminalOpen(false)}
          onOpenCard={(worker) => setSelectedWorkerForCard(worker)}
        />
      )}

      {/* 2. Worker QR ID Badge & Print Modal */}
      {selectedWorkerForCard && (
        <WorkerCardModal
          worker={selectedWorkerForCard}
          onClose={() => setSelectedWorkerForCard(null)}
        />
      )}

      {/* 3. Full Database Backup & Supabase Sync Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
        dataState={fullDatabaseState}
        onRestoreState={handleRestoreState}
      />
    </div>
  );
}
