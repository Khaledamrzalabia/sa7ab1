-- ============================================================================
-- SAHAB FACTORY ERP & SMART ATTENDANCE SYSTEM - PostgreSQL / Supabase Schema
-- نظام سحاب لإدارة مصانع الملابس الجاهزة، الكوادر، كود الحضور، والحسابات
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. جدول الكوادر والعمال (Workers / Employees)
CREATE TABLE IF NOT EXISTS public.workers (
    id VARCHAR(64) PRIMARY KEY,
    short_code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    national_id VARCHAR(32) NOT NULL,
    department VARCHAR(255) NOT NULL,
    line VARCHAR(255) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    minute_rate NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    shift_start VARCHAR(64) DEFAULT '08:00 ص',
    shift_end VARCHAR(64) DEFAULT '04:00 م',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    notes TEXT DEFAULT '',
    discount_notes TEXT DEFAULT '',
    manual_discount NUMERIC(12, 2) DEFAULT 0.00,
    has_discount BOOLEAN DEFAULT false,
    bonus_notes TEXT DEFAULT '',
    manual_bonus NUMERIC(12, 2) DEFAULT 0.00,
    has_bonus BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_short_code ON public.workers (short_code);
CREATE INDEX IF NOT EXISTS idx_workers_national_id ON public.workers (national_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers (status);
CREATE INDEX IF NOT EXISTS idx_workers_department ON public.workers (department);

-- 2. جدول المساعدين والمشرفين (Assistants & Field Admins)
CREATE TABLE IF NOT EXISTS public.assistants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL DEFAULT '123',
    role_title VARCHAR(255) NOT NULL,
    shift VARCHAR(255) NOT NULL,
    gate_or_location VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    permissions JSONB NOT NULL DEFAULT '{"canCheckIn": true, "canCheckOut": true, "canRecordPermissions": true, "canAddManualPenalties": true, "canViewDailySummary": true, "canPrintCards": true}'::jsonb,
    operations_count INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistants_username ON public.assistants (username);
CREATE INDEX IF NOT EXISTS idx_assistants_phone ON public.assistants (phone);

-- 3. جدول سجلات الحضور والانصراف بالدقيقة (Attendance Logs)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id VARCHAR(64) PRIMARY KEY,
    worker_id VARCHAR(64) NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in VARCHAR(64),
    check_out VARCHAR(64),
    delay_minutes INTEGER DEFAULT 0,
    permit_type VARCHAR(255),
    is_permitted BOOLEAN DEFAULT false,
    worked_hours NUMERIC(6, 2) DEFAULT 0.00,
    deduction_amount NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'present',
    gate VARCHAR(255) NOT NULL DEFAULT 'بوابة أفراد (أ)',
    recorded_by VARCHAR(255),
    recorded_by_id VARCHAR(64),
    method VARCHAR(64) DEFAULT 'qr',
    midday_exit VARCHAR(64),
    midday_return VARCHAR(64),
    midday_minutes INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON public.attendance_logs (worker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_logs (date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_logs (status);

-- 4. جدول الحوافز والجزاءات الإدارية (Incentives & Penalties)
CREATE TABLE IF NOT EXISTS public.incentives_penalties (
    id VARCHAR(64) PRIMARY KEY,
    worker_id VARCHAR(64) NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'incentive' | 'penalty'
    category VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    calc_mode VARCHAR(32) NOT NULL DEFAULT 'fixed',
    calc_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT DEFAULT '',
    date DATE NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'approved-added',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incentives_worker ON public.incentives_penalties (worker_id);
CREATE INDEX IF NOT EXISTS idx_incentives_date ON public.incentives_penalties (date);
CREATE INDEX IF NOT EXISTS idx_incentives_type ON public.incentives_penalties (type);

-- 5. جدول حسابات العملاء والتوريد (Customers & Clients)
CREATE TABLE IF NOT EXISTS public.customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    commercial_reg VARCHAR(100),
    orders_count INTEGER DEFAULT 0,
    total_deal NUMERIC(14, 2) DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) DEFAULT 0.00,
    due_amount NUMERIC(14, 2) DEFAULT 0.00,
    credit_limit NUMERIC(14, 2) DEFAULT 0.00,
    payment_terms VARCHAR(255) DEFAULT 'سداد نقدي',
    status VARCHAR(64) DEFAULT 'active-regular',
    loans_balance NUMERIC(14, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);

-- 6. جدول فواتير العملاء والتوريد (Invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time VARCHAR(64),
    description TEXT,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    type VARCHAR(32) NOT NULL DEFAULT 'outgoing',
    company_name VARCHAR(255),
    customer_name VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices (date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);

-- 7. جدول سندات القبض والدفع (Payment Vouchers)
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time VARCHAR(64),
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    method VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(64) REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON public.payment_vouchers (customer_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON public.payment_vouchers (date);

-- 7.1 جدول سلف واستلاف العملاء (Customer Loans & Debts)
CREATE TABLE IF NOT EXISTS public.customer_loans (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time VARCHAR(64),
    type VARCHAR(16) NOT NULL DEFAULT 'lend', -- 'lend' (سلفناه) | 'borrow' (استلفنا منه)
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_customer ON public.customer_loans (customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_date ON public.customer_loans (date);

-- 7.2 جدول توثيق اعتمادات مسير الرواتب (Monthly Payroll Approvals)
CREATE TABLE IF NOT EXISTS public.payroll_approvals (
    id VARCHAR(64) PRIMARY KEY,
    period_month VARCHAR(32) NOT NULL, -- مثال: '2026-09'
    approved_date VARCHAR(64) NOT NULL,
    approved_by VARCHAR(255) NOT NULL,
    approved_by_id VARCHAR(64),
    total_workers INTEGER NOT NULL DEFAULT 0,
    total_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_approvals_period ON public.payroll_approvals (period_month);

-- 8. جدول الشركاء ورؤوس الأموال (Partners & Capital)
CREATE TABLE IF NOT EXISTS public.partners (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    national_id VARCHAR(32),
    role_title VARCHAR(255) NOT NULL,
    capital NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    share_percentage NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    join_date DATE NOT NULL,
    total_profits_withdrawn NUMERIC(14, 2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. جدول مسحوبات وتوزيعات الأرباح (Partner Payouts)
CREATE TABLE IF NOT EXISTS public.partner_payouts (
    id VARCHAR(64) PRIMARY KEY,
    partner_id VARCHAR(64) NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    partner_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    period VARCHAR(255) NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_partner ON public.partner_payouts (partner_id);

-- 10. جدول المصروفات والإيرادات - حركة الداخل والخارج (Expenses & Cashflow)
CREATE TABLE IF NOT EXISTS public.expenses (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(16) NOT NULL, -- 'in' | 'out'
    category VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    time VARCHAR(64),
    payment_method VARCHAR(64) NOT NULL DEFAULT 'cash',
    receipt_ref VARCHAR(255),
    party VARCHAR(255) NOT NULL,
    notes TEXT DEFAULT '',
    recorded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses (type);

-- 11. جدول الصدقات وأعمال الخير (Charity & Zakat)
CREATE TABLE IF NOT EXISTS public.charity_donations (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(64) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    time VARCHAR(64),
    beneficiary VARCHAR(255) NOT NULL,
    source VARCHAR(64) NOT NULL,
    payment_method VARCHAR(64) NOT NULL DEFAULT 'cash',
    representative VARCHAR(255),
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charity_date ON public.charity_donations (date);

-- 12. جدول النسخ الاحتياطية وإعدادات النظام (System Backups & Settings)
CREATE TABLE IF NOT EXISTS public.system_backups (
    id VARCHAR(64) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    total_records INTEGER NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Triggers and Automatic Updated At Helper
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_workers_updated_at
BEFORE UPDATE ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_assistants_updated_at
BEFORE UPDATE ON public.assistants
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trigger_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Enablement & Policies
-- ============================================================================
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentives_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access to application client using anon / authenticated roles
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow full access to workers" ON public.workers;
    CREATE POLICY "Allow full access to workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to assistants" ON public.assistants;
    CREATE POLICY "Allow full access to assistants" ON public.assistants FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to attendance_logs" ON public.attendance_logs;
    CREATE POLICY "Allow full access to attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to incentives_penalties" ON public.incentives_penalties;
    CREATE POLICY "Allow full access to incentives_penalties" ON public.incentives_penalties FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to customers" ON public.customers;
    CREATE POLICY "Allow full access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to invoices" ON public.invoices;
    CREATE POLICY "Allow full access to invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to payment_vouchers" ON public.payment_vouchers;
    CREATE POLICY "Allow full access to payment_vouchers" ON public.payment_vouchers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to partners" ON public.partners;
    CREATE POLICY "Allow full access to partners" ON public.partners FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to partner_payouts" ON public.partner_payouts;
    CREATE POLICY "Allow full access to partner_payouts" ON public.partner_payouts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to expenses" ON public.expenses;
    CREATE POLICY "Allow full access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to charity_donations" ON public.charity_donations;
    CREATE POLICY "Allow full access to charity_donations" ON public.charity_donations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to customer_loans" ON public.customer_loans;
    CREATE POLICY "Allow full access to customer_loans" ON public.customer_loans FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to payroll_approvals" ON public.payroll_approvals;
    CREATE POLICY "Allow full access to payroll_approvals" ON public.payroll_approvals FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to system_backups" ON public.system_backups;
    CREATE POLICY "Allow full access to system_backups" ON public.system_backups FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow full access to app_settings" ON public.app_settings;
    CREATE POLICY "Allow full access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Real-Time Broadcast on tables for Instant Live Updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.workers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incentives_penalties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.charity_donations;
