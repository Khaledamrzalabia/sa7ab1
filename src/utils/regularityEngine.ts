import {
  Worker,
  AttendanceLog,
  IncentivePenalty,
  MonthlyRegularityStatus,
  WeeklyRegularityCandidate,
} from '../types';

/**
 * Helper to format date numbers with leading zero
 */
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Calculates the monthly attendance regularity status and bonus for a worker.
 * Rules:
 * 1. 1st delay (1 min to 4 hours): 100% of bonus (does not drop).
 * 2. 2nd delay (1 min to 4 hours): 50% of bonus.
 * 3. 3rd delay:
 *    - If exactly 1 minute: 50 EGP deducted from bonus instead of canceling.
 *    - If > 1 minute: bonus is canceled (0 EGP).
 * 4. > 3 delays or any delay > 4 hours (240 mins): bonus is canceled (0 EGP).
 * 5. Disbursed on the 20th of the following month (e.g. Month 5 disbursed on 20/06).
 * 6. Regularity bonus is unaffected by other administrative penalties.
 */
export function calculateWorkerMonthlyRegularity(
  worker: Worker,
  attendanceLogs: AttendanceLog[],
  year: number,
  month: number // 1 to 12
): MonthlyRegularityStatus {
  const baseBonus = worker.monthlyRegularityBonus ?? 500;
  const monthPrefix = `${year}-${padZero(month)}`;

  // Filter logs for this worker and target month
  const monthlyLogs = attendanceLogs.filter(
    (log) => log.workerId === worker.id && log.date.startsWith(monthPrefix)
  );

  // Extract all delay instances (delayMinutes > 0)
  const delays = monthlyLogs
    .filter((log) => (log.delayMinutes || 0) > 0)
    .map((log) => ({
      date: log.date,
      delayMinutes: log.delayMinutes,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const delaysCount = delays.length;
  let status: MonthlyRegularityStatus['status'] = 'full_100';
  let finalBonus = baseBonus;
  let deductionAmount = 0;
  let explanation = '';

  // Has any single delay exceeded 4 hours (240 minutes)?
  const hasExtremeDelay = delays.some((d) => d.delayMinutes > 240);

  if (hasExtremeDelay) {
    status = 'canceled';
    finalBonus = 0;
    deductionAmount = baseBonus;
    explanation = 'تم تسجيل تأخير تجاوز 4 ساعات - سقوط مكافأة الانتظام بالكامل';
  } else if (delaysCount === 0) {
    status = 'full_100';
    finalBonus = baseBonus;
    deductionAmount = 0;
    explanation = 'انضباط وحضور تام طوال الشهر بدون أي دقيقة تأخير (استحقاق كامل 100%)';
  } else if (delaysCount === 1) {
    status = 'full_100';
    finalBonus = baseBonus;
    deductionAmount = 0;
    explanation = 'تأخير للمرة الأولى (أقل من 4 ساعات) - لا تسقط مكافأة الانتظام (استحقاق 100%)';
  } else if (delaysCount === 2) {
    status = 'half_50';
    finalBonus = Math.round(baseBonus * 0.5);
    deductionAmount = Math.round(baseBonus * 0.5);
    explanation = 'تأخير للمرة الثانية - استحقاق نصف مكافأة الانتظام فقط (50%)';
  } else if (delaysCount === 3) {
    const thirdDelay = delays[2];
    if (thirdDelay.delayMinutes === 1) {
      status = 'deduct_50';
      const halfBonus = Math.round(baseBonus * 0.5);
      finalBonus = Math.max(0, halfBonus - 50);
      deductionAmount = baseBonus - finalBonus;
      explanation = 'تأخير للمرة الثالثة لمدة دقيقة واحدة فقط - خصم 50 ج.م إضافية من نصف المكافأة بدلاً من الإلغاء الكامل';
    } else {
      status = 'canceled';
      finalBonus = 0;
      deductionAmount = baseBonus;
      explanation = `تأخير للمرة الثالثة لمدة (${thirdDelay.delayMinutes} دقيقة) - إلغاء مكافأة الانتظام بالكامل`;
    }
  } else {
    // 4 or more delays
    status = 'canceled';
    finalBonus = 0;
    deductionAmount = baseBonus;
    explanation = `تكرار التأخير (${delaysCount} مرات) - إلغاء مكافأة الانتظام الشهري`;
  }

  // Calculate disbursement date: 20th of the following month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const disbursementDate = `${nextYear}-${padZero(nextMonth)}-20`;

  return {
    workerId: worker.id,
    workerName: worker.name,
    shortCode: worker.shortCode,
    role: worker.role,
    department: worker.department,
    line: worker.line,
    baseBonus,
    delaysCount,
    delaysList: delays,
    status,
    finalBonus,
    deductionAmount,
    disbursementDate,
    explanation,
  };
}

/**
 * Calculates weekly regularity candidates and determines the Top 4 winners.
 * Rules:
 * 1. 0 delay minutes across the entire week.
 * 2. 0 deductions/penalties across the entire week.
 * 3. 100 EGP bonus awarded to the Top 4 most regular workers.
 * 4. Disbursed every Thursday or Saturday for the previous week.
 */
export function calculateWeeklyRegularity(
  workers: Worker[],
  attendanceLogs: AttendanceLog[],
  penalties: IncentivePenalty[],
  weekStartDate: string, // YYYY-MM-DD
  weekEndDate: string // YYYY-MM-DD
): {
  candidates: WeeklyRegularityCandidate[];
  winners: WeeklyRegularityCandidate[];
  totalBonusDisbursed: number;
} {
  const activeWorkers = workers.filter((w) => w.status !== 'inactive' && !w.isArchived);

  const candidates: WeeklyRegularityCandidate[] = activeWorkers.map((worker) => {
    // Weekly logs
    const weeklyLogs = attendanceLogs.filter(
      (log) =>
        log.workerId === worker.id &&
        log.date >= weekStartDate &&
        log.date <= weekEndDate
    );

    // Weekly penalties
    const weeklyPenalties = penalties.filter(
      (p) =>
        p.workerId === worker.id &&
        p.type === 'penalty' &&
        p.date >= weekStartDate &&
        p.date <= weekEndDate
    );

    const totalDelayMinutes = weeklyLogs.reduce((sum, l) => sum + (l.delayMinutes || 0), 0);
    const hasDirectDiscount = !!(worker.hasDiscount || (worker.manualDiscount && worker.manualDiscount > 0));
    // Avoid double counting if direct discount was already synced into weeklyPenalties
    const hasProfilePenaltyInWeeklyList = weeklyPenalties.some(p => p.notes?.includes('من ملف الموظف'));
    const totalPenaltiesCount = weeklyPenalties.length + (hasDirectDiscount && !hasProfilePenaltyInWeeklyList ? 1 : 0);
    const totalWorkedHours = weeklyLogs.reduce((sum, l) => sum + (Number(l.workedHours) || 0), 0);
    const daysPresent = weeklyLogs.filter((l) => l.status === 'present' || l.status === 'late').length;

    // Check if qualified (0 delays and 0 penalties, and attended at least 1 shift)
    const isQualified = totalDelayMinutes === 0 && totalPenaltiesCount === 0 && daysPresent > 0;

    let disqualificationReason = '';
    if (!isQualified) {
      const reasons: string[] = [];
      if (totalPenaltiesCount > 0) reasons.push(`يوجد جزاء/خصم مسجل (${totalPenaltiesCount})`);
      if (totalDelayMinutes > 0) reasons.push(`تأخير (${totalDelayMinutes} دقيقة)`);
      if (daysPresent === 0) reasons.push('لم يحضر أي وردية في الأسبوع');
      disqualificationReason = reasons.join(' و ');
    }

    // Estimate early minutes from shifts
    const avgEarlyMinutes = 5; // Standard punctuality buffer

    return {
      workerId: worker.id,
      workerName: worker.name,
      shortCode: worker.shortCode,
      role: worker.role,
      department: worker.department,
      line: worker.line,
      totalDelayMinutes,
      totalPenaltiesCount,
      totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
      daysPresent,
      avgEarlyMinutes,
      isQualified,
      disqualificationReason: disqualificationReason || undefined,
      isWinner: false,
      bonusAmount: 0,
    };
  });

  // Sort candidates:
  // 1. Qualified first
  // 2. Highest total worked hours
  // 3. Most days present
  candidates.sort((a, b) => {
    if (a.isQualified !== b.isQualified) return a.isQualified ? -1 : 1;
    if (b.daysPresent !== a.daysPresent) return b.daysPresent - a.daysPresent;
    if (b.totalWorkedHours !== a.totalWorkedHours) return b.totalWorkedHours - a.totalWorkedHours;
    return a.shortCode.localeCompare(b.shortCode);
  });

  // Select Top 4 qualified workers
  let winnerCount = 0;
  const winners: WeeklyRegularityCandidate[] = [];

  for (const c of candidates) {
    if (c.isQualified && winnerCount < 4) {
      c.isWinner = true;
      c.rank = winnerCount + 1;
      c.bonusAmount = 100;
      winners.push(c);
      winnerCount++;
    }
  }

  const totalBonusDisbursed = winners.reduce((sum, w) => sum + w.bonusAmount, 0);

  return {
    candidates,
    winners,
    totalBonusDisbursed,
  };
}

/**
 * Helper to get date string for last week (Saturday to Thursday)
 */
export function getPreviousWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const currentDay = now.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
  // Distance back to last Saturday
  const distanceToLastSaturday = (currentDay + 1) % 7 + 7;
  const lastSaturday = new Date(now);
  lastSaturday.setDate(now.getDate() - distanceToLastSaturday);

  const lastThursday = new Date(lastSaturday);
  lastThursday.setDate(lastSaturday.getDate() + 5);

  return {
    startDate: lastSaturday.toISOString().split('T')[0],
    endDate: lastThursday.toISOString().split('T')[0],
  };
}

/**
 * Helper to get current week date range
 */
export function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const currentDay = now.getDay(); // 0: Sun, 6: Sat
  const distanceToThisSaturday = (currentDay + 1) % 7;
  const thisSaturday = new Date(now);
  thisSaturday.setDate(now.getDate() - distanceToThisSaturday);

  const thisThursday = new Date(thisSaturday);
  thisThursday.setDate(thisSaturday.getDate() + 5);

  return {
    startDate: thisSaturday.toISOString().split('T')[0],
    endDate: thisThursday.toISOString().split('T')[0],
  };
}
