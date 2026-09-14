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
  PayrollApproval,
} from './types';

// Helper to calculate wages based on standard 30 working days and 8 daily hours (240 hrs / month)
export function calculateWorkerRates(baseSalary: number = 0) {
  const salary = Number(baseSalary) || 0;
  const dailyRate = salary > 0 ? salary / 30 : 0;
  const hourlyRate = salary > 0 ? salary / 240 : 0;
  const minuteRate = salary > 0 ? salary / (240 * 60) : 0; // baseSalary / 14400
  return {
    dailyRate: parseFloat(dailyRate.toFixed(2)),
    hourlyRate: parseFloat(hourlyRate.toFixed(2)),
    minuteRate: parseFloat(minuteRate.toFixed(3)),
  };
}

export function calculatePartnerShares(partnersList: Partner[]) {
  const totalCapital = partnersList.reduce((sum, p) => sum + (p.capital || 0), 0);
  return partnersList.map((p) => ({
    ...p,
    sharePercentage: totalCapital > 0 ? parseFloat((((Number(p.capital) || 0) / totalCapital) * 100).toFixed(2)) : 0,
  }));
}

// Zeroed-out database initial states (Driven 100% by PostgreSQL Supabase Database)
export const initialWorkers: Worker[] = [];
export const initialAttendanceLogs: AttendanceLog[] = [];
export const initialIncentivesPenalties: IncentivePenalty[] = [];
export const initialCustomers: Customer[] = [];
export const initialInvoices: Invoice[] = [];
export const initialPaymentVouchers: PaymentVoucher[] = [];
export const initialPartners: Partner[] = [];
export const initialPartnerPayouts: PartnerPayout[] = [];
export const initialExpenses: Expense[] = [];
export const initialCharities: CharityDonation[] = [];
export const initialAssistants: Assistant[] = [];
export const initialCustomerLoans: CustomerLoan[] = [];
export const initialPayrollApprovals: PayrollApproval[] = [];
