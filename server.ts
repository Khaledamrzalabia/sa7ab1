import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase environment variables & helper
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bkazilqmwujiyffshpmk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getServerSupabase() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (SUPABASE_URL && key && SUPABASE_URL.startsWith('http')) {
    try {
      return createClient(SUPABASE_URL, key);
    } catch {
      return null;
    }
  }
  return null;
}

// Helper to detect PostgreSQL authentication / circuit-breaker errors
function isAuthenticationError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = err.code;
  return (
    code === '28P01' || // PostgreSQL invalid_password
    code === '28000' || // PostgreSQL invalid_authorization_specification
    msg.includes('password authentication failed') ||
    msg.includes('circuitbreaker') ||
    msg.includes('too many authentication failures') ||
    msg.includes('failed to connect') ||
    msg.includes('connection terminated')
  );
}

// Track authentication failure state to prevent hammering database on invalid credentials
let isDbAuthFailing = false;
let lastAuthErrorMessage = '';

// Lazy-initialized PostgreSQL connection pool for Supabase Transaction Pooler
let pgPool: Pool | null = null;

function getDbPool(): Pool | null {
  if (pgPool) return pgPool;

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.PGHOST || process.env.DB_HOST || 'aws-1-eu-west-1.pooler.supabase.com';
  const user = process.env.PGUSER || process.env.DB_USER || 'postgres.bkazilqmwujiyffshpmk';
  const database = process.env.PGDATABASE || process.env.DB_NAME || 'postgres';
  const port = Number(process.env.PGPORT || process.env.DB_PORT) || 6543;

  // If no credentials or placeholder without password, operate in clean offline local mode
  if (!dbUrl && !password) {
    return null;
  }
  if (dbUrl && dbUrl.includes('[YOUR-PASSWORD]') && !password) {
    return null;
  }

  try {
    let finalConnectionString = '';
    if (dbUrl && password && dbUrl.includes('[YOUR-PASSWORD]')) {
      finalConnectionString = dbUrl.replace('[YOUR-PASSWORD]', encodeURIComponent(password));
    } else if (password) {
      finalConnectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    } else {
      finalConnectionString = dbUrl!;
    }

    pgPool = new Pool({
      connectionString: finalConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pgPool.on('error', (err: any) => {
      console.warn('PostgreSQL pool idle notification:', err.message);
      if (isAuthenticationError(err)) {
        isDbAuthFailing = true;
        lastAuthErrorMessage = err.message;
      }
    });

    return pgPool;
  } catch (err: any) {
    console.warn('Failed to initialize PostgreSQL pool:', err.message);
    return null;
  }
}

// Auto-seed and guarantee schema + General Manager exists in Supabase
async function ensureGeneralManagerExists(pool: Pool) {
  try {
    const tblRes = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistants')`
    );
    if (!tblRes.rows[0]?.exists) {
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'setup_complete.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(sql);
      }
    }

    await pool.query(`
      INSERT INTO public.assistants (
        id, name, username, phone, password, role_title, shift, gate_or_location, status, permissions, operations_count, notes
      ) VALUES (
        'OWNER-01',
        'محمد صلاح',
        'admin',
        '01098452103',
        'admin',
        'المدير العام (General Manager)',
        'الوردية الإدارية الشاملة',
        'الإدارة العليا',
        'active',
        '{"canCheckIn": true, "canCheckOut": true, "canRecordPermissions": true, "canAddManualPenalties": true, "canViewDailySummary": true, "canPrintCards": true}'::jsonb,
        0,
        'حساب المدير العام الرئيسي للمصنع'
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role_title = EXCLUDED.role_title;
    `);
  } catch (e: any) {
    console.warn('ensureGeneralManagerExists notification:', e.message);
  }
}

// ============================================================================
// API Routes: Supabase Authentication
// ============================================================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const trimmedId = (identifier || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedId || !trimmedPass) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // 1. If identifier is an email and Supabase credentials exist, authenticate via Supabase Auth
  if (trimmedId.includes('@')) {
    const supabase = getServerSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId,
          password: trimmedPass,
        });

        if (!error && data?.user) {
          const u = data.user;
          const isGM =
            u.email?.includes('admin') ||
            u.user_metadata?.role === 'owner' ||
            u.user_metadata?.is_general_manager;

          const session = {
            type: isGM ? 'owner' : 'assistant',
            id: u.id,
            name: u.user_metadata?.name || u.user_metadata?.full_name || 'محمد صلاح',
            username: u.email?.split('@')[0] || 'admin',
            phone: u.user_metadata?.phone || '',
            email: u.email,
            token: data.session?.access_token,
            roleTitle: isGM ? 'المدير العام (General Manager)' : (u.user_metadata?.role_title || 'مشرف وردية وتحضير'),
            permissions: u.user_metadata?.permissions || {
              canCheckIn: true,
              canCheckOut: true,
              canRecordPermissions: true,
              canAddManualPenalties: true,
              canViewDailySummary: true,
              canPrintCards: true,
            },
          };

          return res.json({ success: true, user: session, token: session.token });
        } else if (error) {
          console.warn('Supabase Auth response:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase Auth error:', err.message);
      }
    }
  }

  // 2. Query Supabase PostgreSQL Database (public.assistants table)
  const pool = getDbPool();
  if (pool && !isDbAuthFailing) {
    try {
      const result = await pool.query(
        `SELECT * FROM public.assistants WHERE (LOWER(username) = LOWER($1) OR phone = $1 OR id = $1) LIMIT 1`,
        [trimmedId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (row.status === 'suspended') {
          return res.status(403).json({ success: false, message: 'هذا الحساب معلق حالياً من قِبل إدارة المصنع.' });
        }

        const passMatches = row.password === trimmedPass;
        if (passMatches) {
          const isGM =
            (row.role_title || '').includes('المدير العام') ||
            (row.role_title || '').toLowerCase().includes('general manager') ||
            row.id === 'OWNER-01';

          const session = {
            type: isGM ? 'owner' : 'assistant',
            id: row.id,
            name: row.name,
            username: row.username,
            phone: row.phone,
            roleTitle: row.role_title,
            permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
          };

          return res.json({ success: true, user: session });
        } else {
          return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
        }
      }
    } catch (dbErr: any) {
      console.warn('Database query error during auth:', dbErr.message);
    }
  }

  // 3. Built-in Production Administrator Credentials (محمد صلاح)
  // Ensures admin can always access system to manage Supabase settings even prior to initial DB bootstrap
  const isOwner =
    trimmedId.toLowerCase() === 'admin' ||
    trimmedId === 'محمد صلاح' ||
    trimmedId === '01098452103';

  if (isOwner && (trimmedPass === 'admin' || trimmedPass === '123456' || trimmedPass === 'Admin@2026')) {
    const ownerSession = {
      type: 'owner',
      id: 'OWNER-01',
      name: 'محمد صلاح',
      username: 'admin',
      roleTitle: 'المدير العام (General Manager)',
      phone: '01098452103',
      permissions: {
        canCheckIn: true,
        canCheckOut: true,
        canRecordPermissions: true,
        canAddManualPenalties: true,
        canViewDailySummary: true,
        canPrintCards: true,
      },
    };
    return res.json({ success: true, user: ownerSession });
  }

  return res.status(401).json({
    success: false,
    message: 'بيانات الاعتماد غير صحيحة. يرجى التأكد من اسم المستخدم أو رقم الهاتف وكلمة المرور.',
  });
});

app.get('/api/auth/session', async (req: Request, res: Response) => {
  return res.json({ success: true, active: true });
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  return res.json({ success: true });
});

// ============================================================================
// API Routes: Supabase PostgreSQL Direct Pooler Integration
// ============================================================================

// Configure connection with separate URL/Password or complete URI from UI
app.post('/api/db/configure', async (req: Request, res: Response) => {
  const { poolerUrl, connectionString, password, host, user, port, database } = req.body;
  const rawUrl = connectionString || poolerUrl;

  let finalUrl = '';
  if (rawUrl && rawUrl.startsWith('postgresql://')) {
    if (password && rawUrl.includes('[YOUR-PASSWORD]')) {
      finalUrl = rawUrl.replace('[YOUR-PASSWORD]', encodeURIComponent(password));
    } else if (password) {
      try {
        const parsed = new URL(rawUrl);
        parsed.password = password;
        finalUrl = parsed.toString();
      } catch {
        finalUrl = rawUrl.replace(/:([^@]+)@/, `:${encodeURIComponent(password)}@`);
      }
    } else {
      finalUrl = rawUrl;
    }
  } else if (password) {
    const targetHost = host || 'aws-1-eu-west-1.pooler.supabase.com';
    const targetUser = user || 'postgres.bkazilqmwujiyffshpmk';
    const targetPort = port || 6543;
    const targetDb = database || 'postgres';
    finalUrl = `postgresql://${targetUser}:${encodeURIComponent(password)}@${targetHost}:${targetPort}/${targetDb}`;
  } else {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال كلمة مرور قاعدة البيانات (Password) أو رابط الاتصال الكامل.',
    });
  }

  try {
    const testPool = new Pool({
      connectionString: finalUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });

    await testPool.query('SELECT NOW()');

    // Close existing pool if any and assign new verified pool
    if (pgPool) {
      await pgPool.end().catch(() => {});
    }
    pgPool = testPool;
    isDbAuthFailing = false;
    lastAuthErrorMessage = '';

    // Auto-bootstrap tables and verify General Manager account in Supabase
    await ensureGeneralManagerExists(pgPool);

    // Persist verified connection to .env file
    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (/^DATABASE_URL=/m.test(envContent)) {
        envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${finalUrl}"`);
      } else {
        envContent += `\nDATABASE_URL="${finalUrl}"`;
      }
      if (password) {
        if (/^DB_PASSWORD=/m.test(envContent)) {
          envContent = envContent.replace(/^DB_PASSWORD=.*$/m, `DB_PASSWORD="${password}"`);
        } else {
          envContent += `\nDB_PASSWORD="${password}"`;
        }
      }
      if (req.body.anonKey) {
        if (/^SUPABASE_ANON_KEY=/m.test(envContent)) {
          envContent = envContent.replace(/^SUPABASE_ANON_KEY=.*$/m, `SUPABASE_ANON_KEY="${req.body.anonKey}"`);
        } else {
          envContent += `\nSUPABASE_ANON_KEY="${req.body.anonKey}"`;
        }
        if (/^VITE_SUPABASE_ANON_KEY=/m.test(envContent)) {
          envContent = envContent.replace(/^VITE_SUPABASE_ANON_KEY=.*$/m, `VITE_SUPABASE_ANON_KEY="${req.body.anonKey}"`);
        } else {
          envContent += `\nVITE_SUPABASE_ANON_KEY="${req.body.anonKey}"`;
        }
        process.env.SUPABASE_ANON_KEY = req.body.anonKey;
        process.env.VITE_SUPABASE_ANON_KEY = req.body.anonKey;
      }
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
      process.env.DATABASE_URL = finalUrl;
      if (password) process.env.DB_PASSWORD = password;
    } catch (e) {
      console.warn('Could not persist credentials to .env:', e);
    }

    return res.json({
      success: true,
      message: 'تم بنجاح التحقق من الاتصال بقاعدة بيانات Supabase وتهيئة وتأكيد حساب المدير العام والجداول!',
    });
  } catch (err: any) {
    console.warn('Configure connection error:', err.message);
    const isAuth = isAuthenticationError(err);
    if (isAuth) {
      isDbAuthFailing = true;
      lastAuthErrorMessage = err.message;
    }
    return res.status(400).json({
      success: false,
      isAuthError: isAuth,
      message: isAuth
        ? 'فشل التحقق من كلمة المرور (password authentication failed). يرجى التأكد من كلمة مرور قاعدة بيانات مشروعك في Supabase.'
        : `فشل الاتصال: ${err.message || 'تأكد من صحة الرابط وكلمة المرور'}`,
    });
  }
});

// Disconnect and switch back to local offline mode
app.post('/api/db/disconnect', async (req: Request, res: Response) => {
  if (pgPool) {
    await pgPool.end().catch(() => {});
    pgPool = null;
  }
  isDbAuthFailing = false;
  lastAuthErrorMessage = '';

  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      envContent = envContent.replace(/^DATABASE_URL=.*$/gm, 'DATABASE_URL="postgresql://postgres.bkazilqmwujiyffshpmk:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"');
      envContent = envContent.replace(/^DB_PASSWORD=.*$/gm, 'DB_PASSWORD=""');
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    }
    process.env.DATABASE_URL = 'postgresql://postgres.bkazilqmwujiyffshpmk:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
    process.env.DB_PASSWORD = '';
  } catch (e) {
    console.warn('Could not update .env on disconnect:', e);
  }

  return res.json({
    success: true,
    message: 'تم تفعيل الوضع المحلي بنجاح، وتوقف محاولات الاتصال بالسحابة.',
  });
});

// 1. Health check & table metrics (Resilient non-500 response for client polling)
app.get('/api/db/health', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool) {
    return res.json({
      connected: false,
      isConfigured: false,
      isAuthError: false,
      message: 'الوضع المحلي الآمن نشط (في انتظار إدخال كلمة مرور قاعدة البيانات للربط السحابي).',
      host: 'aws-1-eu-west-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.bkazilqmwujiyffshpmk',
    });
  }

  if (isDbAuthFailing) {
    return res.json({
      connected: false,
      isConfigured: true,
      isAuthError: true,
      message: `فشل التحقق من كلمة مرور قاعدة البيانات: ${lastAuthErrorMessage || 'بيانات الاعتماد غير متطابقة'}. يعمل التطبيق على الذاكرة المحلية بأمان.`,
    });
  }

  try {
    const timeRes = await pool.query('SELECT NOW() as current_time');
    isDbAuthFailing = false;
    lastAuthErrorMessage = '';
    
    // Query table counts safely across all 13 tables
    const tables = [
      'workers',
      'assistants',
      'attendance_logs',
      'incentives_penalties',
      'customers',
      'customer_loans',
      'invoices',
      'payment_vouchers',
      'partners',
      'partner_payouts',
      'expenses',
      'charity_donations',
      'payroll_approvals',
    ];

    const stats: Record<string, number> = {};
    for (const table of tables) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) FROM public.${table}`);
        stats[table] = parseInt(countRes.rows[0].count, 10);
      } catch {
        stats[table] = 0;
      }
    }

    return res.json({
      connected: true,
      isConfigured: true,
      message: 'الاتصال المباشر بمجمع المعاملات (Transaction Pooler) في Supabase نشط وسريع!',
      timestamp: timeRes.rows[0].current_time,
      stats,
    });
  } catch (err: any) {
    // Return 200 with connected: false to avoid console spam during background polling
    return res.json({
      connected: false,
      isConfigured: true,
      message: `قاعدة البيانات السحابية غير متصلة حالياً: ${err.message}`,
    });
  }
});

// 2. Setup DDL Schema Execution directly
app.post('/api/db/setup', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool) {
    return res.status(400).json({ success: false, message: 'DATABASE_URL غير مهيأ' });
  }

  try {
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'setup_complete.sql');
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({ success: false, message: 'ملف setup_complete.sql غير موجود' });
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(sqlContent);

    return res.json({
      success: true,
      message: 'تم تشغيل السكيما وإنشاء كافة الجداول والفهارس وسياسات الأمان في Supabase بنجاح!',
    });
  } catch (err: any) {
    console.error('SQL Setup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Get entire application state from PostgreSQL
app.get('/api/db/state', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool || isDbAuthFailing) {
    return res.json({
      success: false,
      connected: false,
      isConfigured: Boolean(process.env.DATABASE_URL),
      isAuthError: isDbAuthFailing,
      message: isDbAuthFailing
        ? `فشل التحقق من كلمة مرور قاعدة البيانات (${lastAuthErrorMessage}). يعمل النظام على البيانات المحلية.`
        : 'قاعدة البيانات السحابية غير مهيأة بعد. يعمل النظام على التخزين المحلي الآمن.',
      data: null,
    });
  }

  try {
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
      pool.query('SELECT * FROM public.workers ORDER BY created_at DESC'),
      pool.query('SELECT * FROM public.assistants ORDER BY created_at DESC'),
      pool.query('SELECT * FROM public.attendance_logs ORDER BY date DESC, created_at DESC'),
      pool.query('SELECT * FROM public.incentives_penalties ORDER BY date DESC'),
      pool.query('SELECT * FROM public.customers ORDER BY created_at DESC'),
      pool.query('SELECT * FROM public.invoices ORDER BY date DESC'),
      pool.query('SELECT * FROM public.payment_vouchers ORDER BY date DESC'),
      pool.query('SELECT * FROM public.partners ORDER BY join_date DESC'),
      pool.query('SELECT * FROM public.partner_payouts ORDER BY date DESC'),
      pool.query('SELECT * FROM public.expenses ORDER BY date DESC, created_at DESC'),
      pool.query('SELECT * FROM public.charity_donations ORDER BY date DESC'),
      pool.query('SELECT * FROM public.customer_loans ORDER BY date DESC, created_at DESC').catch(() => ({ rows: [] })),
    ]);

    return res.json({
      success: true,
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
            isArchived: Boolean(r.is_archived ?? r.isArchived ?? false),
          };
        }),
        assistants: assistants.rows.map((r: any) => ({
          id: r.id,
          name: r.name ?? '',
          username: r.username ?? '',
          phone: r.phone ?? '',
          password: r.password ?? '123456',
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
          deductionAmount: Number(r.deduction_amount ?? r.deductionAmount ?? 0),
          isPermitted: Boolean(r.is_permitted ?? r.isPermitted ?? false),
          permitType: r.permit_type ?? r.permitType ?? '',
          workedHours: Number(r.worked_hours ?? r.workedHours ?? 8),
          gate: r.gate ?? '',
        })),
        incentivePenalties: incentives.rows.map((r: any) => ({
          id: r.id,
          workerId: r.worker_id ?? r.workerId,
          type: r.type,
          category: r.category,
          amount: Number(r.amount ?? 0),
          calcMode: r.calc_mode ?? r.calcMode ?? 'fixed',
          calcValue: Number(r.calc_value ?? r.calcValue ?? 0),
          notes: r.notes ?? '',
          date: r.date,
          status: r.status ?? 'pending',
        })),
        customers: customers.rows.map((r: any) => ({
          id: r.id,
          name: r.name ?? '',
          companyName: r.company_name ?? r.companyName ?? '',
          contactPerson: r.contact_person ?? r.contactPerson ?? '',
          phone: r.phone ?? '',
          category: r.category ?? 'شركات متعاقدة',
          commercialReg: r.commercial_reg ?? r.commercialReg ?? '',
          ordersCount: Number(r.orders_count ?? r.ordersCount ?? 0),
          totalDeal: Number(r.total_deal ?? r.totalDeal ?? 0),
          paidAmount: Number(r.paid_amount ?? r.paidAmount ?? 0),
          dueAmount: Number(r.due_amount ?? r.dueAmount ?? 0),
          creditLimit: Number(r.credit_limit ?? r.creditLimit ?? 0),
          paymentTerms: r.payment_terms ?? r.paymentTerms ?? 'سداد نقدي',
          status: r.status ?? 'active-regular',
          loansBalance: Number(r.loans_balance ?? r.loansBalance ?? 0),
          createdAt: r.created_at ?? r.createdAt,
        })),
        invoices: invoices.rows.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id ?? r.customerId ?? '',
          date: r.date,
          time: r.time ?? '',
          description: r.description ?? '',
          amount: Number(r.amount ?? 0),
          paid: Number(r.paid ?? 0),
          status: r.status ?? 'unpaid',
          type: r.type ?? 'outgoing',
          companyName: r.company_name ?? r.companyName ?? '',
          customerName: r.customer_name ?? r.customerName ?? '',
          items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? []),
          history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history ?? []),
          createdAt: r.created_at ?? r.createdAt,
        })),
        paymentVouchers: vouchers.rows.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id ?? r.customerId ?? '',
          date: r.date,
          time: r.time ?? '',
          amount: Number(r.amount ?? 0),
          method: r.method ?? r.payment_method ?? 'نقدي',
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
          recordedBy: r.recorded_by ?? r.recordedBy ?? r.created_by ?? '',
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
          date: r.date,
          time: r.time ?? '',
          type: r.type ?? 'lend',
          amount: Number(r.amount ?? 0),
          notes: r.notes ?? '',
        })),
      },
    });
  } catch (err: any) {
    const isAuth = isAuthenticationError(err);
    if (isAuth) {
      isDbAuthFailing = true;
      lastAuthErrorMessage = err.message;
    }
    console.warn('Fetch state warning:', err.message);
    return res.json({
      success: false,
      connected: false,
      isAuthError: isAuth,
      message: isAuth
        ? 'فشل تسجيل الدخول لقاعدة البيانات السحابية (خطأ في كلمة المرور أو تم تعليق الاتصال مؤقتاً). يعمل النظام محلياً بأمان.'
        : err.message,
      data: null,
    });
  }
});

// 4. Bulk Migrate / Push state to PostgreSQL
app.post('/api/db/migrate', async (req: Request, res: Response) => {
  const pool = getDbPool();
  if (!pool || isDbAuthFailing) {
    return res.json({
      success: false,
      connected: false,
      isAuthError: isDbAuthFailing,
      message: 'قاعدة البيانات السحابية غير متصلة (بانتظار إدخال كلمة المرور الصحيحة). تم حفظ البيانات محلياً بأمان.',
    });
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
  } = req.body;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Workers
    for (const w of workers) {
      await client.query(
        `INSERT INTO public.workers (id, short_code, name, role, national_id, department, line, base_salary, daily_rate, hourly_rate, minute_rate, shift_start, shift_end, status, notes, discount_notes, manual_discount, has_discount, bonus_notes, manual_bonus, has_bonus, is_archived)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         ON CONFLICT (id) DO UPDATE SET
           short_code = EXCLUDED.short_code,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           base_salary = EXCLUDED.base_salary,
           minute_rate = EXCLUDED.minute_rate,
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
          w.baseSalary || w.base_salary || 0,
          w.dailyRate || w.daily_rate || 0,
          w.hourlyRate || w.hourly_rate || 0,
          w.minuteRate || w.minute_rate || 0,
          w.shiftStart || w.shift_start || '08:00 ص',
          w.shiftEnd || w.shift_end || '04:00 م',
          w.status || 'active',
          w.notes || '',
          w.discountNotes || w.discount_notes || '',
          w.manualDiscount || w.manual_discount || 0,
          Boolean(w.hasDiscount || w.has_discount),
          w.bonusNotes || w.bonus_notes || '',
          w.manualBonus || w.manual_bonus || 0,
          Boolean(w.hasBonus || w.has_bonus),
          Boolean(w.isArchived || w.is_archived),
        ]
      );
    }

    // 2. Assistants
    for (const a of assistants) {
      await client.query(
        `INSERT INTO public.assistants (id, name, username, phone, password, role_title, shift, gate_or_location, status, permissions, operations_count, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           permissions = EXCLUDED.permissions,
           status = EXCLUDED.status`,
        [
          a.id,
          a.name,
          a.username,
          a.phone,
          a.password || '123',
          a.roleTitle || a.role_title,
          a.shift,
          a.gateOrLocation || a.gate_or_location,
          a.status || 'active',
          JSON.stringify(a.permissions || {}),
          a.operationsCount || a.operations_count || 0,
          a.notes || '',
        ]
      );
    }

    // 3. Customers
    for (const c of customers) {
      await client.query(
        `INSERT INTO public.customers (id, name, company_name, contact_person, phone, category, commercial_reg, orders_count, total_deal, paid_amount, due_amount, credit_limit, payment_terms, status, loans_balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           company_name = EXCLUDED.company_name,
           total_deal = EXCLUDED.total_deal,
           paid_amount = EXCLUDED.paid_amount,
           due_amount = EXCLUDED.due_amount,
           status = EXCLUDED.status,
           loans_balance = EXCLUDED.loans_balance`,
        [
          c.id,
          c.name,
          c.companyName || c.company_name,
          c.contactPerson || c.contact_person || null,
          c.phone,
          c.category,
          c.commercialReg || c.commercial_reg || '',
          c.ordersCount || c.orders_count || 0,
          c.totalDeal || c.total_deal || 0,
          c.paidAmount || c.paid_amount || 0,
          c.dueAmount || c.due_amount || 0,
          c.creditLimit || c.credit_limit || 0,
          c.paymentTerms || c.payment_terms || 'سداد نقدي',
          c.status || 'active-regular',
          c.loansBalance || c.loans_balance || 0,
        ]
      );
    }

    // 4. Invoices
    for (const inv of invoices) {
      await client.query(
        `INSERT INTO public.invoices (id, customer_id, date, time, description, amount, paid, status, type, company_name, customer_name, items, history)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           paid = EXCLUDED.paid,
           status = EXCLUDED.status,
           items = EXCLUDED.items`,
        [
          inv.id,
          inv.customerId || inv.customer_id,
          inv.date,
          inv.time || null,
          inv.description || '',
          inv.amount || 0,
          inv.paid || 0,
          inv.status || 'unpaid',
          inv.type || 'outgoing',
          inv.companyName || inv.company_name || null,
          inv.customerName || inv.customer_name || null,
          JSON.stringify(inv.items || []),
          JSON.stringify(inv.history || []),
        ]
      );
    }

    // 5. Payment Vouchers
    for (const pv of paymentVouchers) {
      await client.query(
        `INSERT INTO public.payment_vouchers (id, customer_id, date, time, amount, method, invoice_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           method = EXCLUDED.method,
           invoice_id = EXCLUDED.invoice_id`,
        [
          pv.id,
          pv.customerId || pv.customer_id,
          pv.date,
          pv.time || null,
          pv.amount || 0,
          pv.method || 'نقدي',
          pv.invoiceId || pv.invoice_id || null,
        ]
      );
    }

    // 6. Partners
    for (const p of partners) {
      await client.query(
        `INSERT INTO public.partners (id, name, phone, national_id, role_title, capital, share_percentage, join_date, total_profits_withdrawn, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           capital = EXCLUDED.capital,
           share_percentage = EXCLUDED.share_percentage,
           total_profits_withdrawn = EXCLUDED.total_profits_withdrawn,
           status = EXCLUDED.status`,
        [
          p.id,
          p.name,
          p.phone,
          p.nationalId || p.national_id || null,
          p.roleTitle || p.role_title,
          p.capital || 0,
          p.sharePercentage || p.share_percentage || 0,
          p.joinDate || p.join_date,
          p.totalProfitsWithdrawn || p.total_profits_withdrawn || 0,
          p.status || 'active',
          p.notes || '',
        ]
      );
    }

    // 7. Partner Payouts
    for (const po of payouts) {
      await client.query(
        `INSERT INTO public.partner_payouts (id, partner_id, partner_name, date, amount, period, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           period = EXCLUDED.period,
           payment_method = EXCLUDED.payment_method,
           notes = EXCLUDED.notes`,
        [
          po.id,
          po.partnerId || po.partner_id,
          po.partnerName || po.partner_name || 'شريك',
          po.date,
          po.amount || 0,
          po.period || 'الربع الحالي',
          po.paymentMethod || po.payment_method || 'نقدي',
          po.notes || '',
        ]
      );
    }

    // 8. Attendance Logs
    for (const att of attendanceLogs) {
      await client.query(
        `INSERT INTO public.attendance_logs (id, worker_id, date, check_in, check_out, delay_minutes, permit_type, is_permitted, worked_hours, deduction_amount, status, gate, recorded_by, recorded_by_id, method, midday_exit, midday_return, midday_minutes, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO UPDATE SET
           check_out = EXCLUDED.check_out,
           delay_minutes = EXCLUDED.delay_minutes,
           worked_hours = EXCLUDED.worked_hours,
           deduction_amount = EXCLUDED.deduction_amount,
           status = EXCLUDED.status`,
        [
          att.id,
          att.workerId || att.worker_id,
          att.date,
          att.checkIn || att.check_in || null,
          att.checkOut || att.check_out || null,
          att.delayMinutes || att.delay_minutes || 0,
          att.permitType || att.permit_type || null,
          Boolean(att.isPermitted || att.is_permitted),
          att.workedHours || att.worked_hours || 0,
          att.deductionAmount || att.deduction_amount || 0,
          att.status || 'present',
          att.gate || 'بوابة أفراد (أ)',
          att.recordedBy || att.recorded_by || null,
          att.recordedById || att.recorded_by_id || null,
          att.method || 'qr',
          att.middayExit || att.midday_exit || null,
          att.middayReturn || att.midday_return || null,
          att.middayMinutes || att.midday_minutes || 0,
          att.notes || '',
        ]
      );
    }

    // 9. Incentives & Penalties
    for (const ip of incentivePenalties) {
      await client.query(
        `INSERT INTO public.incentives_penalties (id, worker_id, type, category, amount, calc_mode, calc_value, notes, date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           amount = EXCLUDED.amount,
           calc_mode = EXCLUDED.calc_mode,
           calc_value = EXCLUDED.calc_value,
           notes = EXCLUDED.notes,
           date = EXCLUDED.date,
           status = EXCLUDED.status`,
        [
          ip.id,
          ip.workerId || ip.worker_id,
          ip.type || 'incentive',
          ip.category || 'مكافأة تميز',
          ip.amount || 0,
          ip.calcMode || ip.calc_mode || 'fixed',
          ip.calcValue || ip.calc_value || 0,
          ip.notes || '',
          ip.date || new Date().toISOString().split('T')[0],
          ip.status || 'approved-added',
        ]
      );
    }

    // 10. Expenses
    for (const exp of expenses) {
      await client.query(
        `INSERT INTO public.expenses (id, type, category, title, amount, date, time, payment_method, receipt_ref, party, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           category = EXCLUDED.category,
           title = EXCLUDED.title,
           amount = EXCLUDED.amount,
           date = EXCLUDED.date,
           payment_method = EXCLUDED.payment_method,
           party = EXCLUDED.party,
           notes = EXCLUDED.notes`,
        [
          exp.id,
          exp.type || 'out',
          exp.category,
          exp.title,
          exp.amount || 0,
          exp.date,
          exp.time || null,
          exp.paymentMethod || exp.payment_method || 'cash',
          exp.receiptRef || exp.receipt_ref || null,
          exp.party || 'جهة خارجية',
          exp.notes || '',
          exp.recordedBy || exp.recorded_by || null,
        ]
      );
    }

    // 11. Charity Donations
    for (const ch of charities) {
      await client.query(
        `INSERT INTO public.charity_donations (id, title, category, amount, date, time, beneficiary, source, payment_method, representative, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           amount = EXCLUDED.amount,
           date = EXCLUDED.date,
           beneficiary = EXCLUDED.beneficiary,
           source = EXCLUDED.source,
           payment_method = EXCLUDED.payment_method,
           representative = EXCLUDED.representative,
           notes = EXCLUDED.notes`,
        [
          ch.id,
          ch.title,
          ch.category,
          ch.amount || 0,
          ch.date,
          ch.time || null,
          ch.beneficiary,
          ch.source || 'company_percentage',
          ch.paymentMethod || ch.payment_method || 'cash',
          ch.representative || 'م. حسام الدين عبد الرحيم',
          ch.notes || '',
        ]
      );
    }

    // 12. Customer Loans
    for (const cl of customerLoans) {
      await client.query(
        `INSERT INTO public.customer_loans (id, customer_id, date, time, type, amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           type = EXCLUDED.type,
           amount = EXCLUDED.amount,
           notes = EXCLUDED.notes`,
        [
          cl.id,
          cl.customerId || cl.customer_id,
          cl.date,
          cl.time || null,
          cl.type || 'lend',
          cl.amount || 0,
          cl.notes || '',
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'تم حفظ وتحديث كافة الجداول بنجاح في مجمع معاملات PostgreSQL في Supabase!',
    });
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    const isAuth = isAuthenticationError(err);
    if (isAuth) {
      isDbAuthFailing = true;
      lastAuthErrorMessage = err.message;
    }
    console.warn('Migrate synchronization warning:', err.message);
    return res.json({
      success: false,
      connected: false,
      isAuthError: isAuth,
      message: isAuth
        ? 'تعذر ترحيل البيانات إلى Supabase بسبب عدم تطابق كلمة المرور. تم حفظ كافة البيانات محلياً في المتصفح بأمان.'
        : err.message,
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

app.post('/api/db/clear', async (req: Request, res: Response) => {
  const confirmKey = req.headers['x-admin-key'] || req.body?.confirmKey;
  if (confirmKey !== 'SAHAB_FACTORY_CONFIRM_CLEAR_2026') {
    return res.status(403).json({
      success: false,
      message: 'عملية تصفير قاعدة البيانات محظورة أمنياً. تتطلب مفتاح التأكيد الإداري.',
    });
  }

  const pool = getDbPool();
  if (!pool) {
    return res.status(400).json({ success: false, message: 'DATABASE_URL غير مهيأ' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const tables = [
      'attendance_logs',
      'incentives_penalties',
      'payment_vouchers',
      'invoices',
      'customer_loans',
      'customers',
      'partner_payouts',
      'partners',
      'workers',
      'expenses',
      'charity_donations',
      'assistants',
    ];
    for (const t of tables) {
      await client.query(`TRUNCATE TABLE public.${t} CASCADE`);
    }
    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'تم تصفير كافة الجداول في قاعدة بيانات Supabase بنجاح (0 سجلات).',
    });
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// ============================================================================
// Vite Middleware & Static Serving
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAHAB ERP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
