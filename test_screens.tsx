import React from 'react';
import { renderToString } from 'react-dom/server';

// Import all screens
import OperationsDashboard from './src/components/OperationsDashboard';
import EmployeesManagement from './src/components/EmployeesManagement';
import AttendanceLogs from './src/components/AttendanceLogs';
import IncentivesPenalties from './src/components/IncentivesPenalties';
import PayrollLedger from './src/components/PayrollLedger';
import RegularityBonusHub from './src/components/RegularityBonusHub';
import CustomersSupply from './src/components/CustomersSupply';
import PartnershipManagement from './src/components/PartnershipManagement';
import ExpensesManagement from './src/components/ExpensesManagement';
import CharityManagement from './src/components/CharityManagement';
import AssistantsManagement from './src/components/AssistantsManagement';
import QuickAttendanceTerminal from './src/components/QuickAttendanceTerminal';
import LoginPage from './src/components/LoginPage';
import Sidebar from './src/components/Sidebar';
import Header from './src/components/Header';

console.log('🚀 Starting Comprehensive Zero-Data Screen Render Test...\n');

let passed = 0;
let failed = 0;

function testScreen(name: string, renderFn: () => React.ReactElement) {
  try {
    const html = renderToString(renderFn());
    if (html && html.length > 0) {
      console.log(`✅ [PASS] Screen "${name}" rendered cleanly (${html.length} bytes HTML output)`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Screen "${name}" returned empty string`);
      failed++;
    }
  } catch (err: any) {
    console.error(`❌ [ERROR] Screen "${name}" crashed on render:`, err.message);
    if (err.stack) console.error(err.stack);
    failed++;
  }
}

// 1. OperationsDashboard
testScreen('OperationsDashboard (لوحة التحكم)', () => (
  <OperationsDashboard
    workers={[]}
    attendanceLogs={[]}
    incentivePenalties={[]}
    onNavigate={() => {}}
  />
));

// 2. EmployeesManagement
testScreen('EmployeesManagement (إدارة العمال والكوادر)', () => (
  <EmployeesManagement
    workers={[]}
    setWorkers={() => {}}
  />
));

// 3. AttendanceLogs
testScreen('AttendanceLogs (سجلات الحضور بالدقيقة)', () => (
  <AttendanceLogs
    workers={[]}
    attendanceLogs={[]}
    setAttendanceLogs={() => {}}
    onNavigate={() => {}}
  />
));

// 4. IncentivesPenalties
testScreen('IncentivesPenalties (الحوافز والجزاءات)', () => (
  <IncentivesPenalties
    workers={[]}
    incentivePenalties={[]}
    setIncentivePenalties={() => {}}
  />
));

// 5. PayrollLedger
testScreen('PayrollLedger (مسير الرواتب الشهرية)', () => (
  <PayrollLedger
    workers={[]}
    attendanceLogs={[]}
    incentivePenalties={[]}
    expenses={[]}
  />
));

// 6. RegularityBonusHub
testScreen('RegularityBonusHub (بونص الانتظام الأسبوعي والشهري)', () => (
  <RegularityBonusHub
    workers={[]}
    attendanceLogs={[]}
    incentivePenalties={[]}
    expenses={[]}
  />
));

// 7. CustomersSupply
testScreen('CustomersSupply (العملاء والتوريدات)', () => (
  <CustomersSupply
    customers={[]}
    setCustomers={() => {}}
    invoices={[]}
    setInvoices={() => {}}
    payments={[]}
    setPayments={() => {}}
    loans={[]}
    setLoans={() => {}}
    expenses={[]}
  />
));

// 8. PartnershipManagement
testScreen('PartnershipManagement (حسابات الشركاء والملكية)', () => (
  <PartnershipManagement
    partners={[]}
    setPartners={() => {}}
    payouts={[]}
    setPayouts={() => {}}
  />
));

// 9. ExpensesManagement
testScreen('ExpensesManagement (إدارة المصروفات والخزينة)', () => (
  <ExpensesManagement
    expenses={[]}
    setExpenses={() => {}}
  />
));

// 10. CharityManagement
testScreen('CharityManagement (الصدقات وأعمال الخير)', () => (
  <CharityManagement
    charities={[]}
    setCharities={() => {}}
  />
));

// 11. AssistantsManagement
testScreen('AssistantsManagement (إدارة المشرفين والورديات)', () => (
  <AssistantsManagement
    assistants={[]}
  />
));

// 12. QuickAttendanceTerminal
testScreen('QuickAttendanceTerminal (بوابة البصمة السريعة)', () => (
  <QuickAttendanceTerminal
    workers={[]}
    attendanceLogs={[]}
  />
));

// 13. LoginPage
testScreen('LoginPage (شاشة تسجيل الدخول)', () => (
  <LoginPage
    onLoginSuccess={() => {}}
  />
));

// 14. Sidebar
testScreen('Sidebar (القائمة الجانبية)', () => (
  <Sidebar
    currentScreen="dashboard"
    onNavigate={() => {}}
    currentUser={{ id: '1', name: 'المدير', roleTitle: 'مدير', username: 'admin', type: 'owner' }}
    onLogout={() => {}}
  />
));

// 15. Header
testScreen('Header (الرأس العلوي)', () => (
  <Header
    currentUser={{ id: '1', name: 'المدير', roleTitle: 'مدير', username: 'admin', type: 'owner' }}
    onLogout={() => {}}
  />
));

console.log(`\n========================================`);
console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All screens rendered with 100% success on clean zero data!');
  process.exit(0);
}
