import { IRS_TAX_LINE_MAP, getIRSMapping } from './irsMapping.js';
import { MEMBERS } from './calculations.js';
import { getProjectTypeLabel, getSupportPlanTypeLabel } from './calculations.js';
import { parseDate } from './dateUtils.js';

// ── Generic CSV helpers ────────────────────────────────────────────────────────

function cell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function csvRow(...cols) {
  return cols.map(cell).join(',');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ── Individual CSV exports ─────────────────────────────────────────────────────

export function exportProjectsCSV(projects) {
  const headers = ['Client Name', 'Project Type', 'Total Amount', 'Paid Amount', 'Remaining', 'Start Date', 'Payment Schedule', 'Status'];
  const rows = projects.map(p => [
    p.clientName,
    getProjectTypeLabel(p.projectType),
    p.totalAmount.toFixed(2),
    p.paidAmount.toFixed(2),
    (p.totalAmount - p.paidAmount).toFixed(2),
    p.startDate,
    p.paymentSchedule,
    p.status,
  ]);
  const content = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  downloadCSV(content, `daedabyte-projects-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportExpensesCSV(expenses) {
  const headers = ['Date', 'Description', 'Vendor', 'Category', 'IRS Line', 'Amount', 'Recurring'];
  const rows = expenses.map(e => {
    const mapping = getIRSMapping(e.category);
    return [
      e.date,
      e.description,
      e.vendor || '',
      e.category,
      `${mapping.line} — ${mapping.label}`,
      e.amount.toFixed(2),
      e.recurring,
    ];
  });
  const content = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  downloadCSV(content, `daedabyte-expenses-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportPaymentsCSV(payments) {
  const headers = ['Date', 'Client Name', 'Amount', 'Type', 'Project/Plan ID'];
  const rows = payments.map(p => [
    p.date,
    p.clientName,
    p.amount.toFixed(2),
    p.type || 'project',
    p.projectId || p.supportPlanId || '',
  ]);
  const content = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  downloadCSV(content, `daedabyte-payments-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportSupportPlansCSV(supportPlans) {
  const headers = ['Client Name', 'Plan Type', 'Monthly Amount', 'Billing Day', 'Start Date', 'End Date', 'Status', 'Services'];
  const rows = supportPlans.map(s => [
    s.clientName,
    getSupportPlanTypeLabel(s.planType),
    s.monthlyAmount.toFixed(2),
    s.billingDay,
    s.startDate,
    s.endDate || '',
    s.status,
    s.services,
  ]);
  const content = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
  downloadCSV(content, `daedabyte-support-plans-${new Date().toISOString().split('T')[0]}.csv`);
}

// ── Full JSON backup ───────────────────────────────────────────────────────────

export function exportAllDataJSON(data) {
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    ...data,
  };
  downloadJSON(exportData, `daedabyte-financials-${new Date().toISOString().split('T')[0]}.json`);
}

// ── Tax Export (Form 1065 / Schedule K-1) ─────────────────────────────────────

export function exportTaxCSV({ year, payments, expenses, taxPayments, sections }) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59, 999);

  const yearPayments    = payments.filter(p  => { const d = parseDate(p.date);  return d >= yearStart && d <= yearEnd; });
  const yearExpenses    = expenses.filter(e  => { const d = parseDate(e.date);  return d >= yearStart && d <= yearEnd; });
  const yearTaxPayments = taxPayments.filter(t => { const d = parseDate(t.date); return d >= yearStart && d <= yearEnd; });

  // Revenue
  const projectRevenue = yearPayments.filter(p => p.type === 'project' || !p.type).reduce((s, p) => s + p.amount, 0);
  const supportRevenue = yearPayments.filter(p => p.type === 'support').reduce((s, p) => s + p.amount, 0);
  const grossReceipts  = projectRevenue + supportRevenue;

  // Expenses grouped by IRS line
  const expenseByLine = {};
  yearExpenses.forEach(e => {
    const mapping = getIRSMapping(e.category);
    const key = mapping.line;
    if (!expenseByLine[key]) expenseByLine[key] = { line: mapping.line, label: mapping.label, total: 0, deductible: 0 };
    expenseByLine[key].total      += e.amount;
    expenseByLine[key].deductible += e.amount * mapping.deductible;
  });

  const totalDeductible = Object.values(expenseByLine).reduce((s, g) => s + g.deductible, 0);
  const netIncome       = grossReceipts - totalDeductible;

  const csvSections = [];

  // Section A — Income
  if (sections.income) {
    csvSections.push([
      csvRow('SECTION', `Form 1065 — Income`, `Tax Year ${year}`, '', ''),
      csvRow('Form Line', 'Description', 'Amount', 'Notes', ''),
      csvRow('Line 1a', 'Gross receipts from services', grossReceipts.toFixed(2), 'Project revenue + support plan payments', ''),
      csvRow('Line 1b', 'Returns and allowances', '0.00', '', ''),
      csvRow('Line 1c', 'Gross profit (Line 1a minus 1b)', grossReceipts.toFixed(2), '', ''),
      csvRow('Line 7',  'Total income', grossReceipts.toFixed(2), '', ''),
      csvRow('', '', '', '', ''),
      csvRow('', '— Project Revenue', projectRevenue.toFixed(2), '', ''),
      csvRow('', '— Support Plan Revenue', supportRevenue.toFixed(2), '', ''),
    ]);
  }

  // Section B — Deductions
  if (sections.expenses) {
    const lineOrder = ['Line 9','Line 10','Line 11','Line 12','Line 13','Line 14','Line 15','Line 16','Line 17','Line 18','Line 19','Line 20','Line 20a','Line 21','Line 22'];
    const expRows = [
      csvRow('SECTION', 'Form 1065 — Deductions', `Tax Year ${year}`, '', ''),
      csvRow('Form Line', 'IRS Category', 'Total Paid', 'Deductible Amount', 'Notes'),
    ];

    const emitted = new Set();
    lineOrder.forEach(k => {
      if (expenseByLine[k]) {
        const g = expenseByLine[k];
        const note = g.deductible < g.total ? '50% meals limitation applied' : '';
        expRows.push(csvRow(g.line, g.label, g.total.toFixed(2), g.deductible.toFixed(2), note));
        emitted.add(k);
      }
    });
    Object.keys(expenseByLine).filter(k => !emitted.has(k)).forEach(k => {
      const g = expenseByLine[k];
      expRows.push(csvRow(g.line, g.label, g.total.toFixed(2), g.deductible.toFixed(2), ''));
    });

    expRows.push(csvRow('Line 22', 'Total deductions', totalDeductible.toFixed(2), totalDeductible.toFixed(2), ''));
    expRows.push(csvRow('', '', '', '', ''));
    expRows.push(csvRow('Ordinary Business Income', '(Line 1c minus Line 22)', netIncome.toFixed(2), '', ''));
    expRows.push(csvRow('', '', '', '', ''));
    expRows.push(csvRow('DETAIL', 'Individual Expense Transactions', '', '', ''));
    expRows.push(csvRow('Date', 'Description', 'Vendor', 'Category', 'IRS Line', 'Amount', 'Deductible Amount'));

    [...yearExpenses].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
      const m = getIRSMapping(e.category);
      expRows.push(csvRow(e.date, e.description, e.vendor || '', e.category, `${m.line} — ${m.label}`, e.amount.toFixed(2), (e.amount * m.deductible).toFixed(2)));
    });

    csvSections.push(expRows);
  }

  // Section C — Schedule K-1
  if (sections.k1) {
    const k1Rows = [
      csvRow('SECTION', 'Schedule K-1 — Partner Shares', `Tax Year ${year}`, '', '', ''),
      csvRow('Partner Name', 'Ownership %', 'Box 1 — Ordinary Business Income', 'Box 14 — Self-Employment Earnings', 'Notes', ''),
    ];
    MEMBERS.forEach(m => {
      const box1 = (netIncome * m.share).toFixed(2);
      k1Rows.push(csvRow(m.name, `${(m.share * 100).toFixed(0)}%`, box1, box1, 'SE tax applies per partner individually', ''));
    });
    k1Rows.push(csvRow('', '', '', '', '', ''));
    k1Rows.push(csvRow('TOTAL', '100%', netIncome.toFixed(2), netIncome.toFixed(2), '', ''));
    csvSections.push(k1Rows);
  }

  // Section D — Quarterly Tax Payments
  if (sections.payments) {
    const dueDates = { Q1: 'April 15', Q2: 'June 15', Q3: 'September 15', Q4: 'January 15 (following year)' };
    const payRows = [
      csvRow('SECTION', 'Estimated Tax Payments', `Tax Year ${year}`, '', ''),
      csvRow('Quarter', 'Due Date', 'Payment Date', 'Amount Paid', 'Notes'),
    ];
    ['Q1','Q2','Q3','Q4'].forEach(q => {
      const qp = yearTaxPayments.filter(t => t.quarter === q);
      if (!qp.length) {
        payRows.push(csvRow(q, dueDates[q], 'Not recorded', '0.00', ''));
      } else {
        qp.forEach(t => payRows.push(csvRow(q, dueDates[q], t.date, t.amount.toFixed(2), '')));
      }
    });
    const total = yearTaxPayments.reduce((s, t) => s + t.amount, 0);
    payRows.push(csvRow('', '', 'TOTAL PAID', total.toFixed(2), ''));
    csvSections.push(payRows);
  }

  const lines = [];
  csvSections.forEach((sec, i) => {
    sec.forEach(r => lines.push(r));
    if (i < csvSections.length - 1) { lines.push(''); lines.push(''); }
  });

  downloadCSV(lines.join('\n'), `daedabyte-form1065-${year}.csv`);
  return { expenses: yearExpenses.length, payments: yearPayments.length };
}
