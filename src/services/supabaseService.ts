import { getSupabase } from '../lib/supabase';
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
} from '../types';

// ============================================================================
// Mapping Helpers (CamelCase <-> SnakeCase for PostgreSQL Tables)
// ============================================================================

export function mapWorkerToDb(w: Worker) {
  return {
    id: w.id,
    short_code: w.shortCode,
    name: w.name,
    role: w.role,
    national_id: w.nationalId,
    department: w.department,
    line: w.line,
    base_salary: w.baseSalary,
    daily_rate: w.dailyRate,
    hourly_rate: w.hourlyRate,
    minute_rate: w.minuteRate,
    shift_start: w.shiftStart,
    shift_end: w.shiftEnd,
    status: w.status,
    notes: w.notes || '',
    discount_notes: w.discountNotes || '',
    manual_discount: w.manualDiscount || 0,
    has_discount: w.hasDiscount || false,
    bonus_notes: w.bonusNotes || '',
    manual_bonus: w.manualBonus || 0,
    has_bonus: w.hasBonus || false,
    is_archived: w.isArchived || false,
  };
}

export function mapDbToWorker(row: any): Worker {
  return {
    id: row.id,
    shortCode: row.short_code,
    name: row.name,
    role: row.role,
    nationalId: row.national_id,
    department: row.department,
    line: row.line,
    baseSalary: Number(row.base_salary) || 0,
    dailyRate: Number(row.daily_rate) || 0,
    hourlyRate: Number(row.hourly_rate) || 0,
    minuteRate: Number(row.minute_rate) || 0,
    shiftStart: row.shift_start || '08:00 ص',
    shiftEnd: row.shift_end || '04:00 م',
    status: row.status || 'active',
    notes: row.notes || '',
    discountNotes: row.discount_notes || '',
    manualDiscount: Number(row.manual_discount) || 0,
    hasDiscount: Boolean(row.has_discount),
    bonusNotes: row.bonus_notes || '',
    manualBonus: Number(row.manual_bonus) || 0,
    hasBonus: Boolean(row.has_bonus),
    isArchived: Boolean(row.is_archived),
  };
}

export function mapAssistantToDb(a: Assistant) {
  return {
    id: a.id,
    name: a.name,
    username: a.username,
    phone: a.phone,
    password: a.password || '123',
    role_title: a.roleTitle,
    shift: a.shift,
    gate_or_location: a.gateOrLocation,
    status: a.status,
    permissions: a.permissions,
    operations_count: a.operationsCount || 0,
    notes: a.notes || '',
  };
}

export function mapDbToAssistant(row: any): Assistant {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    phone: row.phone,
    password: row.password,
    roleTitle: row.role_title,
    shift: row.shift,
    gateOrLocation: row.gate_or_location,
    status: row.status,
    permissions: row.permissions || {
      canCheckIn: true,
      canCheckOut: true,
      canRecordPermissions: true,
      canAddManualPenalties: true,
      canViewDailySummary: true,
      canPrintCards: true,
    },
    createdAt: row.created_at || new Date().toISOString(),
    operationsCount: Number(row.operations_count) || 0,
    notes: row.notes || '',
  };
}

export function mapAttendanceToDb(att: AttendanceLog) {
  return {
    id: att.id,
    worker_id: att.workerId,
    date: att.date,
    check_in: att.checkIn,
    check_out: att.checkOut,
    delay_minutes: att.delayMinutes || 0,
    permit_type: att.permitType || null,
    is_permitted: att.isPermitted || false,
    worked_hours: att.workedHours || 0,
    deduction_amount: att.deductionAmount || 0,
    status: att.status,
    gate: att.gate,
    recorded_by: att.recordedBy || null,
    recorded_by_id: att.recordedById || null,
    method: att.method || 'qr',
    midday_exit: att.middayExit || null,
    midday_return: att.middayReturn || null,
    midday_minutes: att.middayMinutes || 0,
    notes: att.notes || '',
  };
}

export function mapDbToAttendance(row: any): AttendanceLog {
  return {
    id: row.id,
    workerId: row.worker_id,
    date: row.date,
    checkIn: row.check_in,
    checkOut: row.check_out,
    delayMinutes: Number(row.delay_minutes) || 0,
    permitType: row.permit_type,
    isPermitted: Boolean(row.is_permitted),
    workedHours: Number(row.worked_hours) || 0,
    deductionAmount: Number(row.deduction_amount) || 0,
    status: row.status,
    gate: row.gate,
    recordedBy: row.recorded_by,
    recordedById: row.recorded_by_id,
    method: row.method || 'qr',
    middayExit: row.midday_exit,
    middayReturn: row.midday_return,
    middayMinutes: Number(row.midday_minutes) || 0,
    notes: row.notes || '',
  };
}

export function mapIncentiveToDb(ip: IncentivePenalty) {
  return {
    id: ip.id,
    worker_id: ip.workerId,
    type: ip.type,
    category: ip.category,
    amount: ip.amount,
    calc_mode: ip.calcMode,
    calc_value: ip.calcValue,
    notes: ip.notes || '',
    date: ip.date,
    status: ip.status,
  };
}

export function mapDbToIncentive(row: any): IncentivePenalty {
  return {
    id: row.id,
    workerId: row.worker_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount) || 0,
    calcMode: row.calc_mode || 'fixed',
    calcValue: Number(row.calc_value) || 0,
    notes: row.notes || '',
    date: row.date,
    status: row.status || 'approved-added',
  };
}

export function mapCustomerToDb(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    company_name: c.companyName,
    contact_person: c.contactPerson || null,
    phone: c.phone,
    category: c.category,
    commercial_reg: c.commercialReg || '',
    orders_count: c.ordersCount || 0,
    total_deal: c.totalDeal || 0,
    paid_amount: c.paidAmount || 0,
    due_amount: c.dueAmount || 0,
    credit_limit: c.creditLimit || 0,
    payment_terms: c.paymentTerms || 'سداد نقدي',
    status: c.status || 'active-regular',
    loans_balance: c.loansBalance || 0,
  };
}

export function mapDbToCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    phone: row.phone,
    category: row.category,
    commercialReg: row.commercial_reg || '',
    ordersCount: Number(row.orders_count) || 0,
    totalDeal: Number(row.total_deal) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    dueAmount: Number(row.due_amount) || 0,
    creditLimit: Number(row.credit_limit) || 0,
    paymentTerms: row.payment_terms || 'سداد نقدي',
    status: row.status || 'active-regular',
    loansBalance: Number(row.loans_balance) || 0,
  };
}

export function mapInvoiceToDb(inv: Invoice) {
  return {
    id: inv.id,
    customer_id: inv.customerId,
    date: inv.date,
    time: inv.time || null,
    description: inv.description || '',
    amount: inv.amount,
    paid: inv.paid || 0,
    status: inv.status,
    type: inv.type,
    company_name: inv.companyName || null,
    customer_name: inv.customerName || null,
    items: inv.items || [],
    history: inv.history || [],
  };
}

export function mapDbToInvoice(row: any): Invoice {
  return {
    id: row.id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time,
    description: row.description || '',
    amount: Number(row.amount) || 0,
    paid: Number(row.paid) || 0,
    status: row.status,
    type: row.type,
    companyName: row.company_name,
    customerName: row.customer_name,
    items: Array.isArray(row.items) ? row.items : [],
    history: Array.isArray(row.history) ? row.history : [],
  };
}

export function mapPaymentVoucherToDb(pv: PaymentVoucher) {
  return {
    id: pv.id,
    customer_id: pv.customerId,
    date: pv.date,
    time: pv.time || null,
    amount: pv.amount,
    method: pv.method,
    invoice_id: pv.invoiceId || null,
  };
}

export function mapDbToPaymentVoucher(row: any): PaymentVoucher {
  return {
    id: row.id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time,
    amount: Number(row.amount) || 0,
    method: row.method,
    invoiceId: row.invoice_id,
  };
}

export function mapPartnerToDb(p: Partner) {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    national_id: p.nationalId || null,
    role_title: p.roleTitle,
    capital: p.capital,
    share_percentage: p.sharePercentage,
    join_date: p.joinDate,
    total_profits_withdrawn: p.totalProfitsWithdrawn || 0,
    status: p.status || 'active',
    notes: p.notes || '',
  };
}

export function mapDbToPartner(row: any): Partner {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    nationalId: row.national_id,
    roleTitle: row.role_title,
    capital: Number(row.capital) || 0,
    sharePercentage: Number(row.share_percentage) || 0,
    joinDate: row.join_date,
    totalProfitsWithdrawn: Number(row.total_profits_withdrawn) || 0,
    status: row.status || 'active',
    notes: row.notes || '',
  };
}

export function mapPartnerPayoutToDb(po: PartnerPayout) {
  return {
    id: po.id,
    partner_id: po.partnerId,
    partner_name: po.partnerName,
    date: po.date,
    amount: po.amount,
    period: po.period,
    payment_method: po.paymentMethod,
    notes: po.notes || '',
  };
}

export function mapDbToPartnerPayout(row: any): PartnerPayout {
  return {
    id: row.id,
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    date: row.date,
    amount: Number(row.amount) || 0,
    period: row.period,
    paymentMethod: row.paymentMethod || row.payment_method,
    notes: row.notes || '',
  };
}

export function mapExpenseToDb(exp: Expense) {
  return {
    id: exp.id,
    type: exp.type,
    category: exp.category,
    title: exp.title,
    amount: exp.amount,
    date: exp.date,
    time: exp.time || null,
    payment_method: exp.paymentMethod || 'cash',
    receipt_ref: exp.receiptRef || null,
    party: exp.party,
    notes: exp.notes || '',
    recorded_by: exp.recordedBy || null,
  };
}

export function mapDbToExpense(row: any): Expense {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    amount: Number(row.amount) || 0,
    date: row.date,
    time: row.time,
    paymentMethod: row.payment_method || 'cash',
    receiptRef: row.receipt_ref,
    party: row.party,
    notes: row.notes || '',
    recordedBy: row.recorded_by,
  };
}

export function mapCharityToDb(c: CharityDonation) {
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    amount: c.amount,
    date: c.date,
    time: c.time || null,
    beneficiary: c.beneficiary,
    source: c.source,
    payment_method: c.paymentMethod || 'cash',
    representative: c.representative || null,
    notes: c.notes || '',
  };
}

export function mapDbToCharity(row: any): CharityDonation {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    amount: Number(row.amount) || 0,
    date: row.date,
    time: row.time,
    beneficiary: row.beneficiary,
    source: row.source,
    paymentMethod: row.payment_method || 'cash',
    representative: row.representative,
    notes: row.notes || '',
  };
}

// ============================================================================
// Core Database Sync & Migration Methods (Hybrid Server Pooler + Client REST)
// ============================================================================

export interface TableStats {
  workers: number;
  assistants: number;
  attendanceLogs: number;
  incentivePenalties: number;
  customers: number;
  invoices: number;
  paymentVouchers: number;
  partners: number;
  payouts: number;
  expenses: number;
  charities: number;
}

/**
 * Checks connectivity and counts records across all PostgreSQL tables in Supabase
 * Uses server-side /api/db/health pooler or fallback to client SDK
 */
export async function testSupabaseTablesHealth(): Promise<{
  connected: boolean;
  isPooler?: boolean;
  isAuthError?: boolean;
  message: string;
  stats?: TableStats;
}> {
  // 1. Try server-side PostgreSQL Transaction Pooler API first
  try {
    const res = await fetch('/api/db/health');
    if (res.ok) {
      const json = await res.json();
      if (json.connected && json.stats) {
        return {
          connected: true,
          isPooler: true,
          message: json.message || 'الاتصال المباشر بمجمع معاملات PostgreSQL نشط!',
          stats: {
            workers: json.stats.workers || 0,
            assistants: json.stats.assistants || 0,
            attendanceLogs: json.stats.attendance_logs || 0,
            incentivePenalties: json.stats.incentives_penalties || 0,
            customers: json.stats.customers || 0,
            invoices: json.stats.invoices || 0,
            paymentVouchers: json.stats.payment_vouchers || 0,
            partners: json.stats.partners || 0,
            payouts: json.stats.partner_payouts || 0,
            expenses: json.stats.expenses || 0,
            charities: json.stats.charity_donations || 0,
          },
        };
      }
      if (!json.connected) {
        return {
          connected: false,
          isPooler: true,
          isAuthError: json.isAuthError,
          message: json.message || 'قاعدة البيانات السحابية غير متصلة حالياً. التطبيق يعمل في الوضع المحلي الآمن.',
        };
      }
    }
  } catch {
    // server API not reachable, fallback to client
  }

  // 2. Fallback to Supabase JS Client
  const supabase = getSupabase();
  if (!supabase) {
    return {
      connected: false,
      message: 'لم يتم تكوين رابط ومفتاح Supabase أو DATABASE_URL في التطبيق.',
    };
  }

  try {
    const [
      workersRes,
      assistantsRes,
      attendanceRes,
      incentivesRes,
      customersRes,
      invoicesRes,
      vouchersRes,
      partnersRes,
      payoutsRes,
      expensesRes,
      charityRes,
    ] = await Promise.all([
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      supabase.from('assistants').select('id', { count: 'exact', head: true }),
      supabase.from('attendance_logs').select('id', { count: 'exact', head: true }),
      supabase.from('incentives_penalties').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      supabase.from('payment_vouchers').select('id', { count: 'exact', head: true }),
      supabase.from('partners').select('id', { count: 'exact', head: true }),
      supabase.from('partner_payouts').select('id', { count: 'exact', head: true }),
      supabase.from('expenses').select('id', { count: 'exact', head: true }),
      supabase.from('charity_donations').select('id', { count: 'exact', head: true }),
    ]);

    if (workersRes.error) {
      throw new Error(`خطأ في جدول العمال workers: ${workersRes.error.message}`);
    }

    const stats: TableStats = {
      workers: workersRes.count || 0,
      assistants: assistantsRes.count || 0,
      attendanceLogs: attendanceRes.count || 0,
      incentivePenalties: incentivesRes.count || 0,
      customers: customersRes.count || 0,
      invoices: invoicesRes.count || 0,
      paymentVouchers: vouchersRes.count || 0,
      partners: partnersRes.count || 0,
      payouts: payoutsRes.count || 0,
      expenses: expensesRes.count || 0,
      charities: charityRes.count || 0,
    };

    return {
      connected: true,
      message: 'الاتصال بـ Supabase نشط وكافة الجداول متوفرة وجاهزة للعمل.',
      stats,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || 'فشل في الاتصال بجداول Supabase. يرجى التأكد من تشغيل ملف المخطط schema.sql',
    };
  }
}

/**
 * Uploads (Migrates) the complete local React state into Supabase PostgreSQL tables
 */
export async function uploadAllStateToSupabaseTables(state: {
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
}): Promise<{ success: boolean; message: string; details?: string[] }> {
  // 1. Try server-side PostgreSQL Transaction Pooler API first
  try {
    const serverRes = await fetch('/api/db/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (serverRes.ok) {
      const json = await serverRes.json();
      if (json.success) {
        return {
          success: true,
          message: 'تم ترحيل البيانات وحفظها بنجاح عبر مجمع معاملات PostgreSQL (Transaction Pooler)!',
        };
      }
    }
  } catch {
    // Fallback to client SDK
  }

  // 2. Client-side SDK migration
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'برجاء ضبط رابط ومفتاح Supabase أو DATABASE_URL أولاً.' };
  }

  const details: string[] = [];

  try {
    // 1. Workers
    if (state.workers.length > 0) {
      const rows = state.workers.map(mapWorkerToDb);
      const { error } = await supabase.from('workers').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع العمال: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} سجل عمال`);
    }

    // 2. Assistants
    if (state.assistants.length > 0) {
      const rows = state.assistants.map(mapAssistantToDb);
      const { error } = await supabase.from('assistants').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع المساعدين: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} حساب مساعدين`);
    }

    // 3. Customers
    if (state.customers.length > 0) {
      const rows = state.customers.map(mapCustomerToDb);
      const { error } = await supabase.from('customers').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع العملاء: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} سجل عملاء`);
    }

    // 4. Invoices
    if (state.invoices.length > 0) {
      const rows = state.invoices.map(mapInvoiceToDb);
      const { error } = await supabase.from('invoices').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع الفواتير: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} فاتورة`);
    }

    // 5. Payment Vouchers
    if (state.paymentVouchers.length > 0) {
      const rows = state.paymentVouchers.map(mapPaymentVoucherToDb);
      const { error } = await supabase.from('payment_vouchers').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع سندات الدفع: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} سند دفع`);
    }

    // 6. Partners
    if (state.partners.length > 0) {
      const rows = state.partners.map(mapPartnerToDb);
      const { error } = await supabase.from('partners').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع الشركاء: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} شريك`);
    }

    // 7. Partner Payouts
    if (state.payouts.length > 0) {
      const rows = state.payouts.map(mapPartnerPayoutToDb);
      const { error } = await supabase.from('partner_payouts').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع مسحوبات الشركاء: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} حركة مسحوبات أرباح`);
    }

    // 8. Attendance Logs
    if (state.attendanceLogs.length > 0) {
      const rows = state.attendanceLogs.map(mapAttendanceToDb);
      const { error } = await supabase.from('attendance_logs').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع سجلات الحضور: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} سجل حضور وانصراف`);
    }

    // 9. Incentives & Penalties
    if (state.incentivePenalties.length > 0) {
      const rows = state.incentivePenalties.map(mapIncentiveToDb);
      const { error } = await supabase.from('incentives_penalties').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع الحوافز والجزاءات: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} حركة حوافز وجزاءات`);
    }

    // 10. Expenses
    if (state.expenses.length > 0) {
      const rows = state.expenses.map(mapExpenseToDb);
      const { error } = await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع المصروفات: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} قيد مصروفات وإيرادات`);
    }

    // 11. Charity Donations
    if (state.charities.length > 0) {
      const rows = state.charities.map(mapCharityToDb);
      const { error } = await supabase.from('charity_donations').upsert(rows, { onConflict: 'id' });
      if (error) throw new Error(`فشل رفع الصدقات: ${error.message}`);
      details.push(`تم ترحيل ${rows.length} قيد صدقات وتبرعات`);
    }

    return {
      success: true,
      message: 'تم ترحيل ورفع كافة البيانات بنجاح إلى جداول Supabase PostgreSQL!',
      details,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'حدث خطأ أثناء ترحيل البيانات.',
      details,
    };
  }
}

/**
 * Pulls (Fetches) all live records from Supabase PostgreSQL tables into the app state
 */
export async function fetchAllStateFromSupabaseTables(): Promise<{
  success: boolean;
  message: string;
  data?: {
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
  };
}> {
  // 1. Try server-side PostgreSQL Transaction Pooler API first
  try {
    const serverRes = await fetch('/api/db/state');
    if (serverRes.ok) {
      const json = await serverRes.json();
      if (json.success && json.data) {
        return {
          success: true,
          message: 'تم جلب البيانات الحية مباشرة من مجمع معاملات PostgreSQL!',
          data: {
            workers: (json.data.workers || []).map(mapDbToWorker),
            assistants: (json.data.assistants || []).map(mapDbToAssistant),
            attendanceLogs: (json.data.attendanceLogs || []).map(mapDbToAttendance),
            incentivePenalties: (json.data.incentivePenalties || []).map(mapDbToIncentive),
            customers: (json.data.customers || []).map(mapDbToCustomer),
            invoices: (json.data.invoices || []).map(mapDbToInvoice),
            paymentVouchers: (json.data.paymentVouchers || []).map(mapDbToPaymentVoucher),
            partners: (json.data.partners || []).map(mapDbToPartner),
            payouts: (json.data.payouts || []).map(mapDbToPartnerPayout),
            expenses: (json.data.expenses || []).map(mapDbToExpense),
            charities: (json.data.charities || []).map(mapDbToCharity),
          },
        };
      }
    }
  } catch {
    // Fallback to client SDK
  }

  // 2. Client SDK fallback
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'برجاء ضبط رابط ومفتاح Supabase أو DATABASE_URL أولاً.' };
  }

  try {
    const [
      wRes,
      astRes,
      attRes,
      ipRes,
      custRes,
      invRes,
      pvRes,
      prtRes,
      poRes,
      expRes,
      chrRes,
    ] = await Promise.all([
      supabase.from('workers').select('*'),
      supabase.from('assistants').select('*'),
      supabase.from('attendance_logs').select('*'),
      supabase.from('incentives_penalties').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('payment_vouchers').select('*'),
      supabase.from('partners').select('*'),
      supabase.from('partner_payouts').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('charity_donations').select('*'),
    ]);

    if (wRes.error) throw new Error(`خطأ في جلب العمال: ${wRes.error.message}`);

    const workers = (wRes.data || []).map(mapDbToWorker);
    const assistants = (astRes.data || []).map(mapDbToAssistant);
    const attendanceLogs = (attRes.data || []).map(mapDbToAttendance);
    const incentivePenalties = (ipRes.data || []).map(mapDbToIncentive);
    const customers = (custRes.data || []).map(mapDbToCustomer);
    const invoices = (invRes.data || []).map(mapDbToInvoice);
    const paymentVouchers = (pvRes.data || []).map(mapDbToPaymentVoucher);
    const partners = (prtRes.data || []).map(mapDbToPartner);
    const payouts = (poRes.data || []).map(mapDbToPartnerPayout);
    const expenses = (expRes.data || []).map(mapDbToExpense);
    const charities = (chrRes.data || []).map(mapDbToCharity);

    return {
      success: true,
      message: 'تم سحب البيانات الحية من Supabase بنجاح!',
      data: {
        workers,
        assistants,
        attendanceLogs,
        incentivePenalties,
        customers,
        invoices,
        paymentVouchers,
        partners,
        payouts,
        expenses,
        charities,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'حدث خطأ أثناء جلب البيانات من Supabase.',
    };
  }
}
