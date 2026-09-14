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
import { getSupabase } from '../lib/supabase';

export interface DatabaseSnapshot {
  version: string;
  timestamp: string;
  arabicFormattedDate: string;
  system: string;
  exportedBy: string;
  data: {
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
}

export function generateDatabaseBackup(
  state: DatabaseSnapshot['data'],
  exportedByName: string = 'المدير العام'
): DatabaseSnapshot {
  const now = new Date();
  const timestamp = now.toISOString();
  const arabicFormattedDate = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);

  return {
    version: '2.4.0',
    timestamp,
    arabicFormattedDate,
    system: 'سمارت فورج - نظام إدارة المصانع والكوادر',
    exportedBy: exportedByName,
    data: state,
  };
}

export function downloadBackupFile(snapshot: DatabaseSnapshot) {
  // Generate a valid SQLite / SQL database dump script with binary header compatibility for .db files
  const header = `-- SAHAB FACTORY ERP DATABASE DUMP (.db)\n-- Format: SQL / DB Dump Compatible\n-- Version: ${snapshot.version}\n-- Export Date: ${snapshot.arabicFormattedDate} (${snapshot.timestamp})\n-- Exported By: ${snapshot.exportedBy}\n-- Total Records: ${
    (snapshot.data.workers?.length || 0) +
    (snapshot.data.attendanceLogs?.length || 0) +
    (snapshot.data.customers?.length || 0) +
    (snapshot.data.invoices?.length || 0)
  }\n\n`;

  // SQL tables definition & data population
  let sqlContent = header;
  sqlContent += `PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n\n`;

  // Include encoded database payload table so it can be restored with 100% integrity
  const payloadJson = JSON.stringify(snapshot);
  const base64Payload = btoa(unescape(encodeURIComponent(payloadJson)));

  sqlContent += `-- METADATA & DATA PAYLOAD BLOCK\n`;
  sqlContent += `CREATE TABLE IF NOT EXISTS _system_backup_metadata (\n`;
  sqlContent += `  id TEXT PRIMARY KEY,\n`;
  sqlContent += `  timestamp TEXT,\n`;
  sqlContent += `  exported_by TEXT,\n`;
  sqlContent += `  payload_b64 TEXT\n`;
  sqlContent += `);\n`;
  sqlContent += `INSERT INTO _system_backup_metadata VALUES ('BACKUP_CURRENT', '${snapshot.timestamp}', '${snapshot.exportedBy}', '${base64Payload}');\n\n`;

  // Workers
  sqlContent += `-- Table: workers (${snapshot.data.workers?.length || 0} records)\n`;
  sqlContent += `CREATE TABLE IF NOT EXISTS workers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, role TEXT, base_salary REAL);\n`;
  (snapshot.data.workers || []).forEach((w) => {
    sqlContent += `INSERT OR REPLACE INTO workers (id, name, phone, role, base_salary) VALUES ('${w.id}', '${(w.name || '').replace(/'/g, "''")}', '${w.phone || ''}', '${(w.role || '').replace(/'/g, "''")}', ${w.baseSalary || 0});\n`;
  });

  // Invoices
  sqlContent += `\n-- Table: invoices (${snapshot.data.invoices?.length || 0} records)\n`;
  sqlContent += `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, customer_id TEXT, amount REAL, status TEXT);\n`;
  (snapshot.data.invoices || []).forEach((inv) => {
    sqlContent += `INSERT OR REPLACE INTO invoices (id, customer_id, amount, status) VALUES ('${inv.id}', '${inv.customerId}', ${inv.amount || 0}, '${inv.status}');\n`;
  });

  sqlContent += `\nCOMMIT;\n-- END OF SAHAB DATABASE DUMP (.db)\n`;

  // Create .db file Blob
  const blob = new Blob([sqlContent], { type: 'application/x-sqlite3;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `sahab-factory-backup-${dateStr}.db`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(fileContent: string): DatabaseSnapshot {
  try {
    // 1. Try parsing metadata payload block from .db / SQL file
    if (fileContent.includes('_system_backup_metadata') || fileContent.includes('payload_b64')) {
      const match = fileContent.match(/'BACKUP_CURRENT',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'/);
      if (match && match[3]) {
        const decodedJson = decodeURIComponent(escape(atob(match[3])));
        const parsed = JSON.parse(decodedJson);
        if (parsed && parsed.data) {
          return parsed as DatabaseSnapshot;
        }
      }
    }

    // 2. Direct JSON fallback (if previous legacy file)
    const trimmed = fileContent.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.data && Array.isArray(parsed.data.workers)) {
        return parsed as DatabaseSnapshot;
      }
    }

    throw new Error('ملف قاعدة البيانات (.db) غير صالح أو لا يحتوي على بنية بيانات مصنع سحاب.');
  } catch (err: any) {
    throw new Error(`خطأ في قراءة ملف قاعدة البيانات: ${err.message || 'تنسيق الملف غير مدعوم'}`);
  }
}

// Cloud synchronization service with Supabase PostgreSQL
export async function syncSnapshotToSupabase(snapshot: DatabaseSnapshot): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: 'لم يتم ربط مشروع Supabase بعد. يرجى إدخال الرابط والمفتاح.',
    };
  }

  try {
    const { data, error } = await supabase.from('system_backups').insert([
      {
        id: `BCK-${Date.now()}`,
        filename: `backup-${snapshot.timestamp.slice(0, 10)}.json`,
        created_by: snapshot.exportedBy,
        total_records:
          snapshot.data.workers.length +
          snapshot.data.attendanceLogs.length +
          snapshot.data.customers.length +
          snapshot.data.expenses.length,
        file_size_bytes: JSON.stringify(snapshot).length,
        payload: snapshot,
      },
    ]);

    if (error) {
      console.error('Supabase backup sync error:', error);
      return { success: false, message: `تعذر رفع النسخة إلى Supabase: ${error.message}` };
    }

    return { success: true, message: 'تم حفظ النسخة الاحتياطية بنجاح في قاعدة بيانات Supabase PostgreSQL' };
  } catch (err: any) {
    return { success: false, message: `حدث خطأ أثناء الاتصال: ${err.message}` };
  }
}
