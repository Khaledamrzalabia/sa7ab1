import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import crypto from 'crypto';

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
    connectionTimeoutMillis: 6000,
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

  const { identifier, password } = req.body || {};
  const trimmedId = (identifier || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedId || !trimmedPass) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // 1. Production Owner / General Manager Check
  const adminPass = process.env.ADMIN_PASSWORD || '@Mm7677943@';
  const isOwner =
    trimmedId.toLowerCase() === 'admin' ||
    trimmedId === 'محمد صلاح' ||
    trimmedId === '01098452103';

  if (isOwner && trimmedPass === adminPass) {
    const ownerSession = {
      type: 'owner',
      id: 'OWNER-01',
      name: 'محمد صلاح',
      username: 'admin',
      roleTitle: 'المدير العام (General Manager)',
      phone: '01098452103',
      token: 'OWNER-TOKEN-PRODUCTION-AUTHENTICATED',
      permissions: {
        canCheckIn: true,
        canCheckOut: true,
        canRecordPermissions: true,
        canAddManualPenalties: true,
        canViewDailySummary: true,
        canPrintCards: true,
      },
    };
    return res.status(200).json({ success: true, user: ownerSession, token: ownerSession.token });
  }

  // 2. Query Supabase assistants table
  try {
    const p = getPool();
    const result = await p.query(
      `SELECT * FROM public.assistants WHERE (LOWER(username) = LOWER($1) OR phone = $1 OR id = $1) LIMIT 1`,
      [trimmedId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'هذا الحساب معلق حالياً من قِبل إدارة المصنع.' });
      }

      if (row.password === trimmedPass) {
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
          roleTitle: row.role_title || 'مشرف وردية',
          token: `AST-TOKEN-${row.id}-${Date.now()}`,
          permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
        };

        return res.status(200).json({ success: true, user: session, token: session.token });
      } else {
        return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
      }
    }
  } catch (err: any) {
    console.error('Login DB check error:', err?.message || err);
  }

  return res.status(401).json({
    success: false,
    message: 'بيانات الاعتماد غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور.',
  });
}
