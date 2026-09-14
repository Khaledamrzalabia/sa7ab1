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
    connectionTimeoutMillis: 6000,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const p = getPool();
    const result = await p.query('SELECT NOW() as now');
    return res.status(200).json({
      connected: true,
      isConfigured: true,
      message: 'متصل بالسحابة (Supabase) اللحظية',
      timestamp: result.rows[0]?.now,
    });
  } catch (err: any) {
    console.error('Supabase health check error:', err?.message || err);
    return res.status(200).json({
      connected: false,
      isConfigured: true,
      message: 'تعذر الاتصال بقاعدة البيانات السحابية: ' + (err?.message || 'خطأ في الاتصال'),
    });
  }
}
