import React, { useState } from 'react';
import { Customer, Invoice, PaymentVoucher, CustomerLoan, InvoiceItem, InvoiceVersion, Expense } from '../types';
import { initialInvoices, initialPaymentVouchers } from '../data';
import InvoiceVersionHistoryModal from './InvoiceVersionHistoryModal';
import DeliveredItemsInspectionModal from './DeliveredItemsInspectionModal';

interface CustomersSupplyProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  invoices?: Invoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<Invoice[]>>;
  payments?: PaymentVoucher[];
  setPayments?: React.Dispatch<React.SetStateAction<PaymentVoucher[]>>;
  loans?: CustomerLoan[];
  setLoans?: React.Dispatch<React.SetStateAction<CustomerLoan[]>>;
  expenses?: Expense[];
  setExpenses?: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function CustomersSupply({
  customers,
  setCustomers,
  invoices: propInvoices,
  setInvoices: propSetInvoices,
  payments: propPayments,
  setPayments: propSetPayments,
  loans: propLoans,
  setLoans: propSetLoans,
  expenses: propExpenses,
  setExpenses: propSetExpenses,
}: CustomersSupplyProps) {
  // Navigation & Active Customer State
  const [activeCustomerFileId, setActiveCustomerFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'treasury' | 'loans' | 'statement'>('invoices');

  // Search & Filter in Main Directory
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'due' | 'paid-full' | 'loans'>('all');

  // Invoices & Payments State (synced with PostgreSQL Supabase database)
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([]);
  const invoices = propInvoices ?? localInvoices;
  const setInvoices = propSetInvoices ?? setLocalInvoices;

  const [localPayments, setLocalPayments] = useState<PaymentVoucher[]>([]);
  const payments = propPayments ?? localPayments;
  const setPayments = propSetPayments ?? setLocalPayments;
  
  // Unified Treasury Balance (from central expenses ledger or payments)
  const treasuryBalance = propExpenses
    ? propExpenses.filter((e) => e.type === 'in').reduce((s, e) => s + e.amount, 0) -
      propExpenses.filter((e) => e.type === 'out').reduce((s, e) => s + e.amount, 0)
    : payments.reduce((s, p) => s + p.amount, 0);

  // Loans State (تسليف واستلاف) - persisted via database sync
  const [localLoans, setLocalLoans] = useState<CustomerLoan[]>([]);
  const loans = propLoans ?? localLoans;
  const setLoans = propSetLoans ?? setLocalLoans;

  // Modals Visibility State
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState<boolean>(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState<boolean>(false);
  const [historyModalInvoice, setHistoryModalInvoice] = useState<Invoice | null>(null);
  const [showDeliveryInspectionModal, setShowDeliveryInspectionModal] = useState<boolean>(false);

  // Filter in Customer Invoices Tab
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid' | 'outgoing' | 'incoming'>('all');

  // Form Fields - New Customer
  const [newCustName, setNewCustName] = useState<string>('');
  const [newContactPerson, setNewContactPerson] = useState<string>('');
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCommReg, setNewCommReg] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newCreditLimit, setNewCreditLimit] = useState<number>(250000);

  // Form Fields - Invoice Builder
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invType, setInvType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [invDescription, setInvDescription] = useState<string>('');
  const [invDate, setInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invEditReason, setInvEditReason] = useState<string>('');
  const [invPaymentReceived, setInvPaymentReceived] = useState<boolean>(false);
  const [invPaymentAmount, setInvPaymentAmount] = useState<number>(0);
  const [invItems, setInvItems] = useState<InvoiceItem[]>([
    { code: 'PRD-X1', type: '', quantity: 10, unitPrice: 150, total: 1500, delivered: 0 }
  ]);

  // Form Fields - Treasury Deposit
  const [depositAmount, setDepositAmount] = useState<number>(15000);
  const [depositInvoiceId, setDepositInvoiceId] = useState<string>('');
  const [depositAllocation, setDepositAllocation] = useState<'invoice_direct' | 'current_account' | 'loan_settlement' | 'offset_other'>('invoice_direct');

  // Form Fields - Loan
  const [loanType, setLoanType] = useState<'lend' | 'borrow'>('lend');
  const [loanAmount, setLoanAmount] = useState<number>(10000);
  const [loanNotes, setLoanNotes] = useState<string>('');

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  // Add Customer Submit
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCommReg.trim()) {
      alert("الرجاء إدخال اسم العميل والسجل التجاري.");
      return;
    }

    const newCustId = `CUST-${Math.floor(200 + Math.random() * 800)}`;
    const newCustomer: Customer = {
      id: newCustId,
      name: newCustName.trim(),
      companyName: newCompName.trim() || '',
      contactPerson: newContactPerson.trim() || 'المسؤول المباشر',
      phone: newPhone.trim() || 'غير مسجل',
      category: 'شركات متعاقدة',
      commercialReg: newCommReg.trim(),
      ordersCount: 0,
      totalDeal: 0,
      paidAmount: 0,
      dueAmount: 0,
      creditLimit: newCreditLimit,
      paymentTerms: 'أجل 30 يوم',
      status: 'active-regular',
      loansBalance: 0
    };

    setCustomers([newCustomer, ...customers]);
    setIsAddCustomerModalOpen(false);
    setActiveCustomerFileId(newCustId);

    // Reset Form
    setNewCustName('');
    setNewContactPerson('');
    setNewCompName('');
    setNewCommReg('');
    setNewPhone('');
  };

  // Invoice Items Line Handlers
  const addInvoiceItemRow = () => {
    const codeNum = Math.floor(100 + Math.random() * 900);
    setInvItems([
      ...invItems,
      { code: `PRD-${codeNum}`, type: '', quantity: 10, unitPrice: 100, total: 1000, delivered: 0 }
    ]);
  };

  const removeInvoiceItemRow = (index: number) => {
    if (invItems.length <= 1) return;
    setInvItems(invItems.filter((_, i) => i !== index));
  };

  const updateInvoiceItemField = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvItems(
      invItems.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: value };
          if (field === 'delivered' && updated.delivered > updated.quantity) {
            updated.delivered = updated.quantity;
          }
          if (field === 'quantity' && updated.delivered > value) {
            updated.delivered = value;
          }
          updated.total = updated.quantity * updated.unitPrice;
          return updated;
        }
        return item;
      })
    );
  };

  // Open Invoice Builder for NEW
  const handleOpenNewInvoice = () => {
    setEditingInvoiceId(null);
    setInvType('outgoing');
    setInvDescription('');
    setInvDate(new Date().toISOString().split('T')[0]);
    setInvEditReason('');
    setInvPaymentReceived(false);
    setInvPaymentAmount(0);
    setInvItems([
      { code: 'PRD-X1', type: '', quantity: 10, unitPrice: 150, total: 1500, delivered: 0 }
    ]);
    setIsInvoiceModalOpen(true);
  };

  // Open Invoice Builder for EDIT
  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvType(inv.type);
    setInvDescription(inv.description);
    setInvDate(inv.date);
    setInvEditReason('');
    setInvPaymentReceived(inv.paid > 0);
    setInvPaymentAmount(inv.paid);
    setInvItems(inv.items.map(item => ({ ...item })));
    setIsInvoiceModalOpen(true);
  };

  // Save Invoice (New or Edit)
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invDescription.trim()) {
      alert("الرجاء كتابة بيان ووصف الفاتورة.");
      return;
    }

    if (!activeCustomerFileId) return;
    const currentCust = customers.find(c => c.id === activeCustomerFileId);
    if (!currentCust) return;

    const finalizedItems: InvoiceItem[] = invItems.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));

    const grandTotal = finalizedItems.reduce((sum, item) => sum + item.total, 0);
    const finalPaid = invPaymentReceived ? Math.min(grandTotal, invPaymentAmount) : 0;
    const finalStatus: 'paid' | 'partial' | 'unpaid' =
      finalPaid >= grandTotal ? 'paid' : finalPaid > 0 ? 'partial' : 'unpaid';

    if (editingInvoiceId) {
      // Edit with version history snapshot
      const existingInv = invoices.find(i => i.id === editingInvoiceId);
      if (!existingInv) return;

      const previousVersionNumber = (existingInv.history?.length || 0) + 1;
      const historySnapshot: InvoiceVersion = {
        versionNumber: previousVersionNumber,
        editedAt: existingInv.date,
        editedTime: existingInv.time || "12:00 م",
        editReason: invEditReason.trim() || `تعديل البنود والمبالغ (النسخة رقم ${previousVersionNumber})`,
        description: existingInv.description,
        amount: existingInv.amount,
        paid: existingInv.paid,
        status: existingInv.status,
        type: existingInv.type,
        items: existingInv.items.map(i => ({ ...i }))
      };

      const amountDiff = invType === 'outgoing' ? (grandTotal - existingInv.amount) : 0;
      const paidDiff = finalPaid - existingInv.paid;

      const updatedInvoice: Invoice = {
        ...existingInv,
        date: invDate,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
        description: invDescription,
        type: invType,
        amount: grandTotal,
        paid: finalPaid,
        status: finalStatus,
        items: finalizedItems,
        history: [historySnapshot, ...(existingInv.history || [])]
      };

      setInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? updatedInvoice : inv));

      if (paidDiff > 0) {
        const voucherId = `RCV-${Math.floor(1000 + Math.random() * 9000)}`;
        const newVoucher: PaymentVoucher = {
          id: voucherId,
          customerId: activeCustomerFileId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
          amount: paidDiff,
          method: "تحصيل نقدي عند تعديل الفاتورة",
          invoiceId: editingInvoiceId
        };
        setPayments([newVoucher, ...payments]);

        if (propSetExpenses) {
          propSetExpenses(prev => [{
            id: `REV-${Date.now().toString().slice(-4)}`,
            title: `تحصيل نقدي عند تعديل الفاتورة: ${currentCust.companyName}`,
            amount: paidDiff,
            type: 'in',
            category: 'إيراد مبيعات نقدية',
            date: new Date().toISOString().split('T')[0],
            paymentMethod: 'cash',
            receiptRef: voucherId,
            party: currentCust.companyName,
            recordedBy: 'أمين الخزينة',
            notes: `سداد إضافي للفاتورة ${editingInvoiceId}`,
          }, ...prev]);
        }
      }

      setCustomers(prev => prev.map(c => {
        if (c.id === activeCustomerFileId) {
          const newTotalDeal = Math.max(0, c.totalDeal + amountDiff);
          const newPaidAmount = c.paidAmount + paidDiff;
          const newDue = Math.max(0, newTotalDeal - newPaidAmount);
          return {
            ...c,
            totalDeal: newTotalDeal,
            paidAmount: newPaidAmount,
            dueAmount: newDue,
            status: newDue > c.creditLimit ? 'overdue' : 'active-regular'
          };
        }
        return c;
      }));
    } else {
      // Create new invoice
      const newInvoiceId = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newInvoice: Invoice = {
        id: newInvoiceId,
        customerId: activeCustomerFileId,
        date: invDate,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
        description: invDescription,
        amount: grandTotal,
        paid: finalPaid,
        status: finalStatus,
        type: invType,
        companyName: currentCust.companyName || currentCust.name,
        customerName: currentCust.name,
        items: finalizedItems,
        history: []
      };

      setInvoices([newInvoice, ...invoices]);

      if (finalPaid > 0) {
        const voucherId = `RCV-${Math.floor(1000 + Math.random() * 9000)}`;
        const newVoucher: PaymentVoucher = {
          id: voucherId,
          customerId: activeCustomerFileId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }),
          amount: finalPaid,
          method: "تحصيل نقدي عند إصدار الفاتورة",
          invoiceId: newInvoiceId
        };
        setPayments([newVoucher, ...payments]);

        if (propSetExpenses) {
          propSetExpenses(prev => [{
            id: `REV-${Date.now().toString().slice(-4)}`,
            title: `تحصيل نقدي عند إصدار الفاتورة: ${currentCust.companyName}`,
            amount: finalPaid,
            type: 'in',
            category: 'إيراد مبيعات نقدية',
            date: invDate,
            paymentMethod: 'cash',
            receiptRef: voucherId,
            party: currentCust.companyName,
            recordedBy: 'أمين الخزينة',
            notes: `سداد فوري عند إصدار الفاتورة ${newInvoiceId}`,
          }, ...prev]);
        }
      }

      setCustomers(prev => prev.map(c => {
        if (c.id === activeCustomerFileId) {
          const addedDeal = invType === 'outgoing' ? grandTotal : 0;
          const paidAdjustment = finalPaid;
          const newTotalDeal = c.totalDeal + addedDeal;
          const newPaidAmount = c.paidAmount + paidAdjustment;
          const newDue = Math.max(0, newTotalDeal - newPaidAmount);
          return {
            ...c,
            ordersCount: c.ordersCount + 1,
            totalDeal: newTotalDeal,
            paidAmount: newPaidAmount,
            dueAmount: newDue,
            status: newDue > c.creditLimit ? 'overdue' : 'active-regular'
          };
        }
        return c;
      }));
    }

    setIsInvoiceModalOpen(false);
    setEditingInvoiceId(null);
  };

  // Submit Treasury Deposit
  const handleDepositToTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositAmount <= 0) {
      alert("الرجاء إدخال مبلغ صحيح للتحصيل.");
      return;
    }

    if (!activeCustomerFileId) return;
    const currentCust = customers.find(c => c.id === activeCustomerFileId);
    if (!currentCust) return;

    const voucherId = `RCV-${Math.floor(1000 + Math.random() * 9000)}`;
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateNow = new Date().toISOString().split('T')[0];

    let methodDescription = "تحصيل نقدي بالخزينة";
    if (depositAllocation === 'invoice_direct' && depositInvoiceId) {
      methodDescription = `سداد مباشر للفاتورة ${depositInvoiceId}`;
    } else if (depositAllocation === 'current_account') {
      methodDescription = "إيداع رصيد حساب جاري عام";
    } else if (depositAllocation === 'loan_settlement') {
      methodDescription = "تسوية وسداد سلفة مستحقة";
    } else if (depositAllocation === 'offset_other') {
      methodDescription = "خصم ومقاصة فاتورة";
    }

    const newVoucher: PaymentVoucher = {
      id: voucherId,
      customerId: activeCustomerFileId,
      date: dateNow,
      time: timeNow,
      amount: depositAmount,
      method: methodDescription,
      invoiceId: depositInvoiceId || undefined
    };

    setPayments([newVoucher, ...payments]);

    // Record cash inflow in company treasury expenses ledger
    if (propSetExpenses) {
      const newIncomeExpense: Expense = {
        id: `REV-${Date.now().toString().slice(-4)}`,
        title: `تحصيل نقدي: ${currentCust.companyName}`,
        amount: depositAmount,
        type: 'in',
        category: 'إيراد مبيعات نقدية',
        date: dateNow,
        paymentMethod: 'cash',
        receiptRef: voucherId,
        party: currentCust.companyName,
        recordedBy: 'أمين الخزينة',
        notes: `سند قبض رقم ${voucherId} - ${methodDescription}`,
      };
      propSetExpenses((prev) => [newIncomeExpense, ...prev]);
    }

    if (depositAllocation === 'loan_settlement') {
      setCustomers(prev => prev.map(c => {
        if (c.id === activeCustomerFileId) {
          const currentLoan = c.loansBalance || 0;
          return {
            ...c,
            loansBalance: Math.max(0, currentLoan - depositAmount)
          };
        }
        return c;
      }));
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === activeCustomerFileId) {
          const updatedPaid = c.paidAmount + depositAmount;
          const updatedDue = Math.max(0, c.totalDeal - updatedPaid);
          return {
            ...c,
            paidAmount: updatedPaid,
            dueAmount: updatedDue,
            status: updatedDue <= 0 ? 'paid-full' : updatedDue > c.creditLimit ? 'overdue' : 'active-regular'
          };
        }
        return c;
      }));
    }

    if (depositInvoiceId && depositAllocation === 'invoice_direct') {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === depositInvoiceId) {
          const updatedPaid = inv.paid + depositAmount;
          return {
            ...inv,
            paid: updatedPaid,
            status: updatedPaid >= inv.amount ? 'paid' : 'partial'
          };
        }
        return inv;
      }));
    }

    setIsDepositModalOpen(false);
  };

  // Add Loan
  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (loanAmount <= 0) {
      alert("الرجاء إدخال مبلغ سلفة صحيح.");
      return;
    }

    if (!activeCustomerFileId) return;
    const currentCust = customers.find(c => c.id === activeCustomerFileId);
    if (!currentCust) return;

    const newLoanId = `LOAN-${Math.floor(2000 + Math.random() * 8000)}`;
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateNow = new Date().toISOString().split('T')[0];

    const newLoan: CustomerLoan = {
      id: newLoanId,
      customerId: activeCustomerFileId,
      date: dateNow,
      time: timeNow,
      type: loanType,
      amount: loanAmount,
      notes: loanNotes.trim() || (loanType === 'lend' ? "تسليف نقدي للعميل" : "استلاف كاش مؤقت من العميل")
    };

    setLoans([newLoan, ...loans]);

    // Record cash outflow/inflow in central company treasury expenses ledger
    if (propSetExpenses) {
      const isLend = loanType === 'lend';
      const newLoanExpense: Expense = {
        id: `EXP-LOAN-${Date.now().toString().slice(-4)}`,
        title: isLend ? `صرف سلفة عميل: ${currentCust.companyName}` : `استلاف نقدي من عميل: ${currentCust.companyName}`,
        amount: loanAmount,
        type: isLend ? 'out' : 'in',
        category: isLend ? 'نثريات وضيافة وإعاشة' : 'إيراد مبيعات نقدية',
        date: dateNow,
        paymentMethod: 'cash',
        receiptRef: newLoanId,
        party: currentCust.companyName,
        recordedBy: 'أمين الخزينة',
        notes: newLoan.notes,
      };
      propSetExpenses((prev) => [newLoanExpense, ...prev]);
    }

    setCustomers(prev => prev.map(c => {
      if (c.id === activeCustomerFileId) {
        const change = loanType === 'lend' ? loanAmount : -loanAmount;
        const currentLoanBalance = c.loansBalance || 0;
        return {
          ...c,
          loansBalance: currentLoanBalance + change
        };
      }
      return c;
    }));

    setIsLoanModalOpen(false);
    setLoanNotes('');
  };

  // -------------------------------------------------------------
  // COMPUTATIONS
  // -------------------------------------------------------------
  const totalReceivables = customers.reduce((sum, c) => sum + c.dueAmount, 0);
  const totalCollections = customers.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalCustomerLoans = customers.reduce((sum, c) => sum + (c.loansBalance || 0), 0);

  // Active Customer Computed Data
  const selectedCust = customers.find(c => c.id === activeCustomerFileId);
  const custInvoices = activeCustomerFileId ? invoices.filter(inv => inv.customerId === activeCustomerFileId) : [];
  const custPayments = activeCustomerFileId ? payments.filter(pay => pay.customerId === activeCustomerFileId) : [];
  const custLoans = activeCustomerFileId ? loans.filter(l => l.customerId === activeCustomerFileId) : [];

  // Filtered invoices for customer
  const filteredCustInvoices = custInvoices.filter(inv => {
    if (invoiceFilter === 'unpaid') return inv.paid === 0;
    if (invoiceFilter === 'partial') return inv.status === 'partial';
    if (invoiceFilter === 'paid') return inv.status === 'paid';
    if (invoiceFilter === 'outgoing') return inv.type === 'outgoing';
    if (invoiceFilter === 'incoming') return inv.type === 'incoming';
    return true;
  });

  // Calculate: "ليّا" (Owed to us)
  const outgoingUnpaid = custInvoices
    .filter(i => i.type === 'outgoing')
    .reduce((sum, i) => sum + Math.max(0, i.amount - i.paid), 0);
  const lendLoansTotal = (selectedCust?.loansBalance && selectedCust.loansBalance > 0) ? selectedCust.loansBalance : 0;
  const leyaTotal = outgoingUnpaid + lendLoansTotal;

  // Calculate: "عليّا" (Owed by us)
  const incomingUnpaid = custInvoices
    .filter(i => i.type === 'incoming')
    .reduce((sum, i) => sum + Math.max(0, i.amount - i.paid), 0);
  const borrowLoansTotal = (selectedCust?.loansBalance && selectedCust.loansBalance < 0) ? Math.abs(selectedCust.loansBalance) : 0;
  const aleyaTotal = incomingUnpaid + borrowLoansTotal;

  // Total cash received
  const istalamtTotal = custPayments.reduce((sum, p) => sum + p.amount, 0);

  // Filtered Customers in Directory View
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.commercialReg.includes(searchQuery) ||
      c.phone.includes(searchQuery);

    let matchesStatus = true;
    if (statusFilter === 'overdue') matchesStatus = c.dueAmount > c.creditLimit;
    if (statusFilter === 'due') matchesStatus = c.dueAmount > 0;
    if (statusFilter === 'paid-full') matchesStatus = c.dueAmount <= 0 && c.totalDeal > 0;
    if (statusFilter === 'loans') matchesStatus = (c.loansBalance || 0) !== 0;

    return matchesSearch && matchesStatus;
  });

  // Chronological Statement Ledger
  const statementLedger = (() => {
    if (!selectedCust) return [];
    
    type LedgerRow = {
      id: string;
      date: string;
      type: 'invoice' | 'payment' | 'loan';
      description: string;
      debit: number; // مدين (لنا عليه)
      credit: number; // دائن (له علينا أو سدده)
      balance: number;
    };

    const rows: Omit<LedgerRow, 'balance'>[] = [];

    // Add Invoices
    custInvoices.forEach(inv => {
      if (inv.type === 'outgoing') {
        rows.push({
          id: inv.id,
          date: inv.date,
          type: 'invoice',
          description: `فاتورة مبيعات صادر (${inv.id}): ${inv.description}`,
          debit: inv.amount,
          credit: 0
        });
      } else {
        rows.push({
          id: inv.id,
          date: inv.date,
          type: 'invoice',
          description: `فاتورة مشتريات وارد (${inv.id}): ${inv.description}`,
          debit: 0,
          credit: inv.amount
        });
      }
    });

    // Add Payments
    custPayments.forEach(pay => {
      rows.push({
        id: pay.id,
        date: pay.date,
        type: 'payment',
        description: `سند تحصيل وقبض (${pay.id}) - ${pay.method}`,
        debit: 0,
        credit: pay.amount
      });
    });

    // Add Loans
    custLoans.forEach(l => {
      if (l.type === 'lend') {
        rows.push({
          id: l.id,
          date: l.date,
          type: 'loan',
          description: `سلفة نقدية منصرفة للعميل (${l.id}) - ${l.notes}`,
          debit: l.amount,
          credit: 0
        });
      } else {
        rows.push({
          id: l.id,
          date: l.date,
          type: 'loan',
          description: `سلفة نقدية مستلمة من العميل (${l.id}) - ${l.notes}`,
          debit: 0,
          credit: l.amount
        });
      }
    });

    // Sort by date ascending
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let currentBal = 0;
    const finalRows: LedgerRow[] = rows.map(r => {
      currentBal += (r.debit - r.credit);
      return {
        ...r,
        balance: currentBal
      };
    });

    return finalRows;
  })();

  return (
    <div id="screen-customers" className="flex flex-col gap-6 pb-12 w-full text-right">
      
      {/* ========================================================================= */}
      {/* 1. MAIN DIRECTORY VIEW (When no specific customer is selected) */}
      {/* ========================================================================= */}
      {!activeCustomerFileId ? (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
          
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm w-full">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-3xl">group</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-[#1E293B] font-readex">
                  دليل العملاء والتوريدات والحسابات
                </h1>
                <p className="text-xs text-[#78716C] font-semibold">
                  متابعة فواتير التوريد، المقبوضات النقدية بالخزينة، السلف التراكمية، وسقوف الائتمان بالجنيه المصري (ج.م)
                </p>
              </div>
            </div>

            {/* Top Action */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(true)}
                className="px-5 py-3 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                إضافة عميل / شركة جديدة
              </button>
            </div>
          </div>

          {/* Directory KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-[#78716C]">إجمالي المديونيات المستحقة لنا</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#DC2626] font-readex">{totalReceivables.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#78716C]">ج.م</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-[#78716C]">إجمالي المبالغ المحصلة</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#0D9488] font-readex">{totalCollections.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#78716C]">ج.م</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-[#78716C]">رصيد السلف النقدية التراكمي</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#1D4ED8] font-readex">{totalCustomerLoans.toLocaleString()}</span>
                <span className="text-xs font-bold text-[#78716C]">ج.م</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#334155] text-white shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-[#94A3B8]">سيولة الخزينة المتاحة</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white font-readex">{treasuryBalance.toLocaleString()}</span>
                <span className="text-xs font-medium text-[#94A3B8]">ج.م</span>
              </div>
            </div>
          </div>

          {/* Customer Directory Table Container */}
          <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-5 w-full">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#F5EFE8] pb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-black text-[#1E293B]">قائمة الحسابات والشركات المتعاقدة</h3>
                <p className="text-xs text-[#78716C] font-semibold">
                  اختر أي عميل لفتح ملفه المالي الكامل، كشف الحساب التراكمي، وإصدار الفواتير
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، الشركة، السجل التجاري..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] focus:border-[#0D9488] outline-none"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-lg text-[#78716C]">search</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                >
                  <option value="all">جميع العملاء</option>
                  <option value="due">عليهم مديونية مستحقة</option>
                  <option value="overdue">متجاوز لسقف الائتمان</option>
                  <option value="paid-full">مسدد بالكامل (رصيد صفر)</option>
                  <option value="loans">لديه سلف مسجلة</option>
                </select>
              </div>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-right border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                    <th className="py-3.5 px-4">العميل / الشركة</th>
                    <th className="py-3.5 px-3">المسؤول وبيانات الاتصال</th>
                    <th className="py-3.5 px-3 text-left">إجمالي التعاملات</th>
                    <th className="py-3.5 px-3 text-left">المسدد والمدفوع</th>
                    <th className="py-3.5 px-3 text-left">المديونية المستحقة</th>
                    <th className="py-3.5 px-3 text-left">رصيد السلف</th>
                    <th className="py-3.5 px-3 text-center">حالة الائتمان</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EFE8]">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm font-bold text-[#78716C]">
                        لا توجد نتائج مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isOverdue = c.dueAmount > c.creditLimit;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]"
                        >
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="font-black text-[#1E293B] text-sm">{c.name}</span>
                              {c.companyName ? (
                                <span className="text-[11px] text-[#0D9488] font-bold">{c.companyName}</span>
                              ) : (
                                <span className="text-[10px] text-[#A8A29E]">حساب فردي</span>
                              )}
                              <span className="text-[10px] text-[#78716C]">س.ت: {c.commercialReg}</span>
                            </div>
                          </td>

                          <td className="py-4 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#1E293B]">{c.contactPerson || 'المسؤول المباشر'}</span>
                              <span className="text-[11px] text-[#78716C] font-mono">{c.phone}</span>
                            </div>
                          </td>

                          <td className="py-4 px-3 text-left font-bold text-[#1E293B] font-readex">
                            {c.totalDeal.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                          </td>

                          <td className="py-4 px-3 text-left font-bold text-[#0D9488] font-readex">
                            {c.paidAmount.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                          </td>

                          <td className="py-4 px-3 text-left font-black text-sm font-readex">
                            {c.dueAmount > 0 ? (
                              <span className="text-[#DC2626]">{c.dueAmount.toLocaleString()} ج.م</span>
                            ) : (
                              <span className="text-[#0D9488]">0 ج.م</span>
                            )}
                          </td>

                          <td className="py-4 px-3 text-left font-bold text-[#1D4ED8] font-readex">
                            {(c.loansBalance || 0) !== 0 ? (
                              <span>{(c.loansBalance || 0).toLocaleString()} ج.م</span>
                            ) : (
                              <span className="text-[#A8A29E] font-normal">—</span>
                            )}
                          </td>

                          <td className="py-4 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isOverdue
                                ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                                : c.dueAmount === 0
                                ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                                : 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]'
                            }`}>
                              {isOverdue ? 'متجاوز الائتمان' : c.dueAmount === 0 ? 'مسدد بالكامل' : 'نشط وائتمان آمن'}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCustomerFileId(c.id);
                                setActiveTab('invoices');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0A7368] text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs mx-auto"
                            >
                              <span className="material-symbols-outlined text-xs">folder_open</span>
                              الملف المالي
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. DEDICATED CUSTOMER FILE & FINANCIAL PROFILE (FULL VIEW) */
        /* ========================================================================= */
        selectedCust && (
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            
            {/* Top Navigation & Profile Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm w-full">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveCustomerFileId(null)}
                  className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#D6CEBF] text-[#57534E] hover:text-[#1E293B] hover:bg-[#F5EFE8] transition-all flex items-center justify-center"
                  title="الرجوع إلى دليل العملاء"
                >
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#1E293B]">{selectedCust.name}</h2>
                    {selectedCust.companyName && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E0F2FE] text-[#0369A1]">
                        {selectedCust.companyName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#78716C] font-semibold mt-1">
                    <span>المسؤول: {selectedCust.contactPerson || 'المسؤول المباشر'}</span>
                    <span>•</span>
                    <span className="font-mono">{selectedCust.phone}</span>
                    <span>•</span>
                    <span>س.ت: {selectedCust.commercialReg}</span>
                    <span>•</span>
                    <span>سقف الائتمان: {selectedCust.creditLimit.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={handleOpenNewInvoice}
                  className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                  إصدار فاتورة جديدة
                </button>

                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-[#1D4ED8] hover:bg-[#1E40AF] transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">payments</span>
                  تحصيل نقد بالخزينة
                </button>

                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8] transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">swap_horiz</span>
                  تسجيل سلفة
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeliveryInspectionModal(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#166534] bg-[#DCFCE7] hover:bg-[#BBF7D0] transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">inventory_2</span>
                  فحص التوريدات
                </button>
              </div>
            </div>

            {/* Financial Highlights Bar (ليّا / عليّا / مسدد / سلف) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-[#DC2626]">ليّا عنده (مستحقات وفواتير صادر)</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#DC2626] font-readex">{leyaTotal.toLocaleString()}</span>
                  <span className="text-xs font-bold text-[#78716C]">ج.م</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-[#0D9488]">عليّا ليه (مشتريات وارد وسلف)</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#0D9488] font-readex">{aleyaTotal.toLocaleString()}</span>
                  <span className="text-xs font-bold text-[#78716C]">ج.م</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-[#166534]">إجمالي المبالغ المسددة والمستلمة</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#166534] font-readex">{istalamtTotal.toLocaleString()}</span>
                  <span className="text-xs font-bold text-[#78716C]">ج.م</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#EBE3D8] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-[#1D4ED8]">رصيد السلف المتبقي</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#1D4ED8] font-readex">{(selectedCust.loansBalance || 0).toLocaleString()}</span>
                  <span className="text-xs font-bold text-[#78716C]">ج.م</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs inside Customer File */}
            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D8] shadow-sm flex flex-col gap-6 w-full">
              <div className="flex items-center gap-2 border-b border-[#F5EFE8] pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === 'invoices'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">receipt</span>
                  فواتير التوريدات والمبيعات ({custInvoices.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('treasury')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === 'treasury'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">payments</span>
                  سندات القبض والخزينة ({custPayments.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('loans')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === 'loans'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">swap_horiz</span>
                  سجل السلف والديون ({custLoans.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('statement')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === 'statement'
                      ? 'bg-[#0D9488] text-white shadow-xs'
                      : 'bg-[#FAF9F5] text-[#57534E] hover:text-[#1E293B]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  كشف الحساب التراكمي الشامل
                </button>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* TAB 1: INVOICES & SUPPLY */}
              {/* ----------------------------------------------------------------- */}
              {activeTab === 'invoices' && (
                <div className="flex flex-col gap-4">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={invoiceFilter}
                        onChange={(e) => setInvoiceFilter(e.target.value as any)}
                        className="p-2.5 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                      >
                        <option value="all">جميع الفواتير</option>
                        <option value="unpaid">غير مدفوعة (مستحقة بالكامل)</option>
                        <option value="partial">مدفوعة جزئياً</option>
                        <option value="paid">مدفوعة بالكامل</option>
                        <option value="outgoing">فواتير مبيعات (صادر)</option>
                        <option value="incoming">فواتير مشتريات (وارد)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenNewInvoice}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      فاتورة جديدة
                    </button>
                  </div>

                  {/* Invoices Table */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse min-w-[850px]">
                      <thead>
                        <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                          <th className="py-3 px-4">كود الفاتورة والبيان</th>
                          <th className="py-3 px-3 text-center">النوع</th>
                          <th className="py-3 px-3 text-left">القيمة الإجمالية</th>
                          <th className="py-3 px-3 text-left">المسدد</th>
                          <th className="py-3 px-3 text-left">المتبقي</th>
                          <th className="py-3 px-3 text-center">التوريد والقطع</th>
                          <th className="py-3 px-3 text-center">حالة السداد</th>
                          <th className="py-3 px-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EFE8]">
                        {filteredCustInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-sm font-bold text-[#78716C]">
                              لا توجد فواتير مسجلة لهذا التصنيف.
                            </td>
                          </tr>
                        ) : (
                          filteredCustInvoices.map((inv) => {
                            const remaining = Math.max(0, inv.amount - inv.paid);
                            const totalQty = inv.items.reduce((s, i) => s + i.quantity, 0);
                            const deliveredQty = inv.items.reduce((s, i) => s + i.delivered, 0);
                            const hasHistory = (inv.history?.length || 0) > 0;

                            return (
                              <tr key={inv.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                                <td className="py-4 px-4">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[#1E293B]">{inv.id}</span>
                                      {hasHistory && (
                                        <button
                                          type="button"
                                          onClick={() => setHistoryModalInvoice(inv)}
                                          className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-0.5"
                                        >
                                          <span className="material-symbols-outlined text-[10px]">history</span>
                                          {inv.history?.length} تعديلات
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-[#57534E] font-semibold mt-0.5">{inv.description}</span>
                                    <span className="text-[10px] text-[#78716C] font-mono">{inv.date}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.type === 'outgoing' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#EFF6FF] text-[#1D4ED8]'
                                  }`}>
                                    {inv.type === 'outgoing' ? 'صادر (مبيعات)' : 'وارد (مشتريات)'}
                                  </span>
                                </td>

                                <td className="py-4 px-3 text-left font-bold text-[#1E293B] font-readex">
                                  {inv.amount.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                                </td>

                                <td className="py-4 px-3 text-left font-bold text-[#0D9488] font-readex">
                                  {inv.paid.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                                </td>

                                <td className="py-4 px-3 text-left font-black text-[#DC2626] font-readex">
                                  {remaining.toLocaleString()} <span className="text-[10px]">ج.م</span>
                                </td>

                                <td className="py-4 px-3 text-center text-xs font-semibold">
                                  <span className={deliveredQty < totalQty ? 'text-[#C2410C] font-bold' : 'text-[#0D9488] font-bold'}>
                                    {deliveredQty} / {totalQty} قطعة
                                  </span>
                                </td>

                                <td className="py-4 px-3 text-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    inv.status === 'paid'
                                      ? 'bg-[#DCFCE7] text-[#166534]'
                                      : inv.status === 'partial'
                                      ? 'bg-[#FEF3C7] text-[#92400E]'
                                      : 'bg-[#FEE2E2] text-[#991B1B]'
                                  }`}>
                                    {inv.status === 'paid' ? 'مدفوعة بالكامل' : inv.status === 'partial' ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
                                  </span>
                                </td>

                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditInvoice(inv)}
                                      className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5EFE8] text-[#57534E] border border-[#D6CEBF]"
                                      title="تعديل الفاتورة وحفظ نسخة جديدة"
                                    >
                                      <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>

                                    {hasHistory && (
                                      <button
                                        type="button"
                                        onClick={() => setHistoryModalInvoice(inv)}
                                        className="p-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8]"
                                        title="مقارنة النسخ السابقة"
                                      >
                                        <span className="material-symbols-outlined text-sm">history</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => window.print()}
                                      className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5EFE8] text-[#1E293B] border border-[#D6CEBF]"
                                      title="طباعة الفاتورة"
                                    >
                                      <span className="material-symbols-outlined text-sm">print</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* TAB 2: TREASURY & CASH PAYMENTS */}
              {/* ----------------------------------------------------------------- */}
              {activeTab === 'treasury' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#78716C] font-semibold">
                      سجل المقبوضات والتحصيلات النقدية المعتمدة لحساب هذا العميل
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDepositModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#1D4ED8] hover:bg-[#1E40AF] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      سند تحصيل وقبض جديد
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                          <th className="py-3 px-4">رقم السند</th>
                          <th className="py-3 px-3">التاريخ والوقت</th>
                          <th className="py-3 px-3">البيان وطريقة السداد</th>
                          <th className="py-3 px-3 text-left">المبلغ المحصّل</th>
                          <th className="py-3 px-4 text-center">طباعة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EFE8]">
                        {custPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm font-bold text-[#78716C]">
                              لم يتم تسجيل أي سندات قبض بعد لهذا العميل.
                            </td>
                          </tr>
                        ) : (
                          custPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                              <td className="py-4 px-4 font-mono font-bold text-[#1E293B]">{p.id}</td>
                              <td className="py-4 px-3 font-mono text-[#78716C]">{p.date} {p.time}</td>
                              <td className="py-4 px-3 font-semibold text-[#57534E]">{p.method}</td>
                              <td className="py-4 px-3 text-left font-black text-[#166534] font-readex text-sm">
                                +{p.amount.toLocaleString()} <span className="text-[10px]">ج.م</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5EFE8] text-[#1E293B] border border-[#D6CEBF]"
                                  title="طباعة إيصال السند"
                                >
                                  <span className="material-symbols-outlined text-sm">print</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* TAB 3: LOANS LEDGER */}
              {/* ----------------------------------------------------------------- */}
              {activeTab === 'loans' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#78716C] font-semibold">
                      سجل السلف النقدية (تسليف العميل أو الاستلاف منه لتأمين سيولة)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLoanModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#0D9488] hover:bg-[#0A7368] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      تسجيل سلفة جديدة
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                          <th className="py-3 px-4">رقم القيد</th>
                          <th className="py-3 px-3">التاريخ</th>
                          <th className="py-3 px-3 text-center">نوع السلفة</th>
                          <th className="py-3 px-3">البيان والملاحظات</th>
                          <th className="py-3 px-3 text-left">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EFE8]">
                        {custLoans.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm font-bold text-[#78716C]">
                              لا توجد سلف مسجلة لحساب هذا العميل.
                            </td>
                          </tr>
                        ) : (
                          custLoans.map((l) => (
                            <tr key={l.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                              <td className="py-4 px-4 font-mono font-bold text-[#1E293B]">{l.id}</td>
                              <td className="py-4 px-3 font-mono text-[#78716C]">{l.date}</td>
                              <td className="py-4 px-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  l.type === 'lend'
                                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                    : 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]'
                                }`}>
                                  {l.type === 'lend' ? 'سلفناه فلوس (لنا عنده)' : 'استلفنا منه (له علينا)'}
                                </span>
                              </td>
                              <td className="py-4 px-3 font-semibold text-[#57534E]">{l.notes}</td>
                              <td className="py-4 px-3 text-left font-black font-readex text-sm">
                                {l.amount.toLocaleString()} <span className="text-[10px] text-[#78716C]">ج.م</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* TAB 4: COMPREHENSIVE STATEMENT OF ACCOUNT (كشف الحساب التراكمي) */}
              {/* ----------------------------------------------------------------- */}
              {activeTab === 'statement' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
                    <div>
                      <h4 className="text-sm font-black text-[#1E293B]">كشف الحساب التفصيلي المالي التراكمي</h4>
                      <p className="text-xs text-[#78716C] font-semibold">
                        سجل زمني شامل لكافة الفواتير، التحصيلات، والسلف مع احتساب الرصيد المتحرك
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#D6CEBF] text-[#1E293B] text-xs font-bold hover:bg-[#F5EFE8] flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">print</span>
                      طباعة كشف الحساب
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse min-w-[750px]">
                      <thead>
                        <tr className="border-b border-[#EBE3D8] text-[#57534E] text-xs font-bold bg-[#FAF9F5]/80">
                          <th className="py-3 px-4">التاريخ</th>
                          <th className="py-3 px-3">البيان والحركة</th>
                          <th className="py-3 px-3 text-left text-[#DC2626]">مدين (لنا عليه)</th>
                          <th className="py-3 px-3 text-left text-[#0D9488]">دائن (مسدد منه)</th>
                          <th className="py-3 px-4 text-left font-black">الرصيد التراكمي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EFE8]">
                        {statementLedger.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm font-bold text-[#78716C]">
                              لا توجد حركات مالية مسجلة بعد لهذا العميل.
                            </td>
                          </tr>
                        ) : (
                          statementLedger.map((row) => (
                            <tr key={row.id} className="hover:bg-[#FAF9F5] transition-colors text-xs text-[#1F2937]">
                              <td className="py-4 px-4 font-mono font-semibold text-[#78716C]">{row.date}</td>
                              <td className="py-4 px-3 font-semibold text-[#1E293B]">{row.description}</td>
                              <td className="py-4 px-3 text-left font-bold text-[#DC2626] font-readex">
                                {row.debit > 0 ? `${row.debit.toLocaleString()} ج.م` : '—'}
                              </td>
                              <td className="py-4 px-3 text-left font-bold text-[#0D9488] font-readex">
                                {row.credit > 0 ? `${row.credit.toLocaleString()} ج.م` : '—'}
                              </td>
                              <td className="py-4 px-4 text-left font-black text-sm font-readex bg-[#FAF9F5]">
                                {row.balance.toLocaleString()} <span className="text-[10px]">ج.م</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW CUSTOMER */}
      {/* ========================================================================= */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-lg w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">إضافة عميل / شركة جديدة</h3>
                  <p className="text-xs text-[#78716C] font-semibold">تسجيل البيانات المعتمدة لفتح ملف مالي وتوريد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">اسم العميل (الأساسي): *</label>
                <input
                  type="text"
                  placeholder="أ. عبد الرحمن السويدي"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">اسم الشخص المسؤول (المتعامل معه):</label>
                  <input
                    type="text"
                    placeholder="م. خالد المصري (مدير المشتريات)"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">اسم الشركة / المصنع:</label>
                  <input
                    type="text"
                    placeholder="شركة الفنار للصناعات الهندسية"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">السجل التجاري: *</label>
                  <input
                    type="text"
                    placeholder="1010892019"
                    value={newCommReg}
                    onChange={(e) => setNewCommReg(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">رقم التواصل / الهاتف: *</label>
                  <input
                    type="text"
                    placeholder="010XXXXXXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">سقف الائتمان المالي (ج.م):</label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(parseInt(e.target.value) || 0)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-sm font-black text-[#1E293B] font-readex outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  حفظ وفتح الملف المالي للعميل
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INVOICE BUILDER (NEW / EDIT WITH MULTI-ITEMS & VERSION SNAPSHOT) */}
      {/* ========================================================================= */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-3xl w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">
                    {editingInvoiceId ? 'edit_document' : 'post_add'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">
                    {editingInvoiceId ? `تعديل الفاتورة (${editingInvoiceId}) مع حفظ نسخة سابقة` : 'إصدار فاتورة جديدة'}
                  </h3>
                  <p className="text-xs text-[#78716C] font-semibold">
                    إدخال بنود التوريد، الأسعار، الكميات، ونسبة التسليم المعتمدة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">نوع الفاتورة:</label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value as any)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="outgoing">صادر (مبيعات للعميل)</option>
                    <option value="incoming">وارد (مشتريات من العميل)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[#1E293B]">تاريخ الفاتورة:</label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">بيان ووصف الفاتورة العام:</label>
                <input
                  type="text"
                  placeholder="مثال: توريد دفعة قطع غيار وهياكل CNC لخط الإنتاج..."
                  value={invDescription}
                  onChange={(e) => setInvDescription(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none focus:border-[#0D9488]"
                  required
                />
              </div>

              {editingInvoiceId && (
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                  <label className="text-xs font-bold text-[#1D4ED8]">سبب وتفاصيل التعديل (سيتم حفظها في المقارنة):</label>
                  <input
                    type="text"
                    placeholder="مثال: تعديل أسعار الوحدة والكمية المسلمة بناءً على محضر الاستلام..."
                    value={invEditReason}
                    onChange={(e) => setInvEditReason(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#93C5FD] bg-white text-xs font-semibold text-[#1E293B] outline-none"
                  />
                </div>
              )}

              {/* Items Line Table */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">بنود وأصناف الفاتورة:</span>
                  <button
                    type="button"
                    onClick={addInvoiceItemRow}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#F5EFE8] text-[#0D9488] border border-[#D6CEBF] text-xs font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    إضافة بند جديد
                  </button>
                </div>

                <div className="overflow-x-auto border border-[#EBE3D8] rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF9F5] border-b border-[#EBE3D8] text-[#57534E]">
                      <tr>
                        <th className="p-2.5">كود الصنف</th>
                        <th className="p-2.5">النوع والبيان</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-left">سعر الوحدة</th>
                        <th className="p-2.5 text-left">الإجمالي</th>
                        <th className="p-2.5 text-center">المسلم فعلياً</th>
                        <th className="p-2.5 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F5EFE8]">
                      {invItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.code}
                              onChange={(e) => updateInvoiceItemField(idx, 'code', e.target.value)}
                              className="w-20 p-1.5 border border-[#D6CEBF] rounded-lg text-xs font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="بيان الصنف..."
                              value={item.type}
                              onChange={(e) => updateInvoiceItemField(idx, 'type', e.target.value)}
                              className="w-full p-1.5 border border-[#D6CEBF] rounded-lg text-xs"
                              required
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItemField(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-16 p-1.5 border border-[#D6CEBF] rounded-lg text-xs text-center font-bold"
                            />
                          </td>
                          <td className="p-2 text-left">
                            <input
                              type="number"
                              min="1"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItemField(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-20 p-1.5 border border-[#D6CEBF] rounded-lg text-xs text-left font-bold"
                            />
                          </td>
                          <td className="p-2 text-left font-black text-[#1E293B]">
                            {(item.quantity * item.unitPrice).toLocaleString()} ج.م
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.delivered}
                              onChange={(e) => updateInvoiceItemField(idx, 'delivered', parseInt(e.target.value) || 0)}
                              className="w-16 p-1.5 border border-[#86EFAC] bg-[#F0FDF4] rounded-lg text-xs text-center font-bold text-[#166534]"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeInvoiceItemRow(idx)}
                              disabled={invItems.length <= 1}
                              className="p-1 rounded text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-30"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#EBE3D8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#78716C]">المجموع الكلي للفاتورة:</span>
                <span className="text-lg font-black text-[#1E293B] font-readex">
                  {invItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()} ج.م
                </span>
              </div>

              {/* Payment at invoice time */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#166534]">
                  <input
                    type="checkbox"
                    checked={invPaymentReceived}
                    onChange={(e) => {
                      setInvPaymentReceived(e.target.checked);
                      if (e.target.checked) {
                        const total = invItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
                        setInvPaymentAmount(total);
                      }
                    }}
                    className="rounded accent-[#166534]"
                  />
                  تم استلام دفعة / سداد نقدي عند تحرير الفاتورة
                </label>

                {invPaymentReceived && (
                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-xs font-bold text-[#166534]">المبلغ المستلم (ج.م):</label>
                    <input
                      type="number"
                      min="1"
                      value={invPaymentAmount}
                      onChange={(e) => setInvPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="p-2 rounded-xl border border-[#86EFAC] bg-white text-xs font-bold text-[#1E293B] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  {editingInvoiceId ? 'حفظ التعديلات وتوثيق النسخة' : 'إصدار الفاتورة وتحديث الحساب'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TREASURY DEPOSIT VOUCHER */}
      {/* ========================================================================= */}
      {isDepositModalOpen && selectedCust && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-md w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">تحصيل نقد وإيداع بالخزينة</h3>
                  <p className="text-xs text-[#78716C] font-semibold">للعميل: {selectedCust.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleDepositToTreasury} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">مبلغ التحصيل (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="p-3 rounded-xl border border-[#86EFAC] bg-[#F0FDF4] text-base font-black text-[#166534] font-readex outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">توجيه التحصيل:</label>
                <select
                  value={depositAllocation}
                  onChange={(e) => setDepositAllocation(e.target.value as any)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                >
                  <option value="invoice_direct">سداد مباشر لفاتورة معينة</option>
                  <option value="current_account">إيداع عام بالحساب الجاري</option>
                  <option value="loan_settlement">تسوية وسداد سلفة مستحقة</option>
                </select>
              </div>

              {depositAllocation === 'invoice_direct' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1E293B]">اختر الفاتورة المستهدفة:</label>
                  <select
                    value={depositInvoiceId}
                    onChange={(e) => setDepositInvoiceId(e.target.value)}
                    className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                  >
                    <option value="">-- حدد الفاتورة --</option>
                    {custInvoices.filter(i => i.status !== 'paid').map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.id} — متبقي {Math.max(0, inv.amount - inv.paid).toLocaleString()} ج.م ({inv.description})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#166534] hover:bg-[#14532D] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">verified</span>
                  إيداع وتوليد السند فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LOAN REGISTRATION */}
      {/* ========================================================================= */}
      {isLoanModalOpen && selectedCust && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EBE3D8] shadow-2xl max-w-md w-full p-6 text-right flex flex-col gap-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F5EFE8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">swap_horiz</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E293B]">تسجيل قيد سلفة</h3>
                  <p className="text-xs text-[#78716C] font-semibold">للعميل: {selectedCust.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(false)}
                className="w-8 h-8 rounded-lg text-[#78716C] hover:bg-[#FAF9F5] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddLoan} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">نوع العملية:</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value as any)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-bold text-[#1E293B] outline-none"
                >
                  <option value="lend">سلفناه فلوس (تسليف نقدي للعميل - لنا عنده)</option>
                  <option value="borrow">استلفنا منه كاش (استلاف مؤقت - له علينا)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">مبلغ السلفة (ج.م):</label>
                <input
                  type="number"
                  min="100"
                  value={loanAmount || ''}
                  onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-base font-black text-[#1E293B] font-readex outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#1E293B]">البيان وملاحظات السلفة:</label>
                <textarea
                  rows={2}
                  placeholder="سبب السلفة، تاريخ الاستحقاق المتفق عليه..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="p-3 rounded-xl border border-[#D6CEBF] bg-[#FAF9F5] text-xs font-semibold text-[#1E293B] outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-[#F5EFE8]">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs text-white bg-[#0D9488] hover:bg-[#0A7368] transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span className="material-symbols-outlined text-base">check</span>
                  تثبيت السلفة في الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="py-3 px-5 rounded-xl text-xs font-bold text-[#57534E] bg-[#FAF9F5] border border-[#D6CEBF] hover:bg-[#F5EFE8]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: VERSION HISTORY COMPARISON */}
      {/* ========================================================================= */}
      {historyModalInvoice && (
        <InvoiceVersionHistoryModal
          invoice={historyModalInvoice}
          onClose={() => setHistoryModalInvoice(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DELIVERED ITEMS INSPECTION */}
      {/* ========================================================================= */}
      {showDeliveryInspectionModal && selectedCust && (
        <DeliveredItemsInspectionModal
          invoices={custInvoices}
          customerName={selectedCust.name}
          onClose={() => setShowDeliveryInspectionModal(false)}
        />
      )}

    </div>
  );
}
