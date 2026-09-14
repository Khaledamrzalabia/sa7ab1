export interface Worker {
  id: string;
  shortCode: string;   // الكود الرقمي المختصر السريع (مثال: 101، 102، 105)
  name: string;
  role: string;
  phone?: string;
  nationalId: string;
  department: string;
  line: string;
  baseSalary: number; // بالجنيه المصري (ج.م)
  dailyRate: number;  // الراتب / 30 يوم
  hourlyRate: number; // الراتب / 240 ساعة (30 يوم × 8 ساعات)
  minuteRate: number; // أجر الدقيقة (الراتب / 14400 دقيقة)
  shiftStart: string;
  shiftEnd: string;
  status: 'active' | 'leave' | 'inactive';
  notes?: string;          // ملاحظات إدارية عامة
  discountNotes?: string;  // ملاحظات في خانة الخصم
  manualDiscount?: number; // قيمة الخصم المسجل بالجنيه
  hasDiscount?: boolean;   // هل يوجد خصم مسجل
  bonusNotes?: string;     // ملاحظات في خانة المكافأة / البونص
  manualBonus?: number;    // قيمة المكافأة المسجلة بالجنيه
  hasBonus?: boolean;      // هل يوجد بونص مسجل
  monthlyRegularityBonus?: number; // قيمة مكافأة الانتظام الشهري الأساسية (افتراضي 500 ج.م)
  isArchived?: boolean;    // حالة الأرشفة / إلغاء التفعيل الآمن
}

export interface AttendanceLog {
  id: string;
  workerId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  delayMinutes: number;
  permitType: string | null;
  isPermitted: boolean;
  workedHours: number;
  deductionAmount: number;
  status: 'present' | 'late' | 'permitted' | 'early-exit' | 'absent';
  gate: string;
  recordedBy?: string; // اسم المساعد أو المشرف أو الإدارة التي قامت بالتحضير
  recordedById?: string; // معرف المساعد
  method?: 'qr' | 'manual_code' | 'manual_admin'; // طريقة التحضير
  middayExit?: string | null; // وقت الخروج في إذن منتصف اليوم
  middayReturn?: string | null; // وقت العودة من إذن منتصف اليوم
  middayMinutes?: number; // مدة الإذن بالدقائق
  notes?: string;
}

export interface IncentivePenalty {
  id: string;
  workerId: string;
  type: 'incentive' | 'penalty';
  category: string;
  amount: number;
  calcMode: 'fixed' | 'days' | 'hours';
  calcValue: number;
  notes: string;
  date: string;
  status: 'approved-added' | 'final-approved' | 'approved-manager' | 'pending';
}

export interface Customer {
  id: string;
  name: string; // اسم العميل
  companyName: string; // اسم الشركة
  contactPerson?: string; // اسم الشخص المسؤول الذي يتم التعامل معه
  phone: string; // رقم التواصل
  category: string;
  commercialReg: string; // السجل التجاري
  ordersCount: number;
  totalDeal: number;
  paidAmount: number;
  dueAmount: number;
  creditLimit: number;
  paymentTerms: string;
  status: 'active-regular' | 'overdue' | 'paid-full' | 'active-limit' | 'review';
  loansBalance?: number; // رصيد السلف التراكمي (موجب = لينا عنده، سالب = علينا له)
}

export interface InvoiceItem {
  code: string; // كود الصنف
  type: string; // النوع والبيان
  quantity: number; // الكمية المطلوبة
  unitPrice: number; // سعر الوحدة
  total: number; // المجموع الكلي
  delivered: number; // القطع المسلمة / المستلمة (في الآخر بعد المجموع)
}

export interface InvoiceVersion {
  versionNumber: number;
  editedAt: string;
  editedTime: string;
  editReason?: string;
  description: string;
  amount: number;
  paid: number;
  status: 'paid' | 'partial' | 'unpaid';
  type: 'incoming' | 'outgoing';
  items: InvoiceItem[];
}

export interface Invoice {
  id: string; // كود الفاتورة
  customerId: string;
  date: string;
  time?: string;
  description: string;
  amount: number; // الإجمالي الكلي للفاتورة
  paid: number; // المبلغ المستلم/المسدد
  status: 'paid' | 'partial' | 'unpaid';
  type: 'incoming' | 'outgoing'; // صادر أو وارد
  companyName?: string;
  customerName?: string;
  items: InvoiceItem[];
  history?: InvoiceVersion[]; // سجل نسخ وتعديلات الفاتورة
}

export interface PaymentVoucher {
  id: string;
  customerId: string;
  date: string;
  time?: string;
  amount: number;
  method: string;
  invoiceId?: string; // الفاتورة المرتبطة إن وجدت
}

export interface CustomerLoan {
  id: string;
  customerId: string;
  date: string;
  time: string;
  type: 'lend' | 'borrow'; // lend (سلفناه فلوس) or borrow (استلفنا منه)
  amount: number;
  notes: string;
}

// ----------------------------------------------------
// شراكة المستثمرين وأصحاب الشركة (Partnership & Capital)
// ----------------------------------------------------
export interface Partner {
  id: string;
  name: string; // اسم الشريك / المستثمر
  phone: string; // رقم الهاتف
  nationalId?: string; // الرقم القومي
  roleTitle?: string; // صفة الشريك (شريك مؤسس، مستثمر ممول، شريك تنفيذي)
  capital: number; // رأس المال المستثمر بالجنيه المصري (ج.م)
  sharePercentage: number; // نسبة الشراكة % من إجمالي رأس مال الشركة
  joinDate: string; // تاريخ بدء الشراكة
  totalProfitsWithdrawn: number; // إجمالي الأرباح المسحوبة / المصروفة
  status: 'active' | 'silent' | 'exited'; // شريك نشط / شريك موصي / منسحب
  notes?: string; // ملاحظات الشراكة
}

export interface PartnerPayout {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  amount: number; // المبلغ المسحوب / الموزع بالجنيه
  period: string; // عن فترة (مثال: أرباح ربع أول 2024)
  paymentMethod: string;
  notes?: string;
}

// ----------------------------------------------------
// المصروفات والإيرادات - الداخل والخارج (Expenses & Cashflow)
// ----------------------------------------------------
export interface Expense {
  id: string;
  type: 'in' | 'out'; // 'in' = داخل (إيراد/مقبوضات)، 'out' = خارج (مصروف/مدفوعات)
  category: string; // خامات إنتاج، صيانة، مرافق وكهرباء، إيجار، نثريات وضيافة، نقل ولوجستيات، إيراد مبيعات، عوائد تشغيل
  title: string; // بيان المعاملة
  amount: number; // المبلغ بالجنيه المصري (ج.م)
  date: string;
  time?: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'instapay' | 'vodafone_cash' | 'cheque';
  receiptRef?: string; // رقم الفاتورة أو إيصال الصرف
  party: string; // الطرف الآخر (المستلم منه أو المصروف له)
  notes?: string;
  recordedBy?: string; // اسم المسؤول عن التقييد
}

// ----------------------------------------------------
// الصدقات وأعمال الخير (Charity & Sadaqah)
// ----------------------------------------------------
export interface CharityDonation {
  id: string;
  title: string; // بيان وبند الصدقة
  category: 'sadaqah' | 'zakat' | 'ongoing_charity' | 'medical_support' | 'food_aid' | 'community';
  amount: number; // المبلغ بالجنيه المصري (ج.م)
  date: string;
  time?: string;
  beneficiary: string; // الجهة المستفيدة / الحالة / المسجد / المستشفى
  source: 'company_percentage' | 'partners_fund' | 'general_charity_box' | 'direct_donation'; // مصدر الصدقة
  paymentMethod: 'cash' | 'bank_transfer' | 'instapay' | 'in_kind';
  notes?: string;
  representative?: string; // المسؤول / المندوب المشرف
}

// ----------------------------------------------------
// المساعدين والمشرفين ومسؤولي التحضير (Assistants & Field Admins)
// ----------------------------------------------------
export interface AssistantPermissions {
  canCheckIn: boolean; // تسجيل الحضور
  canCheckOut: boolean; // تسجيل الانصراف
  canRecordPermissions: boolean; // تسجيل أذونات واستقطاعات منتصف اليوم
  canAddManualPenalties: boolean; // تسجيل ملاحظات وجزاءات سريعة
  canViewDailySummary: boolean; // عرض ملخص وردية اليوم
  canPrintCards: boolean; // استعراض وطباعة بطاقات العمال
}

export interface Assistant {
  id: string;
  name: string; // اسم المساعد أو المشرف
  username: string; // اسم المستخدم للدخول
  phone: string; // رقم التليفون للدخول
  password?: string; // كلمة المرور
  roleTitle: string; // المسمى الوظيفي (مشرف وردية، مراقب بوابات، مسؤول عنبر)
  shift: string; // الوردية المسؤول عنها (الصباحية / المسائية / ليلية)
  gateOrLocation: string; // البوابة أو العنبر المكلف به
  status: 'active' | 'suspended'; // نشط / معلق
  permissions: AssistantPermissions;
  createdAt: string;
  operationsCount: number; // عدد عمليات التحضير المنفذة
  notes?: string;
}

export interface UserSession {
  type: 'owner' | 'assistant';
  id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  token?: string;
  roleTitle: string;
  permissions?: AssistantPermissions;
}

export interface PayrollApproval {
  id: string;
  periodMonth: string; // مثال: '2026-09'
  approvedDate: string;
  approvedBy: string;
  approvedById?: string;
  totalWorkers: number;
  totalNetAmount: number;
  notes?: string;
}

export interface MonthlyRegularityStatus {
  workerId: string;
  workerName: string;
  shortCode: string;
  role: string;
  department: string;
  line: string;
  baseBonus: number; // المبلغ الأساسي للانتظام
  delaysCount: number; // عدد مرات التأخير المسجلة
  delaysList: { date: string; delayMinutes: number }[];
  status: 'full_100' | 'half_50' | 'deduct_50' | 'canceled';
  finalBonus: number; // المبلغ المستحق النهائي
  deductionAmount: number; // قيمة الخصم من البونص (0 أو 50 ج أو كامل المبلغ)
  disbursementDate: string; // يوم 20 من الشهر التالي (مثال: '2026-06-20')
  explanation: string;
}

export interface WeeklyRegularityCandidate {
  workerId: string;
  workerName: string;
  shortCode: string;
  role: string;
  department: string;
  line: string;
  totalDelayMinutes: number;
  totalPenaltiesCount: number;
  totalWorkedHours: number;
  daysPresent: number;
  avgEarlyMinutes: number;
  isQualified: boolean; // 0 تأخير و0 جزاءات
  rank?: number; // 1 to 4 للأربعة الأوائل
  isWinner: boolean;
  bonusAmount: number; // 100 ج.م للفائزين
  disqualificationReason?: string;
}


