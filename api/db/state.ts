import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (pool) return pool;
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres.bkazilqmwujiyffshpmk:%40Mm7677943%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const p = getPool();
    const [
      workers,
      assistants,
      attendance,
      incentives,
      customers,
      invoices,
      vouchers,
      partners,
      payouts,
      expenses,
      charities,
      loans,
    ] = await Promise.all([
      p.query('SELECT * FROM public.workers ORDER BY created_at DESC'),
      p.query('SELECT * FROM public.assistants ORDER BY created_at DESC'),
      p.query('SELECT * FROM public.attendance_logs ORDER BY date DESC, id DESC LIMIT 1500'),
      p.query('SELECT * FROM public.incentives_penalties ORDER BY date DESC, id DESC LIMIT 1500'),
      p.query('SELECT * FROM public.customers ORDER BY created_at DESC'),
      p.query('SELECT * FROM public.invoices ORDER BY date DESC, id DESC LIMIT 1000'),
      p.query('SELECT * FROM public.payment_vouchers ORDER BY date DESC, id DESC LIMIT 1000'),
      p.query('SELECT * FROM public.partners ORDER BY created_at DESC'),
      p.query('SELECT * FROM public.partner_payouts ORDER BY date DESC, id DESC LIMIT 1000'),
      p.query('SELECT * FROM public.expenses ORDER BY date DESC, id DESC LIMIT 1500'),
      p.query('SELECT * FROM public.charity_donations ORDER BY date DESC, id DESC LIMIT 1000'),
      p.query('SELECT * FROM public.customer_loans ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    ]);

    return res.status(200).json({
      success: true,
      connected: true,
      data: {
        workers: workers.rows.map((r: any) => {
          const baseSalary = Number(r.base_salary ?? r.baseSalary ?? 0);
          const dailyRate = Number(r.daily_rate ?? r.dailyRate ?? (baseSalary > 0 ? +(baseSalary / 30).toFixed(2) : 0));
          const hourlyRate = Number(r.hourly_rate ?? r.hourlyRate ?? (baseSalary > 0 ? +(baseSalary / 240).toFixed(2) : 0));
          const minuteRate = Number(r.minute_rate ?? r.minuteRate ?? (baseSalary > 0 ? +(baseSalary / 14400).toFixed(3) : 0));
          return {
            id: r.id,
            shortCode: r.short_code ?? r.shortCode ?? '',
            name: r.name ?? '',
            role: r.role ?? '',
            nationalId: r.national_id ?? r.nationalId ?? '',
            department: r.department ?? '',
            line: r.line ?? '',
            baseSalary,
            dailyRate,
            hourlyRate,
            minuteRate,
            shiftStart: r.shift_start ?? r.shiftStart ?? '08:00 ص',
            shiftEnd: r.shift_end ?? r.shiftEnd ?? '04:00 م',
            status: r.status ?? 'active',
            notes: r.notes ?? '',
            discountNotes: r.discount_notes ?? r.discountNotes ?? '',
            manualDiscount: Number(r.manual_discount ?? r.manualDiscount ?? 0),
            hasDiscount: Boolean(r.has_discount ?? r.hasDiscount ?? false),
            bonusNotes: r.bonus_notes ?? r.bonusNotes ?? '',
            manualBonus: Number(r.manual_bonus ?? r.manualBonus ?? 0),
            hasBonus: Boolean(r.has_bonus ?? r.hasBonus ?? false),
            monthlyRegularityBonus: Number(r.monthly_regularity_bonus ?? r.monthlyRegularityBonus ?? 500),
            isArchived: Boolean(r.is_archived ?? r.isArchived ?? false),
          };
        }),
        assistants: assistants.rows.map((r: any) => ({
          id: r.id,
          name: r.name ?? '',
          username: r.username ?? '',
          phone: r.phone ?? '',
          password: '',
          roleTitle: r.role_title ?? r.roleTitle ?? 'مشرف وردية وتحضير',
          shift: r.shift ?? 'الوردية الصباحية (08:00 ص - 04:00 م)',
          gateOrLocation: r.gate_or_location ?? r.gateOrLocation ?? '',
          notes: r.notes ?? '',
          permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions ?? {
            canCheckIn: true,
            canCheckOut: true,
            canRecordPermissions: true,
            canAddManualPenalties: true,
            canViewDailySummary: true,
            canPrintCards: true,
          }),
        })),
        attendanceLogs: attendance.rows.map((r: any) => ({
          id: r.id,
          workerId: r.worker_id ?? r.workerId,
          date: r.date,
          checkIn: r.check_in ?? r.checkIn ?? '—',
          checkOut: r.check_out ?? r.checkOut ?? '—',
          status: r.status ?? 'present',
          delayMinutes: Number(r.delay_minutes ?? r.delayMinutes ?? 0),
          workedHours: Number(r.worked_hours ?? r.workedHours ?? 0),
          deductionAmount: Number(r.deduction_amount ?? r.deductionAmount ?? 0),
          permitType: r.permit_type ?? r.permitType ?? null,
          isPermitted: Boolean(r.is_permitted ?? r.isPermitted ?? false),
          gate: r.gate ?? 'البوابة الرئيسية',
          recordedBy: r.recorded_by ?? r.recordedBy ?? 'إدارة النظام',
          recordedById: r.recorded_by_id ?? r.recordedById ?? '',
          method: r.method ?? 'qr',
          middayExit: r.midday_exit ?? r.middayExit ?? null,
          middayReturn: r.midday_return ?? r.middayReturn ?? null,
          middayMinutes: Number(r.midday_minutes ?? r.middayMinutes ?? 0),
          notes: r.notes ?? '',
        })),
        incentivePenalties: incentives.rows.map((r: any) => ({
          id: r.id,
          workerId: r.worker_id ?? r.workerId,
          type: r.type,
          category: r.category ?? '',
          amount: Number(r.amount ?? 0),
          calcMode: r.calc_mode ?? r.calcMode ?? 'fixed',
          calcValue: Number(r.calc_value ?? r.calcValue ?? r.amount ?? 0),
          date: r.date,
          notes: r.notes ?? '',
          status: r.status ?? 'approved-added',
        })),
        customers: customers.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          phone: r.phone ?? '',
          notes: r.notes ?? '',
          totalDeliveredPieces: Number(r.total_delivered_pieces ?? r.totalDeliveredPieces ?? 0),
          balance: Number(r.balance ?? 0),
          status: r.status ?? 'active',
          address: r.address ?? '',
        })),
        invoices: invoices.rows.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id ?? r.customerId,
          modelName: r.model_name ?? r.modelName ?? '',
          totalQuantity: Number(r.total_quantity ?? r.totalQuantity ?? 0),
          unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
          totalAmount: Number(r.total_amount ?? r.totalAmount ?? 0),
          paidAmount: Number(r.paid_amount ?? r.paidAmount ?? 0),
          remainingAmount: Number(r.remaining_amount ?? r.remainingAmount ?? 0),
          date: r.date,
          status: r.status ?? 'pending',
          fabricDetails: r.fabric_details ?? r.fabricDetails ?? '',
          notes: r.notes ?? '',
          colorBreakdown: typeof r.color_breakdown === 'string' ? JSON.parse(r.color_breakdown) : (r.color_breakdown ?? r.colorBreakdown ?? []),
          barcode: r.barcode ?? '',
          createdAt: r.created_at ?? r.createdAt,
        })),
        paymentVouchers: vouchers.rows.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id ?? r.customerId,
          amount: Number(r.amount ?? 0),
          date: r.date,
          time: r.time ?? '',
          paymentMethod: r.payment_method ?? r.paymentMethod ?? 'cash',
          receiptNumber: r.receipt_number ?? r.receiptNumber ?? '',
          notes: r.notes ?? '',
          invoiceId: r.invoice_id ?? r.invoiceId ?? '',
          createdAt: r.created_at ?? r.createdAt,
        })),
        partners: partners.rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          phone: r.phone ?? '',
          nationalId: r.national_id ?? r.nationalId ?? '',
          roleTitle: r.role_title ?? r.roleTitle ?? 'شريك ممول ومستثمر',
          capital: Number(r.capital ?? 0),
          sharePercentage: Number(r.share_percentage ?? r.sharePercentage ?? 0),
          joinDate: r.join_date ?? r.joinDate,
          status: r.status ?? 'active',
          notes: r.notes ?? '',
          totalWithdrawn: Number(r.total_withdrawn ?? r.totalWithdrawn ?? 0),
        })),
        payouts: payouts.rows.map((r: any) => ({
          id: r.id,
          partnerId: r.partner_id ?? r.partnerId,
          amount: Number(r.amount ?? 0),
          date: r.date,
          period: r.period ?? '',
          payoutMethod: r.payout_method ?? r.payoutMethod ?? 'bank_transfer',
          notes: r.notes ?? '',
          status: r.status ?? 'approved',
        })),
        expenses: expenses.rows.map((r: any) => ({
          id: r.id,
          type: r.type ?? 'out',
          category: r.category ?? '',
          title: r.title ?? '',
          amount: Number(r.amount ?? 0),
          date: r.date,
          time: r.time ?? '',
          paymentMethod: r.payment_method ?? r.paymentMethod ?? 'cash',
          receiptRef: r.receipt_ref ?? r.receiptRef ?? '',
          party: r.party ?? 'جهة خارجية',
          notes: r.notes ?? '',
          recordedBy: r.recorded_by ?? r.recordedBy ?? '',
          createdAt: r.created_at ?? r.createdAt,
        })),
        charities: charities.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: r.category ?? 'sadaqah',
          amount: Number(r.amount ?? 0),
          beneficiary: r.beneficiary ?? '',
          source: r.source ?? 'company_percentage',
          paymentMethod: r.payment_method ?? r.paymentMethod ?? 'cash',
          representative: r.representative ?? '',
          date: r.date,
          notes: r.notes ?? '',
        })),
        customerLoans: loans.rows.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id ?? r.customerId ?? '',
          amount: Number(r.amount ?? 0),
          paidAmount: Number(r.paid_amount ?? r.paidAmount ?? 0),
          remainingAmount: Number(r.remaining_amount ?? r.remainingAmount ?? 0),
          loanDate: r.loan_date ?? r.loanDate ?? '',
          dueDate: r.due_date ?? r.dueDate ?? '',
          status: r.status ?? 'active',
          notes: r.notes ?? '',
        })),
      },
    });
  } catch (err: any) {
    console.error('State query error:', err?.message || err);
    return res.status(200).json({
      success: false,
      connected: false,
      message: 'تعذر تحميل بيانات السحابة: ' + (err?.message || ''),
      data: null,
    });
  }
}
