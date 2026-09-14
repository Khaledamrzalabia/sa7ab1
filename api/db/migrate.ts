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
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const {
    workers = [],
    assistants = [],
    customers = [],
    invoices = [],
    paymentVouchers = [],
    partners = [],
    payouts = [],
    attendanceLogs = [],
    incentivePenalties = [],
    expenses = [],
    charities = [],
    customerLoans = [],
  } = req.body || {};

  let client;
  try {
    const p = getPool();
    client = await p.connect();
    await client.query('BEGIN');

    // 1. Workers
    for (const w of workers) {
      await client.query(
        `INSERT INTO public.workers (id, short_code, name, role, national_id, department, line, base_salary, daily_rate, hourly_rate, minute_rate, shift_start, shift_end, status, notes, discount_notes, manual_discount, has_discount, bonus_notes, manual_bonus, has_bonus, monthly_regularity_bonus, is_archived)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT (id) DO UPDATE SET
           short_code = EXCLUDED.short_code,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           base_salary = EXCLUDED.base_salary,
           minute_rate = EXCLUDED.minute_rate,
           monthly_regularity_bonus = EXCLUDED.monthly_regularity_bonus,
           status = EXCLUDED.status,
           is_archived = EXCLUDED.is_archived`,
        [
          w.id,
          w.shortCode || w.short_code,
          w.name,
          w.role,
          w.nationalId || w.national_id,
          w.department,
          w.line,
          w.baseSalary ?? w.base_salary ?? 0,
          w.dailyRate ?? w.daily_rate ?? 0,
          w.hourlyRate ?? w.hourly_rate ?? 0,
          w.minuteRate ?? w.minute_rate ?? 0,
          w.shiftStart || w.shift_start || '08:00 ص',
          w.shiftEnd || w.shift_end || '04:00 م',
          w.status || 'active',
          w.notes || '',
          w.discountNotes || w.discount_notes || '',
          w.manualDiscount ?? w.manual_discount ?? 0,
          Boolean(w.hasDiscount ?? w.has_discount ?? false),
          w.bonusNotes || w.bonus_notes || '',
          w.manualBonus ?? w.manual_bonus ?? 0,
          Boolean(w.hasBonus ?? w.has_bonus ?? false),
          w.monthlyRegularityBonus ?? w.monthly_regularity_bonus ?? 500,
          Boolean(w.isArchived ?? w.is_archived ?? false),
        ]
      );
    }

    // 2. Attendance
    for (const a of attendanceLogs) {
      await client.query(
        `INSERT INTO public.attendance_logs (id, worker_id, date, check_in, check_out, delay_minutes, permit_type, is_permitted, worked_hours, deduction_amount, status, gate, recorded_by, recorded_by_id, method, midday_exit, midday_return, midday_minutes, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO UPDATE SET
           check_in = EXCLUDED.check_in,
           check_out = EXCLUDED.check_out,
           delay_minutes = EXCLUDED.delay_minutes,
           status = EXCLUDED.status,
           worked_hours = EXCLUDED.worked_hours,
           deduction_amount = EXCLUDED.deduction_amount,
           permit_type = EXCLUDED.permit_type,
           is_permitted = EXCLUDED.is_permitted`,
        [
          a.id,
          a.workerId || a.worker_id,
          a.date,
          a.checkIn || a.check_in,
          a.checkOut || a.check_out,
          a.delayMinutes ?? a.delay_minutes ?? 0,
          a.permitType || a.permit_type,
          Boolean(a.isPermitted ?? a.is_permitted ?? false),
          a.workedHours ?? a.worked_hours ?? 0,
          a.deductionAmount ?? a.deduction_amount ?? 0,
          a.status || 'present',
          a.gate || 'البوابة الرئيسية',
          a.recordedBy || a.recorded_by,
          a.recordedById || a.recorded_by_id,
          a.method || 'qr',
          a.middayExit || a.midday_exit,
          a.middayReturn || a.midday_return,
          a.middayMinutes ?? a.midday_minutes ?? 0,
          a.notes || '',
        ]
      );
    }

    // 3. Incentives & Penalties
    for (const ip of incentivePenalties) {
      await client.query(
        `INSERT INTO public.incentives_penalties (id, worker_id, type, category, amount, calc_mode, calc_value, notes, date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           notes = EXCLUDED.notes,
           status = EXCLUDED.status`,
        [
          ip.id,
          ip.workerId || ip.worker_id,
          ip.type,
          ip.category,
          ip.amount,
          ip.calcMode || ip.calc_mode || 'fixed',
          ip.calcValue ?? ip.calc_value ?? ip.amount,
          ip.notes || '',
          ip.date,
          ip.status || 'approved-added',
        ]
      );
    }

    // 4. Customers
    for (const c of customers) {
      await client.query(
        `INSERT INTO public.customers (id, name, phone, notes, total_delivered_pieces, balance, status, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           balance = EXCLUDED.balance,
           total_delivered_pieces = EXCLUDED.total_delivered_pieces,
           status = EXCLUDED.status`,
        [
          c.id,
          c.name,
          c.phone || '',
          c.notes || '',
          c.totalDeliveredPieces ?? c.total_delivered_pieces ?? 0,
          c.balance ?? 0,
          c.status || 'active',
          c.address || '',
        ]
      );
    }

    // 5. Invoices
    for (const inv of invoices) {
      await client.query(
        `INSERT INTO public.invoices (id, customer_id, model_name, total_quantity, unit_price, total_amount, paid_amount, remaining_amount, date, status, fabric_details, notes, color_breakdown, barcode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           paid_amount = EXCLUDED.paid_amount,
           remaining_amount = EXCLUDED.remaining_amount,
           status = EXCLUDED.status`,
        [
          inv.id,
          inv.customerId || inv.customer_id,
          inv.modelName || inv.model_name || '',
          inv.totalQuantity ?? inv.total_quantity ?? 0,
          inv.unitPrice ?? inv.unit_price ?? 0,
          inv.totalAmount ?? inv.total_amount ?? 0,
          inv.paidAmount ?? inv.paid_amount ?? 0,
          inv.remainingAmount ?? inv.remaining_amount ?? 0,
          inv.date,
          inv.status || 'pending',
          inv.fabricDetails || inv.fabric_details || '',
          inv.notes || '',
          JSON.stringify(inv.colorBreakdown || inv.color_breakdown || []),
          inv.barcode || '',
        ]
      );
    }

    // 6. Expenses
    for (const exp of expenses) {
      await client.query(
        `INSERT INTO public.expenses (id, type, category, title, amount, date, time, payment_method, receipt_ref, party, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           notes = EXCLUDED.notes`,
        [
          exp.id,
          exp.type || 'out',
          exp.category,
          exp.title,
          exp.amount,
          exp.date,
          exp.time || '',
          exp.paymentMethod || exp.payment_method || 'cash',
          exp.receiptRef || exp.receipt_ref || '',
          exp.party || '',
          exp.notes || '',
          exp.recordedBy || exp.recorded_by || '',
        ]
      );
    }

    // 7. Assistants
    for (const ast of assistants) {
      await client.query(
        `INSERT INTO public.assistants (id, name, username, phone, password, role_title, shift, gate_or_location, status, permissions, operations_count, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           username = EXCLUDED.username,
           phone = EXCLUDED.phone,
           password = EXCLUDED.password,
           role_title = EXCLUDED.role_title,
           shift = EXCLUDED.shift,
           gate_or_location = EXCLUDED.gate_or_location,
           status = EXCLUDED.status,
           permissions = EXCLUDED.permissions,
           operations_count = EXCLUDED.operations_count,
           notes = EXCLUDED.notes`,
        [
          ast.id,
          ast.name,
          ast.username,
          ast.phone,
          ast.password || '123',
          ast.roleTitle || ast.role_title || '',
          ast.shift || '',
          ast.gateOrLocation || ast.gate_or_location || '',
          ast.status || 'active',
          ast.permissions ? JSON.stringify(ast.permissions) : '{}',
          ast.operationsCount ?? ast.operations_count ?? 0,
          ast.notes || ''
        ]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'تم حفظ ومزامنة البيانات مع Supabase بنجاح!' });
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Migrate error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'فشل الحفظ في السحابة: ' + err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
}
